package com.concurso.web;

import com.concurso.domain.Assinatura;
import com.concurso.domain.Plano;
import com.concurso.domain.Usuario;
import com.concurso.integration.payment.PaymentGateway;
import com.concurso.repo.PlanoRepository;
import com.concurso.repo.UsuarioRepository;
import com.concurso.service.AcessoService;
import com.concurso.service.AssinaturaService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    public AssinaturaController(AssinaturaService assinaturas, AcessoService acesso,
                                PlanoRepository planos, UsuarioRepository usuarios) {
        this.assinaturas = assinaturas;
        this.acesso = acesso;
        this.planos = planos;
        this.usuarios = usuarios;
    }

    /** Catálogo público de planos. */
    @GetMapping("/planos")
    public List<DtosAssinatura.PlanoView> planos() {
        return DtosAssinatura.planos(planos.findByAtivoTrueOrderByValorCentavosAsc());
    }

    /** Plano efetivo do aluno + uso do dia (alimenta a barra de limite do FREE). */
    @GetMapping("/assinatura")
    public DtosAssinatura.AssinaturaView minha(
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        Assinatura atual = assinaturas.assinaturaAtual(usuarioId).orElse(null);
        Plano plano = acesso.planoDe(usuarioId);
        return new DtosAssinatura.AssinaturaView(
                atual == null ? "SEM_ASSINATURA" : atual.getStatus().name(),
                DtosAssinatura.view(plano),
                atual == null ? null : atual.getPeriodoFim(),
                atual != null && atual.isCancelaNoFim(),
                atual == null ? null : atual.getCarenciaFim(),
                atual != null && atual.liberaPro(),
                assinaturas.pagamentoConfigurado());
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
        Plano plano = planos.findByCodigo(request.plano())
                .orElseThrow(() -> new IllegalArgumentException("Plano inexistente."));
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new IllegalStateException("Usuario nao encontrado."));

        String url = assinaturas.iniciarCheckout(usuarioId, plano.getId(),
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
            @RequestBody String corpo) {
        AssinaturaService.ResultadoWebhook resultado = assinaturas.processarWebhook(token, corpo);
        return Map.of("ok", true, "resultado", resultado.name());
    }

    /** Webhook do Mercado Pago; o token vem na query string configurada no painel. */
    @PostMapping("/webhooks/mercadopago")
    public Map<String, Object> webhookMercadoPago(
            @RequestParam(value = "token", required = false) String token,
            @RequestBody String corpo) {
        AssinaturaService.ResultadoWebhook resultado = assinaturas.processarWebhook(token, corpo);
        return Map.of("ok", true, "resultado", resultado.name());
    }
}
