package com.concurso.web;

import com.concurso.domain.Usuario;
import com.concurso.repo.UsuarioRepository;
import com.concurso.service.SenhaHash;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Contrato HTTP do mapa mental e do PDF: autenticados, somente leitura, 404 para slug inexistente
 * e bytes de PDF de verdade.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:material-pdf;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "concurso.seed.arquivo=questoes.json",
                "concurso.seed.extra-arquivo=",
                "concurso.materiais.arquivo=classpath:materiais-pdf-teste.json"
        })
class MaterialPdfTest {

    @LocalServerPort
    private int porta;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private UsuarioRepository usuarios;

    private final HttpClient http = HttpClient.newHttpClient();
    private String token;

    @BeforeEach
    void autenticar() throws Exception {
        String email = "pdf-" + System.nanoTime() + "@qb.test";
        Usuario usuario = new Usuario();
        usuario.setNome("Aluno PDF");
        usuario.setEmail(email);
        usuario.setSenhaHash(SenhaHash.gerar("Test123456"));
        usuario.setEmailVerificado(true);
        usuarios.save(usuario);

        HttpRequest login = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + "/api/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"email\":\"" + email + "\",\"senha\":\"Test123456\"}", StandardCharsets.UTF_8))
                .build();
        HttpResponse<String> resposta = http.send(login, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        assertEquals(200, resposta.statusCode());
        token = mapper.readTree(resposta.body()).get("token").asString();
    }

    @Test
    void pdfEhGeradoComMagicBytesETamanhoUtil() throws Exception {
        HttpResponse<byte[]> resposta = pdf("/api/materiais/lingua-portuguesa-pdf/pdf", token);

        assertEquals(200, resposta.statusCode());
        assertEquals("application/pdf",
                resposta.headers().firstValue("Content-Type").orElse(""));
        String disposicao = resposta.headers().firstValue("Content-Disposition").orElse("");
        assertTrue(disposicao.contains("attachment"), disposicao);
        assertTrue(disposicao.contains("filename=\"lingua-portuguesa-pdf.pdf\""), disposicao);

        byte[] corpo = resposta.body();
        assertTrue(corpo.length > 1024, "PDF pequeno demais: " + corpo.length);
        assertEquals("%PDF", new String(corpo, 0, 4, StandardCharsets.ISO_8859_1));
    }

    @Test
    void mapaMentalDevolveTituloTemaERamos() throws Exception {
        HttpResponse<String> resposta = chamar("GET", "/api/materiais/lingua-portuguesa-pdf/mapa-mental", token);

        assertEquals(200, resposta.statusCode());
        JsonNode corpo = mapper.readTree(resposta.body());
        assertEquals("Língua Portuguesa — resumo de revisão", corpo.get("titulo").asString());
        assertEquals("Língua Portuguesa — resumo de revisão", corpo.get("tema").asString());
        JsonNode ramos = corpo.get("ramos");
        assertTrue(ramos.size() >= 2 && ramos.size() <= 8, "ramos: " + ramos.size());
        assertEquals("Interpretação", ramos.get(0).get("titulo").asString());
        assertTrue(ramos.get(0).get("itens").size() <= 4);
        assertTrue(ramos.get(0).get("itens").size() > 0);
    }

    @Test
    void slugInexistenteResponde404() throws Exception {
        HttpResponse<String> resposta = chamar("GET", "/api/materiais/nao-existe/pdf", token);

        assertEquals(404, resposta.statusCode());
        assertTrue(resposta.body().contains("Material não encontrado"));
    }

    @Test
    void exportacoesExigemAutenticacao() throws Exception {
        assertEquals(401, chamar("GET", "/api/materiais/lingua-portuguesa-pdf/pdf", null).statusCode());
        assertEquals(401, chamar("GET", "/api/materiais/lingua-portuguesa-pdf/mapa-mental", null).statusCode());
    }

    private HttpResponse<byte[]> pdf(String caminho, String token) throws Exception {
        HttpRequest request = requisicao(caminho, token).GET().build();
        return http.send(request, HttpResponse.BodyHandlers.ofByteArray());
    }

    private HttpResponse<String> chamar(String metodo, String caminho, String token) throws Exception {
        HttpRequest request = requisicao(caminho, token)
                .method(metodo, HttpRequest.BodyPublishers.noBody())
                .build();
        return http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
    }

    private HttpRequest.Builder requisicao(String caminho, String token) {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + caminho))
                .header("Content-Type", "application/json");
        Optional.ofNullable(token).ifPresent(t -> builder.header("Authorization", "Bearer " + t));
        return builder;
    }
}
