package com.concurso.integration.payment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

/** Validação da assinatura HMAC (x-signature) do webhook do Mercado Pago. */
class MercadoPagoGatewayTest {

    private static MercadoPagoGateway gateway(String segredo) {
        return new MercadoPagoGateway("token", "", "", segredo,
                "https://api.mercadopago.com", JsonMapper.builder().build());
    }

    private static String hmac(String texto, String segredo) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(segredo.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        StringBuilder sb = new StringBuilder();
        for (byte b : mac.doFinal(texto.getBytes(StandardCharsets.UTF_8))) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Test
    @DisplayName("assinatura HMAC válida é aceita")
    void assinaturaValida() throws Exception {
        String corpo = "{\"type\":\"payment\",\"data\":{\"id\":\"123\"}}";
        String ts = "1700000000";
        String requisicao = "req-1";
        String manifesto = "id:123;request-id:" + requisicao + ";ts:" + ts + ";";
        String v1 = hmac(manifesto, "segredo-do-painel");

        var req = new PaymentGateway.WebhookRequest(null,
                "ts=" + ts + ",v1=" + v1, requisicao, corpo);

        assertThat(gateway("segredo-do-painel").webhookValido(req)).isTrue();
    }

    @Test
    @DisplayName("assinatura HMAC errada é rejeitada")
    void assinaturaErrada() {
        String corpo = "{\"type\":\"payment\",\"data\":{\"id\":\"123\"}}";
        var req = new PaymentGateway.WebhookRequest(null,
                "ts=1700000000,v1=deadbeef", "req-1", corpo);

        assertThat(gateway("segredo-do-painel").webhookValido(req)).isFalse();
    }

    @Test
    @DisplayName("sem assinatura/secreto cai no token de fallback")
    void fallbackToken() {
        var req = new PaymentGateway.WebhookRequest("meu-token", null, null, "{}");
        var semSegredo = new MercadoPagoGateway("token", "meu-token", "", "",
                "https://api.mercadopago.com", JsonMapper.builder().build());

        assertThat(semSegredo.webhookValido(req)).isTrue();
    }
}
