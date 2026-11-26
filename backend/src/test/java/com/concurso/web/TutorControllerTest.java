package com.concurso.web;

import com.concurso.service.DeepSeekService;
import com.concurso.domain.Usuario;
import com.concurso.repo.UsuarioRepository;
import com.concurso.service.SenhaHash;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Contrato HTTP do tutor: validacao de entrada, mensagens de erro amigaveis e resposta quando o
 * provedor funciona. O cliente da DeepSeek e' mockado para o teste nao depender de rede nem chave.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:tutor-integration;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "concurso.seed.arquivo=questoes.json"
        })
class TutorControllerTest {

    @LocalServerPort
    private int porta;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private UsuarioRepository usuarios;

    @MockitoBean
    private DeepSeekService tutor;

    private final HttpClient http = HttpClient.newHttpClient();
    private String token;

    @BeforeEach
    void autenticar() throws Exception {
        String email = "aluno-" + System.nanoTime() + "@qb.test";
        Usuario usuario = new Usuario();
        usuario.setNome("Aluno Teste");
        usuario.setEmail(email);
        usuario.setSenhaHash(SenhaHash.gerar("Test123456"));
        usuario.setEmailVerificado(true);
        usuarios.save(usuario);

        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + "/api/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"email\":\"" + email + "\",\"senha\":\"Test123456\"}",
                        StandardCharsets.UTF_8))
                .build();
        HttpResponse<String> login = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        assertEquals(200, login.statusCode());
        token = mapper.readTree(login.body()).get("token").asString();
    }

    @Test
    void statusMostraSeHaChaveConfigurada() throws Exception {
        when(tutor.configurado()).thenReturn(false);

        HttpResponse<String> resposta = chamar("GET", "/api/config/deepseek", null);

        assertEquals(200, resposta.statusCode());
        JsonNode corpo = mapper.readTree(resposta.body());
        assertEquals(false, corpo.get("configurado").asBoolean());
        assertEquals("deepseek-chat", corpo.get("modelo").asString());
    }

    @Test
    void salvarChaveVaziaRetorna400SemChamarOServico() throws Exception {
        HttpResponse<String> resposta = chamar("POST", "/api/config/deepseek", "{\"apiKey\":\"   \"}");

        assertEquals(400, resposta.statusCode());
        assertTrue(resposta.body().contains("chave vazia"));
        verifyNoInteractions(tutor);
    }

    @Test
    void chatSemChaveRetornaMensagemDeConfiguracao() throws Exception {
        when(tutor.conversar(any(), any()))
                .thenThrow(new IllegalStateException("Chave da DeepSeek nao configurada"));

        HttpResponse<String> resposta = chamar("POST", "/api/chat", chatValido());

        assertEquals(400, resposta.statusCode());
        assertTrue(resposta.body().contains("Configure a chave da DeepSeek"));
    }

    @Test
    void chatComHistoricoAcimaDoLimiteRetorna400() throws Exception {
        StringBuilder mensagens = new StringBuilder("[");
        for (int i = 0; i < 21; i++) {
            if (i > 0) {
                mensagens.append(',');
            }
            mensagens.append("{\"role\":\"user\",\"content\":\"pergunta ").append(i).append("\"}");
        }
        mensagens.append(']');

        HttpResponse<String> resposta = chamar("POST", "/api/chat",
                "{\"mensagens\":" + mensagens + ",\"contexto\":null}");

        assertEquals(400, resposta.statusCode());
        assertTrue(resposta.body().contains("no maximo 20 mensagens"));
        verifyNoInteractions(tutor);
    }

    @Test
    void chatComMensagemVaziaRetorna400() throws Exception {
        HttpResponse<String> resposta = chamar("POST", "/api/chat",
                "{\"mensagens\":[{\"role\":\"user\",\"content\":\"\"}],\"contexto\":null}");

        assertEquals(400, resposta.statusCode());
        verifyNoInteractions(tutor);
    }

    @Test
    void chatValidoDevolveTextoDoTutor() throws Exception {
        when(tutor.conversar(any(), any())).thenReturn("Resposta do tutor sobre a questão.");

        HttpResponse<String> resposta = chamar("POST", "/api/chat", chatValido());

        assertEquals(200, resposta.statusCode());
        assertEquals("Resposta do tutor sobre a questão.",
                mapper.readTree(resposta.body()).get("resposta").asString());
    }

    @Test
    void falhaDoProvedorVira502SemVazarDetalheInterno() throws Exception {
        when(tutor.conversar(any(), any()))
                .thenThrow(new IllegalStateException("Falha de comunicacao com o provedor do tutor"));

        HttpResponse<String> resposta = chamar("POST", "/api/chat", chatValido());

        assertEquals(502, resposta.statusCode());
        assertTrue(resposta.body().contains("tutor está indisponível"));
        assertTrue(!resposta.body().contains("provedor do tutor"));
    }

    private static String chatValido() {
        return """
                {"mensagens":[{"role":"user","content":"Explique a alternativa B."}],
                 "contexto":{"materia":"Direito Penal","assunto":"Aplicação da lei penal",
                 "enunciado":"Enunciado de teste.","alternativas":["A","B"],"gabarito":"B"}}
                """;
    }

    private HttpResponse<String> chamar(String metodo, String caminho, String corpo) throws Exception {
        HttpRequest.BodyPublisher publisher = corpo == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(corpo, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + caminho))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + token)
                .method(metodo, publisher)
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }
}
