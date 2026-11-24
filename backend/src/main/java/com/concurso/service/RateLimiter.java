package com.concurso.service;

import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limitador de uso simples, em memoria, por chave logica (endpoint).
 *
 * <p>Existe para impedir que a API do tutor seja usada como torneira: sem isso, um loop de
 * requisicoes consome o saldo da conta da DeepSeek em minutos. E' um limite global do processo —
 * a aplicacao e' de uso pessoal, entao nao ha necessidade de limite por usuario.</p>
 */
@Component
public class RateLimiter {

    private static final long JANELA_MS = 60_000;

    private final Map<String, Deque<Long>> janelas = new ConcurrentHashMap<>();

    /** Lanca excecao de estado quando a chave estoura o limite na janela de um minuto. */
    public void exigir(String chave, int maxPorMinuto) {
        long agora = System.currentTimeMillis();
        Deque<Long> fila = janelas.computeIfAbsent(chave, k -> new ArrayDeque<>());
        synchronized (fila) {
            while (!fila.isEmpty() && agora - fila.peekFirst() > JANELA_MS) {
                fila.pollFirst();
            }
            if (fila.size() >= maxPorMinuto) {
                throw new IllegalStateException(
                        "Limite de uso atingido (" + maxPorMinuto + "/minuto). Aguarde um minuto e tente de novo.");
            }
            fila.addLast(agora);
        }
    }
}
