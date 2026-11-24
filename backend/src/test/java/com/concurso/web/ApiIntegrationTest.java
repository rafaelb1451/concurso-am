package com.concurso.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Teste de integracao da API real: sobe o contexto completo (controllers, JPA, seed) em uma
 * porta aleatoria e exercita os fluxos que o deploy precisa manter de pe'.
 *
 * <p>Usa o seed base (24 questoes) em um H2 em memoria, entao e' rapido e nao toca no banco local.</p>
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:api-integration;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "concurso.seed.arquivo=questoes.json"
        })
class ApiIntegrationTest {

    @LocalServerPort
    private int porta;

    @Autowired
    private ObjectMapper mapper;

    private final HttpClient http = HttpClient.newHttpClient();

    @Test
    void painelTopicosESimuladoRespondem() throws Exception {
        HttpResponse<String> concursos = chamar("GET", "/api/concursos", null);
        assertEquals(200, concursos.statusCode());
        JsonNode lista = mapper.readTree(concursos.body());
        assertEquals(3, lista.size());
        long todos = -1;
        for (JsonNode concurso : lista) {
            if ("TODOS".equals(concurso.get("id").asString())) {
                todos = concurso.get("total").asLong();
            }
        }
        assertEquals(24, todos, "o seed base tem 24 questoes");

        HttpResponse<String> topicos = chamar("GET", "/api/topicos?concurso=PM-AM", null);
        assertEquals(200, topicos.statusCode());
        JsonNode materias = mapper.readTree(topicos.body());
        assertTrue(materias.size() > 0);
        assertTrue(materias.get(0).has("materia"));
        assertTrue(materias.get(0).has("total"));

        HttpResponse<String> simulado = chamar("GET", "/api/simulado?concurso=PM-AM", null);
        assertEquals(200, simulado.statusCode());
        JsonNode prova = mapper.readTree(simulado.body());
        assertEquals(60, prova.get("totalPrevisto").asInt());
        assertTrue(prova.get("totalGerado").asInt() > 0);
    }

    @Test
    void gabaritoSoApareceDepoisDeResponder() throws Exception {
        HttpResponse<String> questoes = chamar("GET", "/api/questoes?concurso=PM-AM&quantidade=1", null);
        assertEquals(200, questoes.statusCode());
        JsonNode sessao = mapper.readTree(questoes.body());
        assertEquals(1, sessao.size());

        JsonNode questao = sessao.get(0);
        assertFalse(questao.has("correta"), "o gabarito nao pode ir na sessao de estudo");
        assertFalse(questao.has("explicacao"), "o comentario nao pode ir na sessao de estudo");
        assertTrue(questao.get("alternativas").size() >= 2);
        long id = questao.get("id").asLong();

        HttpResponse<String> resposta = chamar("POST", "/api/questoes/" + id + "/responder",
                "{\"alternativa\":0}");
        assertEquals(200, resposta.statusCode());
        JsonNode correcao = mapper.readTree(resposta.body());
        assertTrue(correcao.has("acertou"));
        assertTrue(correcao.has("gabarito"));
        assertTrue(correcao.has("correta"));

        HttpResponse<String> desempenho = chamar("GET", "/api/desempenho", null);
        assertEquals(200, desempenho.statusCode());
        assertTrue(mapper.readTree(desempenho.body()).get("respondidas").asLong() >= 1);

        HttpResponse<String> invalida = chamar("POST", "/api/questoes/" + id + "/responder",
                "{\"alternativa\":99}");
        assertEquals(400, invalida.statusCode());
        assertTrue(invalida.body().contains("Alternativa invalida"));
    }

    @Test
    void assuntoFiltraMesmoSemMateria() throws Exception {
        HttpResponse<String> topicos = chamar("GET", "/api/topicos?concurso=TODOS", null);
        assertEquals(200, topicos.statusCode());
        String assunto = mapper.readTree(topicos.body()).get(0).get("assunto").asString();

        String url = "/api/questoes?assunto=" + URLEncoder.encode(assunto, StandardCharsets.UTF_8)
                + "&quantidade=5";
        HttpResponse<String> questoes = chamar("GET", url, null);
        assertEquals(200, questoes.statusCode());
        JsonNode sessao = mapper.readTree(questoes.body());
        assertTrue(sessao.size() > 0, "o filtro por assunto deve achar questoes sem materia");
        for (JsonNode q : sessao) {
            assertEquals(assunto, q.get("assunto").asString());
        }
    }

    @Test
    void importacaoRejeitaLinhasInvalidasSemAbortarOLote() throws Exception {
        String lote = """
                [
                  {"materia":"Língua Portuguesa","assunto":"Crase","origem":"AUTORAL",
                   "enunciado":"Questao autoral de teste sem fundamento cadastrado.",
                   "alternativas":["a","b"],"correta":0,"explicacao":"comentario"},
                  {"materia":"Língua Portuguesa","assunto":"Crase","origem":"MARCIANO",
                   "fundamento":"Art. 1","enunciado":"Questao com origem invalida no lote de teste.",
                   "alternativas":["a","b"],"correta":0,"explicacao":"comentario"},
                  {"materia":"Língua Portuguesa","assunto":"Crase","origem":"PROVA",
                   "enunciado":"Questao de prova com data de verificacao invalida.",
                   "alternativas":["a","b"],"correta":0,"verificadoEm":"31/12/2026"},
                  {"materia":"Língua Portuguesa","assunto":"Crase","origem":"PROVA",
                   "enunciado":"Questao de prova valida para importacao no lote de teste.",
                   "alternativas":["a","b"],"correta":0}
                ]
                """;

        HttpResponse<String> resposta = chamar("POST", "/api/importar", lote);
        assertEquals(200, resposta.statusCode());
        JsonNode relatorio = mapper.readTree(resposta.body());
        assertEquals(4, relatorio.get("recebidas").asInt());
        assertEquals(1, relatorio.get("importadas").asInt());
        assertEquals(3, relatorio.get("ignoradas").asInt());
        assertEquals(3, relatorio.get("erros").size());
    }

    private HttpResponse<String> chamar(String metodo, String caminho, String corpo) throws Exception {
        HttpRequest.BodyPublisher publisher = corpo == null
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(corpo, StandardCharsets.UTF_8);
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + caminho))
                .header("Content-Type", "application/json")
                .method(metodo, publisher)
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }
}
