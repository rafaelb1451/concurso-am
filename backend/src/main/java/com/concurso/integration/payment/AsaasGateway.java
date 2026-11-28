package com.concurso.integration.payment;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Implementação do Asaas (checkout hospedado + webhook).
 *
 * <p>Regras que o próprio Asaas impõe, descobertas testando o sandbox (ver
 * {@code docs/integracao-asaas.md}): assinatura recorrente só com cartão de crédito; Pix exige
 * chave Pix cadastrada; o {@code customerData} do checkout precisa de telefone e endereço
 * completos; a URL volta em {@code link}; e as URLs de callback precisam ser HTTPS público.</p>
 */
@Component
@Primary
public class AsaasGateway implements PaymentGateway {

    private static final Logger log = LoggerFactory.getLogger(AsaasGateway.class);

    private final String chaveFixa;
    private final String arquivoChave;
    private final String baseUrl;
    private final String tokenWebhook;
    private final ObjectMapper mapper;
    private final HttpClient http;

    public AsaasGateway(
            @Value("${concurso.asaas.api-key:}") String chaveFixa,
            @Value("${concurso.asaas.chave-arquivo:}") String arquivoChave,
            @Value("${concurso.asaas.base-url:https://api-sandbox.asaas.com/v3}") String baseUrl,
            @Value("${concurso.asaas.webhook-token:}") String tokenWebhook,
            ObjectMapper mapper) {
        this.chaveFixa = chaveFixa == null ? "" : chaveFixa.trim();
        this.arquivoChave = arquivoChave == null ? "" : arquivoChave.trim();
        this.baseUrl = baseUrl;
        this.tokenWebhook = tokenWebhook == null ? "" : tokenWebhook;
        this.mapper = mapper;
        this.http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();
    }

    @Override
    public String id() {
        return "asaas";
    }

    @Override
    public boolean configurado() {
        try {
            return !chave().isEmpty();
        } catch (Exception e) {
            return false;
        }
    }

    private String chave() {
        if (!chaveFixa.isEmpty()) {
            return chaveFixa;
        }
        if (!arquivoChave.isEmpty() && Files.exists(Path.of(arquivoChave))) {
            try {
                return Files.readString(Path.of(arquivoChave), StandardCharsets.UTF_8).trim();
            } catch (IOException e) {
                log.warn("Nao consegui ler a chave do Asaas em {}", arquivoChave);
            }
        }
        return "";
    }

    // ---------------------------------------------------------------- checkout

    @Override
    public CheckoutCriado criarCheckout(DadosCheckout dados) {
        if (!configurado()) {
            throw new IllegalStateException("Pagamento nao configurado no servidor.");
        }

        Map<String, Object> cliente = new LinkedHashMap<>();
        cliente.put("name", dados.cliente().nome());
        cliente.put("email", dados.cliente().email());
        cliente.put("cpfCnpj", apenasDigitos(dados.cliente().cpfCnpj()));
        cliente.put("phoneNumber", apenasDigitos(dados.cliente().telefone()));
        cliente.put("postalCode", apenasDigitos(dados.cliente().cep()));
        cliente.put("address", dados.cliente().endereco());
        cliente.put("addressNumber", dados.cliente().numero());
        cliente.put("province", dados.cliente().bairro());

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("name", dados.nomePlano());
        item.put("quantity", 1);
        item.put("value", dados.valorCentavos() / 100.0);

        Map<String, Object> callback = new LinkedHashMap<>();
        callback.put("successUrl", dados.urlSucesso());
        callback.put("cancelUrl", dados.urlCancelamento());

        Map<String, Object> corpo = new LinkedHashMap<>();
        // assinatura recorrente no Asaas: somente cartao de credito
        corpo.put("billingTypes", List.of("CREDIT_CARD"));
        corpo.put("chargeTypes", List.of("RECURRENT"));
        corpo.put("minutesToExpire", 1440);
        corpo.put("externalReference", dados.referenciaExterna());
        corpo.put("callback", callback);
        corpo.put("items", List.of(item));
        corpo.put("customerData", cliente);

        Map<String, Object> assinatura = new LinkedHashMap<>();
        assinatura.put("cycle", "ANUAL".equalsIgnoreCase(dados.ciclo()) ? "YEARLY" : "MONTHLY");
        assinatura.put("nextDueDate", LocalDate.now().plusDays(1).format(DateTimeFormatter.ISO_LOCAL_DATE));
        corpo.put("subscription", assinatura);

        JsonNode resposta = chamar("POST", "/checkouts", corpo);
        String id = texto(resposta, "id");
        // o Asaas devolve a URL no campo "link"
        String url = texto(resposta, "link");
        if (url.isBlank()) {
            url = texto(resposta, "url");
        }
        if (id.isBlank() || url.isBlank()) {
            throw new IllegalStateException("O Asaas nao devolveu o link do checkout.");
        }
        return new CheckoutCriado(id, url);
    }

