package com.concurso.web;

import com.concurso.domain.Assinatura;
import com.concurso.domain.AssinaturaCertame;
import com.concurso.domain.Plano;
import com.concurso.domain.StatusAssinatura;
import com.concurso.domain.Usuario;
import com.concurso.integration.payment.PaymentGateway;
import com.concurso.repo.AcessoAuditoriaRepository;
import com.concurso.repo.AssinaturaCertameRepository;
import com.concurso.repo.AssinaturaRepository;
import com.concurso.repo.PlanoRepository;
import com.concurso.repo.UsuarioRepository;
import com.concurso.service.AcessoService;
import com.concurso.service.DeepSeekService;
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
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regras de acesso por plano/certame contra H2 real e HTTP de ponta a ponta.
 *
 * <p>Cobre o que o frontend não pode decidir sozinho: quantidade de certames no checkout, escopo
 * das consultas, gating do Tutor e troca de certame 1x por ciclo.</p>
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.datasource.url=jdbc:h2:mem:acesso-certame;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
                "spring.jpa.hibernate.ddl-auto=create-drop",
                "concurso.seed.arquivo=questoes.json",
                "concurso.seed.extra-arquivo=",
                "concurso.materiais.arquivo="
        })
class AcessoPorCertameIntegrationTest {

    @LocalServerPort
    private int porta;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private PlanoRepository planos;

    @Autowired
    private AssinaturaRepository assinaturas;

    @Autowired
    private AssinaturaCertameRepository certames;

    @Autowired
    private AcessoAuditoriaRepository auditorias;

    @MockitoBean
    private PaymentGateway gateway;

    @MockitoBean
    private DeepSeekService tutor;

    private final HttpClient http = HttpClient.newHttpClient();
    private Usuario usuario;
    private String token;

