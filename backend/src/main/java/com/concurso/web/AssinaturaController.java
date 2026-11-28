package com.concurso.web;

import com.concurso.domain.Assinatura;
import com.concurso.domain.Plano;
import com.concurso.domain.StatusAssinatura;
import com.concurso.domain.Usuario;
import com.concurso.integration.payment.PaymentGateway;
import com.concurso.repo.PlanoRepository;
import com.concurso.repo.UsuarioRepository;
import com.concurso.service.AcessoService;
import com.concurso.service.RateLimiter;
import com.concurso.service.AssinaturaService;
import com.concurso.service.AuthException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/** Planos, assinatura do aluno e webhook do gateway. */
@RestController
@RequestMapping("/api")
public class AssinaturaController {

    private final AssinaturaService assinaturas;
    private final AcessoService acesso;
    private final PlanoRepository planos;
    private final UsuarioRepository usuarios;
    private final RateLimiter limiter;

    public AssinaturaController(AssinaturaService assinaturas, AcessoService acesso,
                                PlanoRepository planos, UsuarioRepository usuarios,
                                RateLimiter limiter) {
        this.assinaturas = assinaturas;
        this.acesso = acesso;
        this.planos = planos;
        this.usuarios = usuarios;
        this.limiter = limiter;
    }

    /** Catálogo público de planos. */
    @GetMapping("/planos")
    public List<DtosAssinatura.PlanoView> planos() {
        return DtosAssinatura.planos(planos.findByAtivoTrueOrderByValorCentavosAsc());
    }

    /** Plano efetivo do aluno + uso do dia (alimenta a barra de limite do FREE e o painel). */
    @GetMapping("/assinatura")
    public DtosAssinatura.AssinaturaView minha(
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        Assinatura atual = assinaturas.assinaturaAtual(usuarioId).orElse(null);
        Plano plano = acesso.planoDe(usuarioId);
        // Checkout PENDENTE ainda nao libera conteudo, mas a escolha ja pode ser exibida no painel.
        List<String> certames = atual != null && atual.getStatus() == StatusAssinatura.PENDENTE
                ? acesso.certamesDaAssinatura(atual.getId()).stream().sorted().toList()
                : acesso.certamesDe(usuarioId).stream().sorted().toList();
        return new DtosAssinatura.AssinaturaView(
                atual == null ? "SEM_ASSINATURA" : atual.getStatus().name(),
                DtosAssinatura.view(plano),
                atual == null ? null : atual.getPeriodoFim(),
                atual != null && atual.isCancelaNoFim(),
                atual == null ? null : atual.getCarenciaFim(),
                atual != null && atual.liberaPro(),
                assinaturas.pagamentoConfigurado(),
                certames,
                plano.isTutorIa(),
                DtosAssinatura.tutorUso(plano, acesso.usadoTutorHoje(usuarioId)),
                acesso.podeTrocarCertame(usuarioId));
    }

    @GetMapping("/assinatura/uso")
    public DtosAssinatura.PlanoAtualView uso(
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        Plano plano = acesso.planoDe(usuarioId);
        return new DtosAssinatura.PlanoAtualView(
                DtosAssinatura.view(plano),
                plano.getLimiteDiarioQuestoes(),
                plano.ilimitado(),
                acesso.respondidasHoje(usuarioId));
    }

    /** Cria a sessão de checkout hospedado e devolve a URL de pagamento. */
    @PostMapping("/assinatura/checkout")
    public DtosAssinatura.CheckoutView checkout(
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId,
            @Valid @RequestBody DtosAssinatura.CheckoutRequest request) {
        limiter.exigir("checkout:" + usuarioId, 5);
        Plano plano = planos.findByCodigo(request.plano())
                .orElseThrow(() -> new IllegalArgumentException("Plano inexistente."));
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario nao encontrado."));

        String url = assinaturas.iniciarCheckout(usuarioId, plano.getId(), request.certames(),
                new PaymentGateway.DadosCliente(
                        usuario.getNome(),
                        usuario.getEmail(),
                        request.cpfCnpj(),
                        request.telefone(),
                        request.cep(),
                        request.endereco(),
                        request.numero(),
                        request.bairro()));
        return new DtosAssinatura.CheckoutView(url);
    }

