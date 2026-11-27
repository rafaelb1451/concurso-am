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
 * Mercado Pago — pagamento pelo Checkout Pro (Pix ou cartão), liberado pelo webhook.
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
    private final String notificationUrl;
    private final String webhookSecret;
    private final String baseUrl;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public MercadoPagoGateway(
            @Value("${concurso.mercadopago.access-token:}") String accessToken,
            @Value("${concurso.mercadopago.webhook-token:}") String webhookToken,
            @Value("${concurso.mercadopago.notification-url:}") String notificationUrl,
            @Value("${concurso.mercadopago.webhook-secret:}") String webhookSecret,
            @Value("${concurso.mercadopago.base-url:https://api.mercadopago.com}") String baseUrl,
            ObjectMapper mapper) {
        this.accessToken = accessToken == null ? "" : accessToken.trim();
        this.webhookToken = webhookToken == null ? "" : webhookToken.trim();
        this.notificationUrl = notificationUrl == null ? "" : notificationUrl.trim();
        this.webhookSecret = webhookSecret == null ? "" : webhookSecret.trim();
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

        // Checkout Pro nos dois ciclos: aceita Pix e cartao e volta sozinho ao app.
        // (O preapproval do Mercado Pago so aceita cartao e travava no fluxo de pagamento.)
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("title", dados.nomePlano());
        item.put("quantity", 1);
        item.put("unit_price", dados.valorCentavos() / 100.0);
        item.put("currency_id", "BRL");

        Map<String, Object> payer = new LinkedHashMap<>();
        payer.put("email", dados.cliente().email());

        Map<String, Object> backUrls = new LinkedHashMap<>();
        backUrls.put("success", dados.urlSucesso());
        backUrls.put("failure", dados.urlCancelamento());
        backUrls.put("pending", dados.urlSucesso());

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("items", java.util.List.of(item));
        corpo.put("payer", payer);
        corpo.put("external_reference", dados.referenciaExterna());
        corpo.put("back_urls", backUrls);
        corpo.put("auto_return", "approved");
        if (!notificationUrl.isEmpty()) {
            // garante a notificacao mesmo se o webhook do painel nao estiver configurado
            corpo.put("notification_url", notificationUrl);
        }

        JsonNode resposta = chamar("POST", "/checkout/preferences", corpo);
        String id = texto(resposta, "id");
        String url = primeiraNaoVazia(texto(resposta, "init_point"), texto(resposta, "sandbox_init_point"));
        if (id.isBlank() || url.isBlank()) {
            throw new IllegalStateException("O Mercado Pago nao devolveu o link do checkout.");
        }
        return new CheckoutCriado(id, url);
    }

    @Override
    public void cancelarAssinatura(String gatewaySubscriptionId) {
        // Checkout Pro e' pagamento unico: nao existe renovacao no gateway para cancelar.
        log.info("Pagamento unico (Checkout Pro); nada a cancelar no Mercado Pago.");
    }

    // ---------------------------------------------------------------- webhook

    @Override
    public boolean webhookValido(WebhookRequest req) {
        // Fail closed: sem a assinatura secreta nao ha' como provar autenticidade.
        // O token na URL deixou de ser aceito (ele vazava em log de acesso).
        if (webhookSecret.isEmpty()) {
            log.error("MP_WEBHOOK_SECRET ausente: webhook do Mercado Pago recusado (fail closed).");
            return false;
        }
        try {
            String ts = parametro(req.signature(), "ts");
            String v1 = parametro(req.signature(), "v1");
            if (ts.isEmpty() || v1.isEmpty()) {
                return false;
            }
            String dataId = "";
            try {
                JsonNode raiz = mapper.readTree(req.body());
                dataId = raiz.path("data").path("id").asText("");
            } catch (RuntimeException ignorado) {
                // corpo sem JSON valido: segue com id vazio (a assinatura cobre)
            }
            String requestId = req.requestId() == null ? "" : req.requestId();
            String manifesto = "id:" + dataId + ";request-id:" + requestId + ";ts:" + ts + ";";
            String esperado = hmacHex(manifesto);
            return MessageDigest.isEqual(
                    esperado.getBytes(StandardCharsets.UTF_8),
                    v1.getBytes(StandardCharsets.UTF_8));
        } catch (RuntimeException e) {
            log.warn("Webhook do Mercado Pago com assinatura invalida: {}", e.getMessage());
            return false;
        }
    }

    private String hmacHex(String texto) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(texto.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao calcular HMAC", e);
        }
    }

    private static String parametro(String cabecalho, String chave) {
        if (cabecalho == null || cabecalho.isBlank()) {
            return "";
        }
        for (String parte : cabecalho.split(",")) {
            int igual = parte.indexOf('=');
            if (igual > 0 && parte.substring(0, igual).trim().equalsIgnoreCase(chave)) {
                return parte.substring(igual + 1).trim();
            }
        }
        return "";
    }

    /**
     * @deprecated o Mercado Pago só é aceito com HMAC ({@code x-signature}). O token de URL
     *     foi removido por vazar em log de acesso e por não provar autenticidade.
     */
    @Override
    @Deprecated
    public boolean webhookValido(String tokenRecebido) {
        return false;
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
            long valorCentavos = -1L;
            String moeda = "";
            String tipo;

            switch (tipoNotificacao) {
                case "subscription_preapproval" -> {
                    JsonNode pre = chamar("GET", "/preapproval/" + recursoId, null);
                    String status = texto(pre, "status");
                    referencia = texto(pre, "external_reference");
                    assinaturaId = recursoId;
                    checkoutId = recursoId;
                    vencimento = proximaCobranca(texto(pre, "next_payment_date"));
                    valorCentavos = centavos(pre.path("auto_recurring").path("transaction_amount"));
                    moeda = texto(pre.path("auto_recurring"), "currency_id");
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
                    valorCentavos = centavos(pag.path("transaction_amount"));
                    moeda = texto(pag, "currency_id");
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
                    valorCentavos = centavos(pag.path("transaction_amount"));
                    moeda = texto(pag, "currency_id");
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

            return new EventoWebhook(eventoId, tipo, assinaturaId, checkoutId, referencia,
                    vencimento, pago, valorCentavos, moeda);
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

    /** Converte o valor monetario do JSON para centavos; -1 quando ausente ou invalido. */
    private static long centavos(JsonNode no) {
        if (no == null || no.isMissingNode() || no.isNull()) {
            return -1L;
        }
        try {
            return new java.math.BigDecimal(no.asText().trim())
                    .movePointRight(2)
                    .setScale(0, java.math.RoundingMode.HALF_UP)
                    .longValueExact();
        } catch (RuntimeException e) {
            return -1L;
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
