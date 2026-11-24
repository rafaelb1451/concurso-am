package com.concurso.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RateLimiterTest {

    @Test
    void bloqueiaQuandoEstouraOLimiteDaJanela() {
        RateLimiter limiter = new RateLimiter();

        limiter.exigir("chat", 2);
        limiter.exigir("chat", 2);

        IllegalStateException erro = assertThrows(IllegalStateException.class,
                () -> limiter.exigir("chat", 2));
        assertTrue(erro.getMessage().contains("Limite de uso atingido"));
    }

    @Test
    void chavesDiferentesNaoCompartilhamOLimite() {
        RateLimiter limiter = new RateLimiter();

        limiter.exigir("chat", 1);

        assertDoesNotThrow(() -> limiter.exigir("importacao", 1));
    }
}