    @Override
    public void cancelarAssinatura(String gatewaySubscriptionId) {
        if (!configurado() || gatewaySubscriptionId == null || gatewaySubscriptionId.isBlank()) {
            return;
        }
        try {
            chamar("DELETE", "/subscriptions/" + gatewaySubscriptionId, null);
        } catch (RuntimeException e) {
            // cancelar do nosso lado e' o que importa; o gateway pode recusar se ja' estiver cancelada
            log.warn("Asaas recusou cancelar a assinatura {}: {}", gatewaySubscriptionId, e.getMessage());
        }
    }

    // ---------------------------------------------------------------- webhook

    @Override
    public boolean webhookValido(String tokenRecebido) {
        if (tokenWebhook.isEmpty()) {
            // sem token configurado nao ha' como validar: recusa sempre (fail closed)
            return false;
        }
        return MessageDigest.isEqual(
                tokenWebhook.getBytes(StandardCharsets.UTF_8),
                (tokenRecebido == null ? "" : tokenRecebido).getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public EventoWebhook traduzir(String corpoBruto) {
        try {
            JsonNode raiz = mapper.readTree(corpoBruto);
            String id = texto(raiz, "id");
            String tipo = texto(raiz, "event");
            if (id.isBlank() || tipo.isBlank()) {
                throw new IllegalArgumentException("Evento sem id ou tipo.");
            }

            JsonNode pagamento = raiz.path("payment");
            JsonNode assinatura = raiz.path("subscription");

            String assinaturaId = primeiraNaoVazia(
                    pagamento.path("subscription").asText(""),
                    assinatura.path("id").asText(""));
            String checkoutId = primeiraNaoVazia(
                    raiz.path("checkout").path("id").asText(""),
                    pagamento.path("checkoutSession").asText(""));
            String referencia = primeiraNaoVazia(
                    pagamento.path("externalReference").asText(""),
                    assinatura.path("externalReference").asText(""),
                    raiz.path("externalReference").asText(""));

            Instant vencimento = null;
            String venc = pagamento.path("dueDate").asText("");
            if (!venc.isBlank()) {
                try {
                    vencimento = LocalDate.parse(venc).atStartOfDay(java.time.ZoneOffset.UTC).toInstant();
                } catch (Exception ignorado) {
                    // data em formato inesperado nao deve derrubar o webhook
                }
            }

            boolean pago = tipo.equals("PAYMENT_CONFIRMED")
                    || tipo.equals("PAYMENT_RECEIVED")
                    || tipo.equals("CHECKOUT_PAID");

            return new EventoWebhook(id, tipo, assinaturaId, checkoutId, referencia, vencimento, pago);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Webhook do Asaas em formato inesperado.");
        }
    }

    // ---------------------------------------------------------------- HTTP

    private JsonNode chamar(String metodo, String caminho, Map<String, Object> corpo) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + caminho))
                    .timeout(Duration.ofSeconds(20))
                    .header("access_token", chave())
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
                log.warn("Asaas {} {} respondeu {}: {}", metodo, caminho, resp.statusCode(),
                        resumir(resp.body()));
                throw new IllegalStateException("O gateway de pagamento recusou a operacao.");
            }
            return resp.body().isBlank() ? mapper.createObjectNode() : mapper.readTree(resp.body());
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Falha ao falar com o Asaas em {} {}", metodo, caminho, e);
            throw new IllegalStateException("Nao foi possivel falar com o gateway de pagamento.");
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

    private static String apenasDigitos(String valor) {
        if (valor == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (char c : valor.toCharArray()) {
            if (Character.isDigit(c)) {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private static String resumir(String corpo) {
        if (corpo == null) {
            return "";
        }
        return corpo.length() > 300 ? corpo.substring(0, 300) + "..." : corpo;
    }
}
