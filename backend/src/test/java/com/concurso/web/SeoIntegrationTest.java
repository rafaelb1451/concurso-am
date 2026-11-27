package com.concurso.web;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Paginas publicas de SEO: HTML server-side, canonical, JSON-LD, robots e sitemap.
 * O conteudo pago (gabarito/explicacao) nao pode aparecer nessas paginas.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:seo;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "concurso.seed.arquivo=questoes.json",
                "concurso.seed.extra-arquivo=",
                "concurso.materiais.arquivo=classpath:materiais-teste.json",
                "concurso.seo.url=https://qbconcurso.com.br"
        })
class SeoIntegrationTest {

    @LocalServerPort
    private int porta;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void materialEntregaHtmlIndexavelComCanonicalEJsonLd() throws Exception {
        HttpResponse<String> resposta = get("/materiais/lei-5194-1966");

        assertEquals(200, resposta.statusCode());
        assertTrue(resposta.headers().firstValue("content-type").orElse("").contains("text/html"));
        String html = resposta.body();
        assertTrue(html.contains("<h1>Lei nº 5.194/1966</h1>"), "h1 com o titulo");
        assertTrue(html.contains("Art. 1º"), "conteudo integral");
        assertTrue(html.contains("rel=\"canonical\" href=\"https://qbconcurso.com.br/materiais/lei-5194-1966\""),
                "canonical absoluto");
        assertTrue(html.contains("application/ld+json"), "dados estruturados");
        assertTrue(html.contains("\"@type\":\"Article\""), "schema Article");
        assertTrue(html.contains("<meta name=\"robots\" content=\"index,follow"), "indexavel");
    }

    @Test
    void materialInexistenteResponde404ComNoindex() throws Exception {
        HttpResponse<String> resposta = get("/materiais/nao-existe");

        assertEquals(404, resposta.statusCode());
        assertTrue(resposta.body().contains("noindex"), "404 nao deve ser indexado");
    }

    @Test
    void robotsApontaParaSitemapEBloqueiaApi() throws Exception {
        HttpResponse<String> resposta = get("/robots.txt");

        assertEquals(200, resposta.statusCode());
        String corpo = resposta.body();
        assertTrue(corpo.contains("Disallow: /api/"));
        assertTrue(corpo.contains("Sitemap: https://qbconcurso.com.br/sitemap.xml"));
    }

    @Test
    void sitemapListaMateriaisEMaterias() throws Exception {
        HttpResponse<String> resposta = get("/sitemap.xml");

        assertEquals(200, resposta.statusCode());
        String xml = resposta.body();
        assertTrue(xml.contains("<urlset"));
        assertTrue(xml.contains("https://qbconcurso.com.br/materiais/lei-5194-1966"));
        assertTrue(xml.contains("https://qbconcurso.com.br/materias/lingua-portuguesa"));
        assertTrue(xml.contains("<lastmod>"), "material deve trazer lastmod");
    }

    @Test
    void paginaDeMateriaNaoExpoeGabaritoNemExplicacao() throws Exception {
        HttpResponse<String> resposta = get("/materias/lingua-portuguesa");

        assertEquals(200, resposta.statusCode());
        String html = resposta.body();
        assertTrue(html.contains("<h1>Língua Portuguesa</h1>"));
        assertTrue(html.contains("alternativas"), "amostra de alternativas");

        String explicacao = explicacaoDeLinguaPortuguesa();
        assertFalse(html.contains(explicacao.substring(0, 40)),
                "a explicacao (conteudo pago) nao pode vazar na pagina publica");
    }

    @Test
    void planosEFaqTemConteudoEJsonLd() throws Exception {
        HttpResponse<String> planos = get("/planos");
        assertEquals(200, planos.statusCode());
        assertTrue(planos.body().contains("PRO"));
        assertTrue(planos.body().contains("R$"));

        HttpResponse<String> faq = get("/faq");
        assertEquals(200, faq.statusCode());
        assertTrue(faq.body().contains("\"@type\":\"FAQPage\""));
        assertTrue(faq.body().contains("Perguntas frequentes"));
    }

    @Test
    void hubDeMateriaisListaOsSlugs() throws Exception {
        HttpResponse<String> resposta = get("/materiais");

        assertEquals(200, resposta.statusCode());
        assertTrue(resposta.body().contains("href=\"/materiais/lei-5194-1966\""));
        assertTrue(resposta.body().contains("href=\"/materiais/regimento-interno-crea-am\""));
    }

    private String explicacaoDeLinguaPortuguesa() throws Exception {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("questoes.json")) {
            JsonNode raiz = mapper.readTree(in);
            for (JsonNode q : raiz) {
                if ("Língua Portuguesa".equals(q.get("materia").asString())) {
                    return q.get("explicacao").asString();
                }
            }
        }
        throw new IllegalStateException("seed sem questão de Língua Portuguesa");
    }

    private HttpResponse<String> get(String caminho) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + caminho))
                .header("Accept", "text/html")
                .GET()
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }
}