    @BeforeEach
    void preparar() throws Exception {
        when(gateway.configurado()).thenReturn(true);
        when(gateway.id()).thenReturn("fake");
        when(gateway.criarCheckout(any())).thenReturn(
                new PaymentGateway.CheckoutCriado("chk-1", "https://pagamento.test/checkout/1"));
        when(tutor.conversar(any(), any())).thenReturn("Resposta do tutor.");

        String email = "acesso-" + System.nanoTime() + "@qb.test";
        usuario = new Usuario();
        usuario.setNome("Aluno Acesso");
        usuario.setEmail(email);
        usuario.setSenhaHash(SenhaHash.gerar("Test123456"));
        usuario.setEmailVerificado(true);
        usuarios.save(usuario);

        HttpRequest login = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + "/api/login"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"email\":\"" + email + "\",\"senha\":\"Test123456\"}",
                        StandardCharsets.UTF_8))
                .build();
        HttpResponse<String> resposta = http.send(login, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        assertEquals(200, resposta.statusCode());
        token = mapper.readTree(resposta.body()).get("token").asString();
    }

    @Test
    void checkoutValidaQuantidadeEFormatoDosCertames() throws Exception {
        HttpResponse<String> doisNoBasico = chamar("POST", "/api/assinatura/checkout",
                "{\"plano\":\"BASICO\",\"certames\":[\"PM-AM\",\"PC-AM\"]}");
        assertEquals(400, doisNoBasico.statusCode());
        assertTrue(doisNoBasico.body().contains("exatamente 1"), doisNoBasico.body());

        HttpResponse<String> quatroNoPlus = chamar("POST", "/api/assinatura/checkout",
                "{\"plano\":\"PLUS\",\"certames\":[\"PM-AM\",\"PC-AM\",\"CREA-AM\",\"OUTRO\"]}");
        assertEquals(400, quatroNoPlus.statusCode());
        assertTrue(quatroNoPlus.body().contains("no máximo 3"), quatroNoPlus.body());

        HttpResponse<String> invalido = chamar("POST", "/api/assinatura/checkout",
                "{\"plano\":\"BASICO\",\"certames\":[\"PM_AM\"]}");
        assertEquals(400, invalido.statusCode());
        assertTrue(invalido.body().contains("Certame inválido"), invalido.body());

        HttpResponse<String> semCertame = chamar("POST", "/api/assinatura/checkout",
                "{\"plano\":\"PLUS\",\"certames\":[]}");
        assertEquals(400, semCertame.statusCode());

        HttpResponse<String> valido = chamar("POST", "/api/assinatura/checkout",
                "{\"plano\":\"BASICO\",\"certames\":[\"PM-AM\"]}");
        assertEquals(200, valido.statusCode(), valido.body());
        assertEquals("https://pagamento.test/checkout/1",
                mapper.readTree(valido.body()).get("url").asString());

        Assinatura pendente = assinaturas.findFirstByUsuarioIdOrderByCriadaEmDesc(usuario.getId())
                .orElseThrow();
        assertEquals(StatusAssinatura.PENDENTE, pendente.getStatus());
        List<String> escolhidos = certames.findByAssinaturaIdOrderByConcursoAsc(pendente.getId())
                .stream().map(AssinaturaCertame::getConcurso).toList();
        assertEquals(List.of("PM-AM"), escolhidos, "a PENDENTE ja guarda a escolha do checkout");

        JsonNode painel = mapper.readTree(chamar("GET", "/api/assinatura", null).body());
        assertEquals("PENDENTE", painel.get("status").asString());
        assertEquals("PM-AM", painel.get("certames").get(0).asString());
    }

    @Test
    void escopoFiltraQuestoesETopicosEBloqueiaCertameForaDoPlano() throws Exception {
        assinar(usuario, Plano.BASICO, 10, "PM-AM");

        HttpResponse<String> questoes = chamar("GET", "/api/questoes?quantidade=50", null);
        assertEquals(200, questoes.statusCode(), questoes.body());
        JsonNode lista = mapper.readTree(questoes.body());
        assertEquals(22, lista.size(), "só as 22 questões do PM-AM entram no escopo");
        for (JsonNode q : lista) {
            boolean doEscopo = false;
            for (JsonNode concurso : q.get("concursos")) {
                doEscopo |= "PM-AM".equals(concurso.asString());
            }
            assertTrue(doEscopo, "questão fora do escopo retornou: " + q);
        }

        HttpResponse<String> foraDoPlano = chamar("GET", "/api/questoes?concurso=PC-AM", null);
        assertEquals(403, foraDoPlano.statusCode(), foraDoPlano.body());
        assertTrue(foraDoPlano.body().contains("não está incluído"), foraDoPlano.body());

        HttpResponse<String> topicosFora = chamar("GET", "/api/topicos?concurso=PC-AM", null);
        assertEquals(403, topicosFora.statusCode());

        HttpResponse<String> concursos = chamar("GET", "/api/concursos", null);
        assertEquals(200, concursos.statusCode());
        JsonNode agrupado = mapper.readTree(concursos.body());
        assertEquals(2, agrupado.size(), "só PM-AM e o somatório TODOS aparecem");
        assertEquals("PM-AM", agrupado.get(0).get("id").asString());
        assertEquals("TODOS", agrupado.get(1).get("id").asString());
        assertEquals(22, agrupado.get(1).get("total").asLong());
        for (JsonNode concurso : agrupado) {
            assertFalse("PC-AM".equals(concurso.get("id").asString()),
                    "certame não contratado não pode aparecer");
        }

        // A selecao no checkout/troca precisa do catalogo completo, mesmo com escopo restrito.
        HttpResponse<String> catalogo = chamar("GET", "/api/concursos?catalogo=true", null);
        assertEquals(200, catalogo.statusCode(), catalogo.body());
        JsonNode todos = mapper.readTree(catalogo.body());
        assertEquals(3, todos.size(), "catálogo traz PM-AM, PC-AM e TODOS");
        boolean achouPc = false;
        for (JsonNode concurso : todos) {
            achouPc |= "PC-AM".equals(concurso.get("id").asString());
        }
        assertTrue(achouPc, "o catálogo não pode esconder um certame disponível para contratar");

        HttpResponse<String> topicos = chamar("GET", "/api/topicos", null);
        assertEquals(200, topicos.statusCode(), topicos.body());
        assertTrue(mapper.readTree(topicos.body()).size() > 0);

        HttpResponse<String> bancas = chamar("GET", "/api/bancas", null);
        assertEquals(200, bancas.statusCode());
        assertEquals(22, mapper.readTree(bancas.body()).get(0).get("questoes").asLong());

        HttpResponse<String> simulado = chamar("GET", "/api/simulado?quantidade=10", null);
        assertEquals(200, simulado.statusCode(), simulado.body());
        JsonNode prova = mapper.readTree(simulado.body());
        assertTrue(prova.get("totalGerado").asInt() > 0);
        assertTrue(prova.get("totalGerado").asInt() <= 10);
        for (JsonNode q : prova.get("questoes")) {
            boolean doEscopo = false;
            for (JsonNode concurso : q.get("concursos")) {
                doEscopo |= "PM-AM".equals(concurso.asString());
            }
            assertTrue(doEscopo, "simulado trouxe questão fora do escopo");
        }

        assertEquals(403, chamar("GET", "/api/simulado?concurso=PC-AM", null).statusCode());
        assertEquals(403, chamar("GET", "/api/desempenho?concurso=PC-AM", null).statusCode());
        assertEquals(200, chamar("GET", "/api/desempenho", null).statusCode());
        assertEquals(200, chamar("GET", "/api/evolucao", null).statusCode());
    }

    @Test
    void tutorBloqueadoNoBasicoELiberadoNoPlusContabilizandoUso() throws Exception {
        assinar(usuario, Plano.BASICO, 10, "PM-AM");

        HttpResponse<String> noBasico = chamar("POST", "/api/chat", chat());
        assertEquals(403, noBasico.statusCode(), noBasico.body());
        assertTrue(noBasico.body().contains("Plus"), noBasico.body());
        assertTrue(noBasico.body().contains("Conheça o Plus"), noBasico.body());
        verify(tutor, never()).conversar(any(), any());

        assinar(usuario, Plano.PLUS, 20, "PM-AM", "PC-AM");
        HttpResponse<String> noPlus = chamar("POST", "/api/chat", chat());
        assertEquals(200, noPlus.statusCode(), noPlus.body());
        assertEquals("Resposta do tutor.",
                mapper.readTree(noPlus.body()).get("resposta").asString());

        HttpResponse<String> uso = chamar("GET", "/api/uso-tutor", null);
        assertEquals(200, uso.statusCode());
        JsonNode corpo = mapper.readTree(uso.body());
        assertEquals(1, corpo.get("usado").asInt());
        assertEquals(50, corpo.get("cota").asInt());

        HttpResponse<String> assinatura = chamar("GET", "/api/assinatura", null);
        assertEquals(200, assinatura.statusCode());
        JsonNode plano = mapper.readTree(assinatura.body()).get("plano");
        assertEquals("PLUS", plano.get("codigo").asString());
        assertEquals(3, plano.get("certamesMaximos").asInt());
        assertTrue(plano.get("tutorIa").asBoolean());
    }

    @Test
    void trocaDeCertameAconteceUmaVezPorCicloEAudita() throws Exception {
        assinar(usuario, Plano.PLUS, 30, "PM-AM", "PC-AM");

        HttpResponse<String> primeira = chamar("PUT", "/api/assinatura/certames",
                "{\"certames\":[\"CREA-AM\"]}");
        assertEquals(200, primeira.statusCode(), primeira.body());
        assertEquals("CREA-AM", mapper.readTree(primeira.body()).get("certames").get(0).asString());

        HttpResponse<String> depois = chamar("GET", "/api/assinatura", null);
        JsonNode corpo = mapper.readTree(depois.body());
        assertEquals(1, corpo.get("certames").size());
        assertEquals("CREA-AM", corpo.get("certames").get(0).asString());
        assertFalse(corpo.get("podeTrocarCertame").asBoolean());

        HttpResponse<String> segunda = chamar("PUT", "/api/assinatura/certames",
                "{\"certames\":[\"PM-AM\"]}");
        assertEquals(409, segunda.statusCode(), segunda.body());
        assertTrue(segunda.body().contains("já trocou"), segunda.body());

        assertTrue(auditorias.countByUsuarioIdAndRecursoAndPermitidoTrueAndCriadaEmGreaterThanEqual(
                        usuario.getId(), AcessoService.RECURSO_TROCA_CERTAMES, Instant.EPOCH) >= 1,
                "a troca permitida precisa ficar auditada");
        assertTrue(auditorias.countByUsuarioIdAndRecursoAndPermitidoTrueAndCriadaEmGreaterThanEqual(
                        usuario.getId(), AcessoService.RECURSO_TROCA_CERTAMES, Instant.EPOCH) == 1,
                "não pode registrar duas trocas no mesmo ciclo");
    }

    @Test
    void freeContinuaSemEscopoEMasNaoTemTutor() throws Exception {
        HttpResponse<String> questoes = chamar("GET", "/api/questoes?quantidade=50", null);
        assertEquals(200, questoes.statusCode());
        assertEquals(24, mapper.readTree(questoes.body()).size(), "FREE vê a amostra completa");
        assertNotNull(mapper.readTree(chamar("GET", "/api/uso-tutor", null).body())
                .get("usado"));

        HttpResponse<String> chat = chamar("POST", "/api/chat", chat());
        assertEquals(403, chat.statusCode());
    }

    private void assinar(Usuario alvo, String plano, int dias, String... escolhidos) {
        Plano p = planos.findByCodigo(plano).orElseThrow();
        Assinatura assinatura = new Assinatura();
        assinatura.setUsuarioId(alvo.getId());
        assinatura.setPlanoId(p.getId());
        assinatura.setGateway("manual");
        assinatura.setStatus(StatusAssinatura.ATIVA);
        assinatura.setPeriodoInicio(Instant.now().minusSeconds(60));
        assinatura.setPeriodoFim(Instant.now().plusSeconds(dias * 24L * 3600));
        assinaturas.save(assinatura);
        for (String concurso : escolhidos) {
            certames.save(new AssinaturaCertame(assinatura.getId(), concurso));
        }
    }

    private static String chat() {
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
