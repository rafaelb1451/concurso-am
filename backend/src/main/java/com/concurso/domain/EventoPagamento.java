package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/**
 * Registro de evento de pagamento recebido do gateway (tabela {@code payment_events} da spec).
 *
 * <p>O {@code gatewayEventId} tem restrição única: é o que torna o webhook idempotente. Se o
 * gateway reenviar o mesmo evento (o Asaas reenvia quando não recebe 200), a segunda tentativa
 * bate na unicidade e não aplica efeito nenhum de novo.</p>
 */
@Entity
@Table(name = "eventos_pagamento",
        uniqueConstraints = @UniqueConstraint(name = "uk_evento_gateway",
                columnNames = {"gateway", "gateway_event_id"}))
public class EventoPagamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String gateway;

    @Column(name = "gateway_event_id", nullable = false, length = 120)
    private String gatewayEventId;

    @Column(nullable = false, length = 60)
    private String tipo;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(name = "processado_em", nullable = false)
    private Instant processadoEm = Instant.now();

    public Long getId() {
        return id;
    }

    public String getGateway() {
        return gateway;
    }

    public void setGateway(String gateway) {
        this.gateway = gateway;
    }

    public String getGatewayEventId() {
        return gatewayEventId;
    }

    public void setGatewayEventId(String gatewayEventId) {
        this.gatewayEventId = gatewayEventId;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public Instant getProcessadoEm() {
        return processadoEm;
    }
}
