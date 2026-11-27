package com.concurso.integration.payment;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Mercado Pago — assinatura recorrente pelo checkout hospedado ({@code /preapproval}).
 *
 * <p>O aluno paga na página do Mercado Pago; o acesso só é liberado pelo webhook, nunca pelo
 * retorno do navegador. O webhook chega em {@code /api/webhooks/mercadopago?token=...} e o
 * token configurado em {@code MP_WEBHOOK_TOKEN} é a única credencial — comparado em tempo
 * constante.</p>
 */
@Component
@Primary
public class MercadoPagoGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(MercadoPagoGateway.class);

    private final String accessToken;
    private final String webhookToken;
    private final String baseUrl;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public MercadoPagoGateway(
            @Value("${concurso.mercadopago.access-token:}") String accessToken,
            @Value("${concurso.mercadopago.webhook-token:}") String webhookToken,
            @Value("${concurso.mercadopago.base-url:https://api.mercadopago.com}") String baseUrl,
            ObjectMapper mapper) {
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.webhookToken = webhookToken == null ? "" : webhookToken.trim();
        this.baseUrl = baseUrl;
        this.mapper = mapper;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    }

    @Override
    public String id() {
        return "mercadopago";
    }

    @Override
    public boolean configurado() {
        return !accessToken.isEmpty();
    }

    // ---------------------------------------------------------------- checkout

    @Override
    public CheckoutCriado criarCheckout(DadosCheckout dados) {
        if (!configurado()) {
            throw new IllegalStateException("Pagamento nao configurado no servidor.");
        }

        boolean anual = "ANUAL".equalsIgnoreCase(dados.ciclo());
        Map<String, Object> autoRecurring = new LinkedHashMap<>();
        autoRecurring.put("frequency", anual ? 12 : 1);
        autoRecurring.put("frequency_type", "months");
        autoRecurring.put("transaction_amount", dados.valorCentavos() / 100.0);
        autoRecurring.put("currency_id", "BRL");

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("reason", "QB Concurso — " + dados.nomePlano());
        corpo.put("external_reference", dados.referenciaExterna());
        corpo.put("payer_email", dados.cliente().email());
        corpo.put("back_url", dados.urlSucesso());
        corpo.put("status", "pending");
        corpo.put("auto_recurring", autoRecurring);

        JsonNode resposta = chamar("POST", "/preapproval", corpo);
        String id = texto(resposta, "id");
        String url = primeiraNaoVazia(texto(resposta, "init_point"), texto(resposta, "sandbox_init_point"));
        if (id.isBlank() || url.isBlank()) {
            throw new IllegalStateException("O Mercado Pago nao devolveu o link do checkout.");
        }
        return new CheckoutCriado(id, url);
    }

    @Override
    public void cancelarAssinatura(String gatewaySubscriptionId) {
        if (!configurado() || gatewaySubscriptionId == null || gatewaySubscriptionId.isBlank()) {
            return;
        }
        try {
            Map<String, Object> corpo = new LinkedHashMap<>();
            corpo.put("status", "cancelled");
            chamar("PUT", "/preapproval/" + gatewaySubscriptionId, corpo);
        } catch (RuntimeException e) {
            // cancelar do nosso lado e' o que importa; o gateway pode recusar se ja' estiver cancelada
            log.warn("Mercado Pago recusou cancelar a assinatura {}: {}", gatewaySubscriptionId, e.getMessage());
        }
    }

    // ---------------------------------------------------------------- webhook

    @Override
    public boolean webhookValido(String tokenRecebido) {
        if (webhookToken.isEmpty()) {
            // sem token configurado nao ha' como validar: recusa sempre (fail closed)
            return false;
        }
        return MessageDigest.isEqual(
                webhookToken.getBytes(StandardCharsets.UTF_8),
                (tokenRecebido == null ? "" : tokenRecebido).getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public EventoWebhook traduzir(String corpoBruto) {
        try {
            JsonNode raiz = mapper.readTree(corpoBruto);
            String tipoNotificacao = texto(raiz, "type");
            String recursoId = raiz.path("data").path("id").asText("");
            if (tipoNotificacao.isBlank() || recursoId.isBlank()) {
                throw new IllegalArgumentException("Evento sem tipo ou recurso.");
            }

            String eventoId = tipoNotificacao + ":" + recursoId;
            String assinaturaId = "";
            String checkoutId = "";
            String referencia = "";
            Instant vencimento = null;
            boolean pago = false;
            String tipo;

            switch (tipoNotificacao) {
                case "subscription_preapproval" -> {
                    JsonNode pre = chamar("GET", "/preapproval/" + recursoId, null);
                    String status = texto(pre, "status");
                    referencia = texto(pre, "external_reference");
                    assinaturaId = recursoId;
                    checkoutId = recursoId;
                    vencimento = proximaCobranca(texto(pre, "next_payment_date"));
                    tipo = switch (status) {
                        case "authorized" -> "SUBSCRIPTION_AUTHORIZED";
                        case "cancelled" -> "SUBSCRIPTION_DELETED";
                        case "paused" -> "SUBSCRIPTION_INACTIVATED";
                        default -> "SUBSCRIPTION_UPDATED";
                    };
                    pago = "authorized".equals(status);
                }
                case "subscription_authorized_payment" -> {
                    JsonNode pag = chamar("GET", "/authorized_payments/" + recursoId, null);
                    String status = texto(pag, "status");
                    referencia = texto(pag, "external_reference");
                    assinaturaId = texto(pag, "preapproval_id");
                    vencimento = proximaCobranca(texto(pag, "debit_date"));
                    pago = "processed".equals(status) || "approved".equals(status);
                    tipo = pago ? "PAYMENT_CONFIRMED" : "PAYMENT_PENDING";
                }
                case "payment" -> {
                    JsonNode pag = chamar("GET", "/v1/payments/" + recursoId, null);
                    String status = texto(pag, "status");
                    referencia = texto(pag, "external_reference");
                    assinaturaId = texto(pag, "preapproval_id");
                    checkoutId = primeiraNaoVazia(texto(pag, "preapproval_id"), "");
                    vencimento = proximaCobranca(texto(pag, "date_of_expiration"));
                    pago = "approved".equals(status);
                    tipo = switch (status) {
                        case "approved" -> "PAYMENT_CONFIRMED";
                        case "rejected" -> "PAYMENT_REJECTED";
                        case "refunded", "charged_back" -> "PAYMENT_REFUNDED";
                        case "cancelled" -> "SUBSCRIPTION_DELETED";
                        default -> "PAYMENT_PENDING";
                    };
                }
                default -> {
                    tipo = tipoNotificacao.toUpperCase();
                }
            }

            return new EventoWebhook(eventoId, tipo, assinaturaId, checkoutId, referencia, vencimento, pago);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Webhook do Mercado Pago em formato inesperado.");
        }
    }

    // ---------------------------------------------------------------- HTTP

    private JsonNode chamar(String metodo, String caminho, Map<String, Object> corpo) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + caminho))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json");
            if (corpo == null) {
                builder.method(metodo, HttpRequest.BodyPublishers.noBody());
            } else {
                builder.method(metodo, HttpRequest.BodyPublishers.ofString(
                        mapper.writeValueAsString(corpo), StandardCharsets.UTF_8));
            }
            HttpResponse<String> resp = http.send(builder.build(),
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (resp.statusCode() >= 400) {
                log.warn("Mercado Pago {} {} respondeu {}: {}", metodo, caminho, resp.statusCode(),
                        resumir(resp.body()));
                throw new IllegalStateException("O gateway de pagamento recusou a operacao.");
            }
            return resp.body().isBlank() ? mapper.createObjectNode() : mapper.readTree(resp.body());
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Falha ao falar com o Mercado Pago em {} {}", metodo, caminho, e);
            throw new IllegalStateException("Nao foi possivel falar com o gateway de pagamento.");
        }
    }

    private static Instant proximaCobranca(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        try {
            // o Mercado Pago devolve ISO-8601 com offset (ex.: 2027-01-27T00:00:00.000-03:00)
            return java.time.OffsetDateTime.parse(texto).toInstant();
        } catch (Exception ignorado) {
            try {
                return LocalDateTime.parse(texto, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
                        .atZone(java.time.ZoneId.of("America/Sao_Paulo")).toInstant();
            } catch (Exception tambemIgnorado) {
                return null;
            }
        }
    }

    private static String texto(JsonNode no, String campo) {
        if (no == null) {
            return "";
        }
        return no.path(campo).asText("");
    }

    private static String primeiraNaoVazia(String... valores) {
        for (String v : valores) {
            if (v != null && !v.isBlank()) {
                return v;
            }
        }
        return "";
    }

    private static String resumir(String corpo) {
        if (corpo == null) {
            return "";
        }
        return corpo.length() > 300 ? corpo.substring(0, 300) + "..." : corpo;
    }
}
