package com.concurso.service;

import com.concurso.repo.TutorCacheRepository;
import com.concurso.web.Dtos;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Cache do tutor contra H2 real: hit nao chama o provedor, miss grava, a chave e' estavel e duas
 * gravacoes concorrentes da mesma chave nao derrubam a requisicao.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:tutor-cache;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "concurso.seed.arquivo=questoes.json",
        "concurso.seed.extra-arquivo=",
        "concurso.materiais.arquivo="
})
class TutorCacheIntegrationTest {

    @Autowired
    private TutorCacheService cache;

    @Autowired
    private TutorCacheRepository caches;

    @MockitoBean
    private DeepSeekService tutor;

    @BeforeEach
    void limpar() {
        caches.deleteAll();
        reset(tutor);
    }

    @Test
    void hitNaoChamaOProvedorEIncrementaAcessos() {
        when(tutor.conversar(any(), any())).thenReturn("Resposta cacheada.");
        List<Dtos.ChatMensagem> mensagens = mensagens();
        Dtos.ContextoQuestao contexto = contexto("Direito Penal");

        assertEquals("Resposta cacheada.", cache.conversar(1L, mensagens, contexto));
        // Outro usuario, mesma duvida: a chave nao carrega dado do usuario.
        assertEquals("Resposta cacheada.", cache.conversar(2L, mensagens, contexto));

        verify(tutor, times(1)).conversar(any(), any());
        assertEquals(1, caches.count());
        assertEquals(1, caches.findByChave(cache.chave(mensagens, contexto)).orElseThrow().getAcessos());
    }

    @Test
    void missChamaOProvedorEGravaAResposta() {
        when(tutor.conversar(any(), any())).thenReturn("Resposta nova.");
        List<Dtos.ChatMensagem> mensagens = mensagens();
        Dtos.ContextoQuestao contexto = contexto("Direito Constitucional");

        assertEquals("Resposta nova.", cache.conversar(7L, mensagens, contexto));

        verify(tutor, times(1)).conversar(any(), any());
        assertEquals("Resposta nova.",
                caches.findByChave(cache.chave(mensagens, contexto)).orElseThrow().getResposta());
    }

    @Test
    void respostaVaziaNaoEhCacheada() {
        when(tutor.conversar(any(), any())).thenReturn("   ");

        cache.conversar(7L, mensagens(), contexto("Direito Penal"));

        assertEquals(0, caches.count());
    }

    @Test
    void chaveEstavelParaMesmaEntradaComEspacosDiferentes() {
        Dtos.ContextoQuestao primeiro = contexto("Direito Penal");
        Dtos.ContextoQuestao segundo = new Dtos.ContextoQuestao(
                "  Direito Penal  ", " Aplicação da lei penal ", " Enunciado de teste. ",
                List.of(" Alternativa A ", "Alternativa B"), " B ", " A ", false,
                " Fundamento. ", " Explicação. ");

        String chave1 = cache.chave(
                List.of(new Dtos.ChatMensagem("user", "  Explique a alternativa B.  ")), primeiro);
        String chave2 = cache.chave(
                List.of(new Dtos.ChatMensagem("user", "Explique a alternativa B.")), segundo);

        assertEquals(chave1, chave2);
        assertTrue(chave1.matches("[0-9a-f]{64}"), "chave deve ser SHA-256 em hex");
    }

    @Test
    void chaveDiferenteParaContextoDiferente() {
        String chave1 = cache.chave(mensagens(), contexto("Direito Penal"));
        String chave2 = cache.chave(mensagens(), contexto("Direito Administrativo"));

        assertNotEquals(chave1, chave2);
    }

    @Test
    void duasGravacoesConcorrentesDaMesmaChaveNaoQuebram() throws Exception {
        CyclicBarrier barreira = new CyclicBarrier(2);
        when(tutor.conversar(any(), any())).thenAnswer(invocacao -> {
            barreira.await(5, TimeUnit.SECONDS);
            return "Resposta concorrente.";
        });
        List<Dtos.ChatMensagem> mensagens = mensagens();
        Dtos.ContextoQuestao contexto = contexto("Língua Portuguesa");

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Callable<String> tarefa = () -> cache.conversar(9L, mensagens, contexto);
            Future<String> primeira = pool.submit(tarefa);
            Future<String> segunda = pool.submit(tarefa);

            assertEquals("Resposta concorrente.", primeira.get(15, TimeUnit.SECONDS));
            assertEquals("Resposta concorrente.", segunda.get(15, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }

        assertEquals(1, caches.count(), "a unique da chave deve manter uma unica linha");
        verify(tutor, times(2)).conversar(any(), any());
    }

    private static List<Dtos.ChatMensagem> mensagens() {
        return List.of(new Dtos.ChatMensagem("user", "Explique a alternativa B."));
    }

    private static Dtos.ContextoQuestao contexto(String materia) {
        return new Dtos.ContextoQuestao(
                materia, "Aplicação da lei penal", "Enunciado de teste.",
                List.of("Alternativa A", "Alternativa B"), "B", "A", false,
                "Fundamento.", "Explicação.");
    }
}
