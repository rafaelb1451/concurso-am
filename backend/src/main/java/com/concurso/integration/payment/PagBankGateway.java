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
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * PagBank (PagSeguro) — Checkout hospedado (PIX e cartão), liberado pelo webhook.
 *
 * <p>O aluno paga na página do PagBank; o acesso só é liberado pelo webhook, nunca pelo retorno
 * do navegador. A autenticidade do webhook vem do header {@code x-authenticity-token}, que é
 * {@code SHA-256(token + "-" + corpoBruto)} — comparado em tempo constante.</p>
 */
@Component
@Primary
public class PagBankGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(PagBankGateway.class);

    private final String token;
    private final String baseUrl;
    private final String webhookUrl;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public PagBankGateway(
            @Value("${concurso.pagbank.token:}") String token,
            @Value("${concurso.pagbank.base-url:https://api.pagseguro.com}") String baseUrl,
            @Value("${concurso.pagbank.webhook-url:}") String webhookUrl,
            ObjectMapper mapper) {
        this.token = token == null ? "" : token.trim();
        this.baseUrl = baseUrl;
        this.webhookUrl = webhookUrl == null ? "" : webhookUrl.trim();
        this.mapper = mapper;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        if (this.token.isEmpty()) {
            log.warn("PAGBANK_TOKEN ausente: o checkout do PagBank nao sera criado.");
        }
    }

    @Override
    public String id() {
        return "pagbank";
    }

    @Override
    public boolean configurado() {
        return !token.isEmpty();
    }

    // ---------------------------------------------------------------- checkout

    @Override
    public CheckoutCriado criarCheckout(DadosCheckout dados) {
        if (!configurado()) {
            throw new IllegalStateException("Pagamento nao configurado no servidor.");
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("reference_id", dados.codigoPlano());
        item.put("name", dados.nomePlano());
        item.put("quantity", 1);
        item.put("unit_amount", dados.valorCentavos());

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("reference_id", dados.referenciaExterna());
        corpo.put("items", List.of(item));
        // deixa o comprador preencher os dados na pagina do PagBank
        corpo.put("customer_modifiable", true);
        corpo.put("payment_methods", List.of(
                Map.of("type", "PIX"),
                Map.of("type", "CREDIT_CARD")));
        corpo.put("redirect_url", dados.urlSucesso());
        corpo.put("return_url", dados.urlSucesso());
        if (!webhookUrl.isEmpty()) {
            corpo.put("notification_urls", List.of(webhookUrl));
            corpo.put("payment_notification_urls", List.of(webhookUrl));
        }

        JsonNode resposta = chamar("POST", "/checkouts", corpo);
        String checkoutId = texto(resposta, "id");
        String url = linkPagamento(resposta);
        if (checkoutId.isBlank() || url.isBlank()) {
            throw new IllegalStateException("O PagBank nao devolveu o link do checkout.");
        }
        return new CheckoutCriado(checkoutId, url);
    }

    @Override
    public void cancelarAssinatura(String gatewaySubscriptionId) {
        // Checkout e' pagamento unico: nao existe renovacao no gateway para cancelar.
        log.info("Pagamento unico (Checkout PagBank); nada a cancelar.");
    }

    // ---------------------------------------------------------------- webhook

    @Override
    public boolean webhookValido(String tokenRecebido) {
        return false;
    }

    @Override
    public boolean webhookValido(WebhookRequest req) {
        // Fail closed: sem token da conta nao ha' como provar autenticidade.
        if (token.isEmpty()) {
            log.error("PAGBANK_TOKEN ausente: webhook do PagBank recusado (fail closed).");
            return false;
        }
        String assinatura = req.signature();
        if (assinatura == null || assinatura.isBlank()) {
            return false;
        }
        String esperado = sha256Hex(token + "-" + (req.body() == null ? "" : req.body()));
        return MessageDigest.isEqual(
                esperado.getBytes(StandardCharsets.UTF_8),
                assinatura.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256Hex(String texto) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(texto.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao calcular assinatura", e);
        }
    }

    @Override
    public EventoWebhook traduzir(String corpoBruto) {
        try {
            JsonNode raiz = mapper.readTree(corpoBruto);
            String id = texto(raiz, "id");
            if (id.isBlank()) {
                throw new IllegalArgumentException("Evento sem id.");
            }
            String status = texto(raiz, "status").toUpperCase();
            String referencia = primeiraNaoVazia(
                    texto(raiz, "reference_id"),
                    texto(raiz.path("metadata"), "reference_id"),
                    texto(raiz.path("metadata"), "referencia"));
            long valorCentavos = raiz.path("amount").path("value").asLong(-1L);
            String moeda = texto(raiz.path("amount"), "currency");

            boolean pago = "PAID".equals(status);
            String tipo = switch (status) {
                case "PAID" -> "PAYMENT_CONFIRMED";
                case "REFUNDED", "CHARGED_BACK" -> "PAYMENT_REFUNDED";
                case "DECLINED" -> "PAYMENT_REJECTED";
                case "CANCELED" -> "PAYMENT_EXPIRED";
                default -> "PAYMENT_PENDING";
            };

            return new EventoWebhook(id, tipo, "", "", referencia, vencimento(raiz, status),
                    pago, valorCentavos, moeda);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Webhook do PagBank em formato inesperado.");
        }
    }

    private static Instant vencimento(JsonNode raiz, String status) {
        for (String campo : List.of("expiration_date", "due_date")) {
            String valor = texto(raiz, campo);
            if (valor.isBlank()) {
                valor = texto(raiz.path("payment_method").path("boleto"), campo);
            }
            if (!valor.isBlank()) {
                try {
                    return OffsetDateTime.parse(valor).toInstant();
                } catch (RuntimeException ignorado) {
                    // formato inesperado: segue sem vencimento
                }
            }
        }
        return null;
    }

    // ---------------------------------------------------------------- HTTP

    private JsonNode chamar(String metodo, String caminho, Map<String, Object> corpo) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + caminho))
                    .timeout(Duration.ofSeconds(25))
                    .header("Authorization", "Bearer " + token)
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
                log.warn("PagBank {} {} respondeu {}: {}", metodo, caminho, resp.statusCode(),
                        resumir(resp.body()));
                throw new IllegalStateException("O gateway de pagamento recusou a operacao.");
            }
            return resp.body().isBlank() ? mapper.createObjectNode() : mapper.readTree(resp.body());
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Falha ao falar com o PagBank em {} {}", metodo, caminho, e);
            throw new IllegalStateException("Nao foi possivel falar com o gateway de pagamento.");
        }
    }

    private static String linkPagamento(JsonNode resposta) {
        for (JsonNode link : resposta.path("links")) {
            if ("PAY".equalsIgnoreCase(texto(link, "rel"))) {
                return texto(link, "href");
            }
        }
        return "";
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