    /**
     * Troca os certames contratados. Uma troca por ciclo (auditada); a regra de quantidade
     * (exatamente 1 no Básico, 1..3 no Plus) é validada no servidor.
     */
    @PutMapping("/assinatura/certames")
    public Map<String, Object> trocarCertames(
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId,
            @Valid @RequestBody DtosAssinatura.CertamesRequest request,
            HttpServletRequest requisicao) {
        limiter.exigir("troca-certames:" + usuarioId, 5);
        List<String> novos = acesso.trocarCertames(usuarioId, request.certames(),
                ClienteIp.de(requisicao));
        return Map.of("ok", true, "certames", novos);
    }

    /** Cancela a renovação; o acesso continua até o fim do período já pago. */
    @PostMapping("/assinatura/cancelar")
    public Map<String, Object> cancelar(
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        assinaturas.cancelar(usuarioId);
        return Map.of("ok", true);
    }

    /**
     * Webhook do gateway. Rota pública (não tem sessão de aluno), protegida pelo token que o
     * gateway envia no header.
     */
    @PostMapping("/webhooks/asaas")
    public Map<String, Object> webhook(
            @RequestHeader(value = "asaas-access-token", required = false) String token,
            @RequestBody String corpo,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        // Autentica antes de contar no limitador: trafego anonimo nao consome o balde.
        if (!assinaturas.webhookValido(token)) {
            throw new AuthException(org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Token de webhook invalido.");
        }
        limiter.exigir("webhook-asaas:" + ClienteIp.de(requisicao), 600);
        AssinaturaService.ResultadoWebhook resultado = assinaturas.processarWebhook(token, corpo);
        return Map.of("ok", true, "resultado", resultado.name());
    }

    /**
     * Webhook do Mercado Pago. Autenticidade vem exclusivamente do HMAC oficial
     * ({@code x-signature}); o token de URL foi removido (vazava em log de acesso).
     */
    @PostMapping("/webhooks/mercadopago")
    public Map<String, Object> webhookMercadoPago(
            @RequestHeader(value = "x-signature", required = false) String assinatura,
            @RequestHeader(value = "x-request-id", required = false) String requisicaoId,
            @RequestBody String corpo,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        PaymentGateway.WebhookRequest pedido =
                new PaymentGateway.WebhookRequest(null, assinatura, requisicaoId, corpo);
        if (!assinaturas.webhookValido(pedido)) {
            throw new AuthException(org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Assinatura de webhook invalida.");
        }
        limiter.exigir("webhook-mp:" + ClienteIp.de(requisicao), 600);
        AssinaturaService.ResultadoWebhook resultado = assinaturas.processarWebhook(pedido);
        return Map.of("ok", true, "resultado", resultado.name());
    }

    /**
     * Webhook do PagBank. Autenticidade vem do header {@code x-authenticity-token}, que e'
     * SHA-256(token + "-" + corpoBruto) — comparado em tempo constante.
     */
    @PostMapping("/webhooks/pagbank")
    public Map<String, Object> webhookPagBank(
            @RequestHeader(value = "x-authenticity-token", required = false) String assinatura,
            @RequestBody String corpo,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        PaymentGateway.WebhookRequest pedido =
                new PaymentGateway.WebhookRequest(null, assinatura, null, corpo);
        if (!assinaturas.webhookValido(pedido)) {
            throw new AuthException(org.springframework.http.HttpStatus.UNAUTHORIZED,
                    "Assinatura de webhook invalida.");
        }
        limiter.exigir("webhook-pagbank:" + ClienteIp.de(requisicao), 600);
        AssinaturaService.ResultadoWebhook resultado = assinaturas.processarWebhook(pedido);
        return Map.of("ok", true, "resultado", resultado.name());
    }
}
