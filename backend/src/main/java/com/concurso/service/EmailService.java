package com.concurso.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Envio transacional por SMTP (e-mail profissional da UOL).
 *
 * <p>Sem credenciais SMTP o envio fica pausado e a conta nasce verificada; nesse modo o
 * link é apenas registrado no log para permitir testar o fluxo em desenvolvimento.</p>
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${concurso.email.remetente:}")
    private String remetente;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.username:}")
    private String smtpUsuario;

    @Value("${CONCURSO_APP_URL:http://localhost:5173}")
    private String appUrl;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderProvider = mailSenderProvider;
    }

    public boolean configurado() {
        return preenchido(smtpHost) && preenchido(smtpUsuario) && preenchido(remetente)
                && mailSenderProvider.getIfAvailable() != null;
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
            log.info("SMTP não configurado; e-mail '{}' para {} não enviado. Link: {}", subject, to, link);
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

        try {
            JavaMailSender sender = mailSenderProvider.getIfAvailable();
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom("QB Concurso <" + remetente + ">");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            sender.send(message);
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail por SMTP para {}", to, e);
            throw new IllegalStateException("Não foi possível enviar o e-mail.");
        }
    }

    private static boolean preenchido(String valor) {
        return valor != null && !valor.isBlank();
    }
}
