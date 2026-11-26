package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Assinatura de um aluno (tabela {@code subscriptions} da spec).
 *
 * <p>Os identificadores do gateway são guardados para reconciliar webhooks e para cancelar do
 * nosso lado. O estado é sempre derivado dos eventos do gateway — nunca do retorno do navegador.</p>
 */
@Entity
@Table(name = "assinaturas",
        indexes = {
                @Index(name = "idx_assinatura_usuario", columnList = "usuario_id"),
                @Index(name = "idx_assinatura_gateway_sub", columnList = "gateway_subscription_id")
        })
public class Assinatura {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "plano_id", nullable = false)
    private Long planoId;

    @Column(nullable = false, length = 30)
    private String gateway;

    @Column(name = "gateway_customer_id", length = 80)
    private String gatewayCustomerId;

    @Column(name = "gateway_checkout_id", length = 80)
    private String gatewayCheckoutId;

    @Column(name = "gateway_subscription_id", length = 80)
    private String gatewaySubscriptionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusAssinatura status = StatusAssinatura.PENDENTE;

    @Column(name = "periodo_inicio")
    private Instant periodoInicio;

    @Column(name = "periodo_fim")
    private Instant periodoFim;

    /** Cancelou, mas o acesso continua até {@code periodoFim}. */
    @Column(name = "cancela_no_fim", nullable = false)
    private boolean cancelaNoFim = false;

    /** Fim do período de carência quando a renovação falha. */
    @Column(name = "carencia_fim")
    private Instant carenciaFim;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    @Column(name = "atualizada_em", nullable = false)
    private Instant atualizadaEm = Instant.now();

    /** O acesso PRO está liberado agora? */
    public boolean liberaPro() {
        if (!status.liberaPro()) {
            return false;
        }
        // cancelada ou em atraso continuam valendo só até o fim do período/carência
        Instant limite = status == StatusAssinatura.EM_ATRASO
                ? (carenciaFim != null ? carenciaFim : periodoFim)
                : periodoFim;
        return limite == null || limite.isAfter(Instant.now());
    }

    public boolean expirada() {
        Instant limite = status == StatusAssinatura.EM_ATRASO ? carenciaFim : periodoFim;
        return limite != null && limite.isBefore(Instant.now());
    }

    public void tocar() {
        this.atualizadaEm = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public Long getPlanoId() {
        return planoId;
    }

    public void setPlanoId(Long planoId) {
        this.planoId = planoId;
    }

    public String getGateway() {
        return gateway;
    }

    public void setGateway(String gateway) {
        this.gateway = gateway;
    }

    public String getGatewayCustomerId() {
        return gatewayCustomerId;
    }

    public void setGatewayCustomerId(String gatewayCustomerId) {
        this.gatewayCustomerId = gatewayCustomerId;
    }

    public String getGatewayCheckoutId() {
        return gatewayCheckoutId;
    }

    public void setGatewayCheckoutId(String gatewayCheckoutId) {
        this.gatewayCheckoutId = gatewayCheckoutId;
    }

    public String getGatewaySubscriptionId() {
        return gatewaySubscriptionId;
    }

    public void setGatewaySubscriptionId(String gatewaySubscriptionId) {
        this.gatewaySubscriptionId = gatewaySubscriptionId;
    }

    public StatusAssinatura getStatus() {
        return status;
    }

    public void setStatus(StatusAssinatura status) {
        this.status = status;
        tocar();
    }

    public Instant getPeriodoInicio() {
        return periodoInicio;
    }

    public void setPeriodoInicio(Instant periodoInicio) {
        this.periodoInicio = periodoInicio;
    }

    public Instant getPeriodoFim() {
        return periodoFim;
    }

    public void setPeriodoFim(Instant periodoFim) {
        this.periodoFim = periodoFim;
    }

    public boolean isCancelaNoFim() {
        return cancelaNoFim;
    }

    public void setCancelaNoFim(boolean cancelaNoFim) {
        this.cancelaNoFim = cancelaNoFim;
        tocar();
    }

    public Instant getCarenciaFim() {
        return carenciaFim;
    }

    public void setCarenciaFim(Instant carenciaFim) {
        this.carenciaFim = carenciaFim;
    }

    public Instant getCriadaEm() {
        return criadaEm;
    }

    public Instant getAtualizadaEm() {
        return atualizadaEm;
    }
}
