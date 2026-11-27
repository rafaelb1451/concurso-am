package com.concurso.web;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Material de estudo e' publico e somente leitura: a lista sai sem conteudo, o detalhe traz o
 * texto puro e nenhuma escrita funciona sem sessao.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:materiais-publico;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "concurso.seed.arquivo=questoes.json",
                "concurso.seed.extra-arquivo=",
                "concurso.materiais.arquivo=classpath:materiais-teste.json"
        })
class MaterialPublicoIntegrationTest {

    @LocalServerPort
    private int porta;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void listaResumidaEhPublicaENaoTrazConteudo() throws Exception {
        HttpResponse<String> resposta = chamar("GET", "/api/materiais?concurso=CREA-AM", null);

        assertEquals(200, resposta.statusCode());
        JsonNode lista = mapper.readTree(resposta.body());
        assertEquals(2, lista.size());
        JsonNode primeiro = lista.get(0);
        assertEquals("lei-5194-1966", primeiro.get("slug").asString());
        assertEquals("LEI", primeiro.get("categoria").asString());
        assertTrue(primeiro.has("titulo"));
        assertTrue(primeiro.has("resumo"));
        assertTrue(primeiro.has("fonte"));
        assertTrue(primeiro.has("ordem"));
        assertFalse(primeiro.has("conteudo"), "a lista nao pode carregar o texto integral");
    }

    @Test
    void detalhePorSlugTrazConteudoEmTextoPuro() throws Exception {
        HttpResponse<String> resposta = chamar("GET", "/api/materiais/lei-5194-1966", null);

        assertEquals(200, resposta.statusCode());
        JsonNode material = mapper.readTree(resposta.body());
        assertEquals("CREA-AM", material.get("concurso").asString());
        assertEquals("Lei nº 5.194/1966", material.get("titulo").asString());
        assertTrue(material.get("conteudo").asString().contains("Art. 1º"));
        assertTrue(material.has("atualizadoEm"));
    }

    @Test
    void filtroPorOutroConcursoRespeitaOConcurso() throws Exception {
        HttpResponse<String> resposta = chamar("GET", "/api/materiais?concurso=PM-AM", null);

        assertEquals(200, resposta.statusCode());
        assertEquals(0, mapper.readTree(resposta.body()).size());
    }

    @Test
    void slugInexistenteResponde404() throws Exception {
        HttpResponse<String> resposta = chamar("GET", "/api/materiais/nao-existe", null);

        assertEquals(404, resposta.statusCode());
        assertTrue(resposta.body().contains("Material não encontrado"));
    }

    @Test
    void naoExpoeRotaPublicaDeEscrita() throws Exception {
        HttpResponse<String> resposta = chamar("POST", "/api/materiais", "{}");

        // so' existe handler GET: o POST nem chega a ser roteado como escrita publica
        assertEquals(405, resposta.statusCode(), "nao existe rota publica de escrita");
        assertTrue(resposta.body().contains("Método não suportado"));
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
