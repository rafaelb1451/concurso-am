package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** Sessao autenticada: guarda apenas o hash SHA-256 do token (o token em claro fica no cliente). */
@Entity
@Table(name = "sessoes")
public class Sessao {

    @Id
    @Column(length = 64)
    private String token;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }

    public Instant getCriadaEm() { return criadaEm; }
    public void setCriadaEm(Instant criadaEm) { this.criadaEm = criadaEm; }

    public Instant getExpiraEm() { return expiraEm; }
    public void setExpiraEm(Instant expiraEm) { this.expiraEm = expiraEm; }
}
