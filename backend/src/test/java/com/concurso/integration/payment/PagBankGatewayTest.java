package com.concurso.integration.payment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import static org.assertj.core.api.Assertions.assertThat;

/** Assinatura e tradução dos eventos do PagBank. */
class PagBankGatewayTest {

    private static PagBankGateway gateway(String token) {
        return new PagBankGateway(token, "https://api.pagseguro.com",
                "https://qb.test/api/webhooks/pagbank", JsonMapper.builder().build());
    }

    private static String sha256(String texto) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        StringBuilder sb = new StringBuilder();
        for (byte b : digest.digest(texto.getBytes(StandardCharsets.UTF_8))) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Test
    @DisplayName("assinatura x-authenticity-token válida é aceita (SHA-256 de token-payload)")
    void assinaturaValida() throws Exception {
        String token = "token-pagbank";
        String corpo = "{\"id\":\"CHAR_1\",\"status\":\"PAID\"}";
        String assinatura = sha256(token + "-" + corpo);

        var req = new PaymentGateway.WebhookRequest(null, assinatura, null, corpo);

        assertThat(gateway(token).webhookValido(req)).isTrue();
    }

    @Test
    @DisplayName("assinatura inválida é recusada")
    void assinaturaInvalida() {
        var req = new PaymentGateway.WebhookRequest(null, "deadbeef", null, "{}");
        assertThat(gateway("token-pagbank").webhookValido(req)).isFalse();
    }

    @Test
    @DisplayName("sem token configurado o webhook falha fechado")
    void semTokenRecusa() throws Exception {
        String corpo = "{\"id\":\"CHAR_1\"}";
        var req = new PaymentGateway.WebhookRequest(null,
                sha256("-" + corpo), null, corpo);
        assertThat(gateway("").webhookValido(req)).isFalse();
    }

    @Test
    @DisplayName("cobrança PAID libera e informa valor/moeda/referência")
    void traduzPagamentoAprovado() {
        String corpo = """
                {"id":"CHAR_1","status":"PAID","reference_id":"usuario:7:plano:PRO_MENSAL",
                 "amount":{"value":2990,"currency":"BRL"}}
                """;

        PaymentGateway.EventoWebhook evento = gateway("t").traduzir(corpo);

        assertThat(evento.id()).isEqualTo("CHAR_1");
        assertThat(evento.tipo()).isEqualTo("PAYMENT_CONFIRMED");
        assertThat(evento.pago()).isTrue();
        assertThat(evento.valorCentavos()).isEqualTo(2990);
        assertThat(evento.moeda()).isEqualTo("BRL");
        assertThat(evento.referenciaExterna()).isEqualTo("usuario:7:plano:PRO_MENSAL");
    }

    @Test
    @DisplayName("estorno é traduzido como PAYMENT_REFUNDED")
    void traduzEstorno() {
        String corpo = "{\"id\":\"CHAR_2\",\"status\":\"REFUNDED\",\"amount\":{\"value\":2990,\"currency\":\"BRL\"}}";
        PaymentGateway.EventoWebhook evento = gateway("t").traduzir(corpo);

        assertThat(evento.tipo()).isEqualTo("PAYMENT_REFUNDED");
        assertThat(evento.pago()).isFalse();
    }

    @Test
    @DisplayName("recusa é traduzida como PAYMENT_REJECTED")
    void traduzRecusa() {
        String corpo = "{\"id\":\"CHAR_3\",\"status\":\"DECLINED\"}";
        PaymentGateway.EventoWebhook evento = gateway("t").traduzir(corpo);

        assertThat(evento.tipo()).isEqualTo("PAYMENT_REJECTED");
        assertThat(evento.pago()).isFalse();
    }
}
