package com.concurso.service;

import com.concurso.web.Dtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tutor virtual: encaminha perguntas ao modelo da DeepSeek com o contexto da questão atual.
 *
 * <p>A chave nunca vai para o repositorio. A ordem de leitura e': variavel de ambiente
 * {@code DEEPSEEK_API_KEY} e, se ausente, o arquivo {@code segredos/deepseek.key} (ignorado pelo
 * git). O aluno cola a chave uma vez na tela de configuracao.</p>
 */
@Service
public class DeepSeekService {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekService.class);
    private static final String ENDPOINT = "https://api.deepseek.com/chat/completions";
    private static final String MODELO = "deepseek-chat";
    private static final Path ARQUIVO_CHAVE = Path.of("segredos", "deepseek.key");

    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(20))
            .build();

    public DeepSeekService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public boolean configurado() {
        return chave() != null;
    }

    public void salvarChave(String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalArgumentException("Chave vazia");
        }
        try {
            Files.createDirectories(ARQUIVO_CHAVE.getParent());
            Files.writeString(ARQUIVO_CHAVE, apiKey.trim(), StandardCharsets.UTF_8);
            log.info("Chave da DeepSeek gravada em {}", ARQUIVO_CHAVE.toAbsolutePath());
        } catch (Exception e) {
            throw new IllegalStateException("Nao foi possivel gravar a chave: " + e.getMessage(), e);
        }
    }

    private String chave() {
        String env = System.getenv("DEEPSEEK_API_KEY");
        if (env != null && !env.isBlank()) {
            return env.trim();
        }
        try {
            if (Files.exists(ARQUIVO_CHAVE)) {
                String lida = Files.readString(ARQUIVO_CHAVE, StandardCharsets.UTF_8).trim();
                return lida.isEmpty() ? null : lida;
            }
        } catch (Exception e) {
            log.warn("Nao consegui ler a chave: {}", e.getMessage());
        }
        return null;
    }

    /** Envia o historico + contexto da questao e devolve o texto da resposta. */
    public String conversar(List<Dtos.ChatMensagem> historico, Dtos.ContextoQuestao contexto) {
        String apiKey = chave();
        if (apiKey == null) {
            throw new IllegalStateException("Chave da DeepSeek nao configurada");
        }

        List<Map<String, String>> mensagens = new ArrayList<>();
        mensagens.add(Map.of("role", "system", "content", promptSistema(contexto)));
        for (Dtos.ChatMensagem m : historico) {
            String papel = "assistant".equals(m.role()) ? "assistant" : "user";
            mensagens.add(Map.of("role", papel, "content", m.content()));
        }

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("model", MODELO);
        corpo.put("messages", mensagens);
        corpo.put("temperature", 0.3);
        corpo.put("max_tokens", 900);
        corpo.put("stream", false);

        try {
            String json = mapper.writeValueAsString(corpo);
            HttpRequest req = HttpRequest.newBuilder(URI.create(ENDPOINT))
                    .timeout(Duration.ofSeconds(90))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (resp.statusCode() != 200) {
                throw new IllegalStateException("DeepSeek respondeu " + resp.statusCode() + ": " + resumir(resp.body()));
            }
            Map<?, ?> parseado = mapper.readValue(resp.body(), Map.class);
            List<?> escolhas = (List<?>) parseado.get("choices");
            if (escolhas == null || escolhas.isEmpty()) {
                throw new IllegalStateException("Resposta sem conteudo");
            }
            Map<?, ?> primeira = (Map<?, ?>) escolhas.get(0);
            Map<?, ?> mensagem = (Map<?, ?>) primeira.get("message");
            Object conteudo = mensagem == null ? null : mensagem.get("content");
            return conteudo == null ? "(o tutor nao retornou texto)" : conteudo.toString();
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Falha ao chamar a DeepSeek: {}", e.toString());
            throw new IllegalStateException("Falha ao falar com a DeepSeek: " + e.getMessage(), e);
        }
    }

    private static String resumir(String corpo) {
        if (corpo == null) {
            return "";
        }
        return corpo.length() > 300 ? corpo.substring(0, 300) + "..." : corpo;
    }

    private static String promptSistema(Dtos.ContextoQuestao ctx) {
        StringBuilder sb = new StringBuilder();
        sb.append("Voce e um tutor de estudos para concursos publicos brasileiros, especializado nos ")
          .append("concursos de Soldado da PM-AM e Investigador da PC-AM (banca FGV).\n\n")
          .append("Regras:\n")
          .append("- Responda em portugues do Brasil, direto e didatico.\n")
          .append("- Estes cargos nao sao privativos de bachareis em Direito: a banca cobra a LETRA DA LEI. ")
          .append("Explique pelo dispositivo aplicavel.\n")
          .append("- NUNCA invente numero de artigo, inciso, sumula ou tese. Se nao tiver certeza, diga que ")
          .append("nao tem certeza e explique o conceito sem inventar numero.\n")
          .append("- Se a pergunta nao for sobre a questao nem sobre a materia, traga o aluno de volta ao estudo.\n")
          .append("- Seja conciso: no maximo 4 paragrafos curtos, salvo se o aluno pedir aprofundamento.\n\n");

        if (ctx != null && ctx.enunciado() != null) {
            sb.append("QUESTAO EM ESTUDO\n").append(ctx.enunciado()).append("\n\n");
            if (ctx.alternativas() != null && !ctx.alternativas().isEmpty()) {
                sb.append("ALTERNATIVAS\n");
                for (int i = 0; i < ctx.alternativas().size(); i++) {
                    sb.append((char) ('A' + i)).append(") ").append(ctx.alternativas().get(i)).append('\n');
                }
                sb.append('\n');
            }
            if (ctx.gabarito() != null) {
                sb.append("GABARITO OFICIAL: ").append(ctx.gabarito()).append('\n');
            }
            if (ctx.alternativaAluno() != null) {
                sb.append("O ALUNO MARCOU: ").append(ctx.alternativaAluno()).append('\n');
                if (ctx.acertou() != null) {
                    sb.append("Resultado: ").append(ctx.acertou() ? "acertou" : "errou").append('\n');
                }
            }
            if (ctx.fundamento() != null && !ctx.fundamento().isBlank()) {
                sb.append("FUNDAMENTO CADASTRADO: ").append(ctx.fundamento()).append('\n');
            }
            if (ctx.explicacao() != null && !ctx.explicacao().isBlank()) {
                sb.append("COMENTARIO CADASTRADO: ").append(ctx.explicacao()).append('\n');
            }
            sb.append("\nMateria: ").append(ctx.materia()).append(" | Assunto: ").append(ctx.assunto()).append('\n');
        }
        return sb.toString();
    }
}
