package com.concurso.web;

import com.concurso.domain.Assinatura;
import com.concurso.domain.Usuario;
import com.concurso.service.AcessoService;
import com.concurso.service.AdminAssinaturaService;
import com.concurso.service.AssinaturaService;
import com.concurso.service.RateLimiter;
import com.concurso.repo.PlanoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;

/**
 * Painel administrativo de assinaturas.
 *
 * <p>Restrito ao usuário marcado como {@code admin} (o primeiro cadastrado). Toda concessão ou
 * revogação fica registrada em {@code eventos_pagamento} para auditoria.</p>
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminAssinaturaService admin;
    private final AssinaturaService assinaturas;
    private final AcessoService acesso;
    private final RateLimiter limiter;
    private final PlanoRepository planos;

    public AdminController(AdminAssinaturaService admin, AssinaturaService assinaturas,
                           AcessoService acesso, RateLimiter limiter, PlanoRepository planos) {
        this.admin = admin;
        this.assinaturas = assinaturas;
        this.acesso = acesso;
        this.limiter = limiter;
        this.planos = planos;
    }

    public record UsuarioAdminView(
            Long id,
            String nome,
            String email,
            boolean admin,
            Instant criadaEm,
            String plano,
            String statusAssinatura,
            Instant periodoFim,
            boolean liberaPro
    ) {
    }

    public record ConcederRequest(
            @jakarta.validation.constraints.NotBlank(message = "informe o e-mail")
            @jakarta.validation.constraints.Email(message = "e-mail inválido")
            String email,
            @jakarta.validation.constraints.NotBlank(message = "informe o plano")
            String plano,
            @jakarta.validation.constraints.Min(value = 1, message = "mínimo de 1 dia")
            @jakarta.validation.constraints.Max(value = 3650, message = "máximo de 3650 dias")
            Integer dias
    ) {
    }

    public record RevogarRequest(
            @jakarta.validation.constraints.NotBlank(message = "informe o e-mail")
            @jakarta.validation.constraints.Email(message = "e-mail inválido")
            String email
    ) {
    }

    public record AssinaturaAdminView(String plano, String status, Instant periodoFim, boolean liberaPro) {
    }

    @GetMapping("/usuarios")
    public List<UsuarioAdminView> usuarios(
            @RequestAttribute(AuthInterceptor.ATTR_ADMIN) Boolean adminFlag,
            @RequestParam(required = false) String q) {
        exigirAdmin(adminFlag);
        return admin.listar(q).stream().map(this::view).toList();
    }

    @PostMapping("/assinaturas/conceder")
    @ResponseStatus(HttpStatus.OK)
    public AssinaturaAdminView conceder(
            @RequestAttribute(AuthInterceptor.ATTR_ADMIN) Boolean adminFlag,
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long adminId,
            @jakarta.validation.Valid @RequestBody ConcederRequest request) {
        exigirAdmin(adminFlag);
        limiter.exigir("admin-conceder", 30);
        Assinatura a = admin.conceder(request.email(), request.plano(), request.dias(), adminId);
        return new AssinaturaAdminView(planoDe(a.getPlanoId()), a.getStatus().name(),
                a.getPeriodoFim(), a.liberaPro());
    }

    @PostMapping("/assinaturas/revogar")
    @ResponseStatus(HttpStatus.OK)
    public AssinaturaAdminView revogar(
            @RequestAttribute(AuthInterceptor.ATTR_ADMIN) Boolean adminFlag,
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long adminId,
            @jakarta.validation.Valid @RequestBody RevogarRequest request) {
        exigirAdmin(adminFlag);
        limiter.exigir("admin-revogar", 30);
        Assinatura a = admin.revogar(request.email(), adminId);
        return new AssinaturaAdminView(planoDe(a.getPlanoId()), a.getStatus().name(),
                a.getPeriodoFim(), a.liberaPro());
    }

    private UsuarioAdminView view(Usuario u) {
        Assinatura atual = assinaturas.assinaturaAtual(u.getId()).orElse(null);
        String plano = acesso.planoDe(u.getId()).getCodigo();
        return new UsuarioAdminView(
                u.getId(), u.getNome(), u.getEmail(), u.isAdmin(), u.getCriadaEm(),
                plano,
                atual == null ? "SEM_ASSINATURA" : atual.getStatus().name(),
                atual == null ? null : atual.getPeriodoFim(),
                atual != null && atual.liberaPro());
    }

    private String planoDe(Long planoId) {
        return planos.findById(planoId).map(com.concurso.domain.Plano::getCodigo).orElse("");
    }

    private static void exigirAdmin(Boolean admin) {
        if (!Boolean.TRUE.equals(admin)) {
            throw new AcessoNegadoException("Ação restrita ao administrador.");
        }
    }
}
