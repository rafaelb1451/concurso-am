package com.concurso.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * IP do cliente para limites por origem.
 *
 * <p>A aplicacao roda atras do Caddy, que acrescenta o IP real ao fim do
 * {@code X-Forwarded-For}. Por isso usamos a <b>ultima</b> entrada (a que o proxy viu),
 * e nao a primeira, que o cliente pode forjar.</p>
 */
public final class ClienteIp {

    private ClienteIp() {
    }

    public static String de(HttpServletRequest request) {
        String encaminhado = request.getHeader("X-Forwarded-For");
        if (encaminhado != null && !encaminhado.isBlank()) {
            String[] partes = encaminhado.split(",");
            String ultimo = partes[partes.length - 1].strip();
            if (!ultimo.isEmpty() && ultimo.length() <= 45) {
                return ultimo;
            }
        }
        String direto = request.getRemoteAddr();
        return direto == null || direto.isBlank() ? "desconhecido" : direto;
    }
}
