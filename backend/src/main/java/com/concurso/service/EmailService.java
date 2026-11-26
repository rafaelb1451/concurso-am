package com.concurso.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Envio transacional via Resend. Nenhuma chave fica no banco ou no repositorio. */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String ENDPOINT = "https://api.resend.com/emails";

    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Value("${RESEND_API_KEY:}")
    private String apiKey;

    @Value("${RESEND_FROM_EMAIL:onboarding@resend.dev}")
    private String fromEmail;

    @Value("${CONCURSO_APP_URL:http://localhost:5173}")
    private String appUrl;

    public EmailService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public boolean configurado() {
        return apiKey != null && !apiKey.isBlank();
    }

    public void verificarEmail(String email, String nome, String token) {
        enviar(email, "Confirme seu e-mail — QB Concurso",
                "Olá, " + nome + ".", "Para confirmar sua conta, use o link abaixo:",
                appUrl + "/?verificar-email=" + token);
    }

    public void resetarSenha(String email, String nome, String token) {
        enviar(email, "Redefinição de senha — QB Concurso",
                "Olá, " + nome + ".", "Use o link abaixo para criar uma nova senha:",
                appUrl + "/?redefinir-senha=" + token);
    }

    public void alterarEmail(String novoEmail, String nome, String token) {
        enviar(novoEmail, "Confirme seu novo e-mail — QB Concurso",
                "Olá, " + nome + ".", "Confirme este novo e-mail para sua conta:",
                appUrl + "/?alterar-email=" + token);
    }

    private void enviar(String to, String subject, String titulo, String texto, String link) {
        if (!configurado()) {
            // Sem Resend (dev/teste local): registra o link para permitir o fluxo de verificacao.
            log.info("Resend não configurado; e-mail '{}' para {} não enviado. Link: {}", subject, to, link);
            return;
        }

        String tituloEscapado = HtmlUtils.htmlEscape(titulo);
        String textoEscapado = HtmlUtils.htmlEscape(texto);

        String html = """
                <!doctype html><html><body style="margin:0;background:#f7f6f3;font-family:Arial,sans-serif">
                <div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:28px">
                <h1 style="font-size:20px;color:#223453;margin:0 0 16px">""" + subject + "</h1>" +
                "<p style=\"color:#292524\">" + tituloEscapado + "</p>" +
                "<p style=\"color:#57534e\">" + textoEscapado + "</p>" +
                "<p><a href=\"" + link + "\" style=\"display:inline-block;background:#2a4067;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold\">Continuar</a></p>" +
                "<p style=\"color:#78716c;font-size:12px\">Se você não solicitou esta mensagem, ignore-a.</p>" +
                "</div></body></html>";

        Map<String, Object> corpo = Map.of(
                "from", "QB Concurso <" + fromEmail + ">",
                "to", List.of(to),
                "subject", subject,
                "html", html);

        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(ENDPOINT))
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            mapper.writeValueAsString(corpo), StandardCharsets.UTF_8))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.error("Resend respondeu {} ao enviar e-mail para {}", response.statusCode(), to);
                throw new IllegalStateException("Não foi possível enviar o e-mail.");
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail pelo Resend", e);
            throw new IllegalStateException("Não foi possível enviar o e-mail.");
        }
    }
}
