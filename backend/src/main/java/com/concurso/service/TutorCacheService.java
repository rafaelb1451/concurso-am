package com.concurso.service;

import com.concurso.domain.TutorCache;
import com.concurso.repo.TutorCacheRepository;
import com.concurso.web.Dtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cache de respostas do tutor virtual.
 *
 * <p>A chave e' o SHA-256 hex de um JSON canonico com {@code {contexto, mensagens}}. O JSON e'
 * montado campo a campo, sempre na mesma ordem, com os textos aparados — a mesma duvida escrita
 * com espacos diferentes cai na mesma chave. O id do usuario nao entra: o conteudo da resposta
 * nao depende de quem perguntou.</p>
 *
 * <p>So' respostas nao vazias sao gravadas. Uma falha do provedor (excecao) sobe para o
 * controller e nao deixa registro no cache.</p>
 */
@Service
public class TutorCacheService {

    private static final Logger log = LoggerFactory.getLogger(TutorCacheService.class);
    private static final String ALGORITMO = "SHA-256";

    private final DeepSeekService tutor;
    private final TutorCacheRepository caches;
    private final ObjectMapper mapper;

    public TutorCacheService(DeepSeekService tutor, TutorCacheRepository caches, ObjectMapper mapper) {
        this.tutor = tutor;
        this.caches = caches;
        this.mapper = mapper;
    }

    /**
     * Responde a pergunta usando o cache quando possivel.
     *
     * @param usuarioId apenas para diagnostico/limite; nunca participa da chave
     */
    public String conversar(Long usuarioId, List<Dtos.ChatMensagem> mensagens, Dtos.ContextoQuestao contexto) {
        String chave = chave(mensagens, contexto);

        TutorCache existente = caches.findByChave(chave).orElse(null);
        if (existente != null) {
            caches.incrementarAcessos(chave);
            log.debug("Cache do tutor: hit na chave {} (usuario {}).", chave, usuarioId);
            return existente.getResposta();
        }

        String resposta = tutor.conversar(mensagens, contexto);
        if (resposta == null || resposta.isBlank()) {
            // Resposta vazia nao e' util nem cacheavel; o aluno recebe o que veio.
            return resposta;
        }

        TutorCache novo = new TutorCache();
        novo.setChave(chave);
        novo.setResposta(resposta);
        novo.setCriadaEm(Instant.now());
        novo.setAcessos(0);
        try {
            // saveAndFlush garante que o INSERT (e a unique da chave) acontece aqui, dentro do
            // try: se outra requisicao gravou a mesma chave, a violacao cai no catch.
            caches.saveAndFlush(novo);
            log.debug("Cache do tutor: miss na chave {} gravado (usuario {}).", chave, usuarioId);
        } catch (DataIntegrityViolationException corrida) {
            // Corrida: as duas chamadas perderam o cache juntas. A resposta gravada primeiro
            // vence; esta requisicao reaproveita exatamente o mesmo texto.
            log.info("Cache do tutor: corrida na chave {}; usando a resposta ja gravada.", chave);
            return caches.findByChave(chave)
                    .map(TutorCache::getResposta)
                    .orElse(resposta);
        }
        return resposta;
    }

    /** SHA-256 hex de {@code {contexto, mensagens}} canonico. Visivel para teste. */
    String chave(List<Dtos.ChatMensagem> mensagens, Dtos.ContextoQuestao contexto) {
        Map<String, Object> raiz = new LinkedHashMap<>();
        raiz.put("contexto", contextoCanonico(contexto));
        raiz.put("mensagens", mensagensCanonicas(mensagens));

        try {
            byte[] json = mapper.writeValueAsBytes(raiz);
            byte[] digest = MessageDigest.getInstance(ALGORITMO).digest(json);
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("Nao foi possivel calcular a chave do cache do tutor", e);
        }
    }

    private static Map<String, Object> contextoCanonico(Dtos.ContextoQuestao contexto) {
        if (contexto == null) {
            return null;
        }
        Map<String, Object> ctx = new LinkedHashMap<>();
        ctx.put("materia", texto(contexto.materia()));
        ctx.put("assunto", texto(contexto.assunto()));
        ctx.put("enunciado", texto(contexto.enunciado()));
        ctx.put("alternativas", alternativas(contexto.alternativas()));
        ctx.put("gabarito", texto(contexto.gabarito()));
        ctx.put("alternativaAluno", texto(contexto.alternativaAluno()));
        ctx.put("acertou", contexto.acertou());
        ctx.put("fundamento", texto(contexto.fundamento()));
        ctx.put("explicacao", texto(contexto.explicacao()));
        return ctx;
    }

    private static List<Object> mensagensCanonicas(List<Dtos.ChatMensagem> mensagens) {
        List<Object> lista = new ArrayList<>();
        if (mensagens == null) {
            return lista;
        }
        for (Dtos.ChatMensagem m : mensagens) {
            if (m == null) {
                lista.add(null);
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("role", papel(m.role()));
            item.put("content", texto(m.content()));
            lista.add(item);
        }
        return lista;
    }

    /** Mesma regra do DeepSeekService: so' "assistant" e' assistente; o resto vira "user". */
    private static String papel(String role) {
        return role != null && "assistant".equalsIgnoreCase(role.strip()) ? "assistant" : "user";
    }

    private static List<Object> alternativas(List<String> alternativas) {
        List<Object> lista = new ArrayList<>();
        if (alternativas == null) {
            return lista;
        }
        for (String alternativa : alternativas) {
            lista.add(texto(alternativa));
        }
        return lista;
    }

    private static String texto(String valor) {
        return valor == null ? null : valor.strip();
    }
}
