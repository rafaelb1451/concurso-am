package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/** Token de verificacao ou recuperacao. Apenas o hash SHA-256 do token fica no banco. */
@Entity
@Table(name = "tokens_conta", indexes = {
        @Index(name = "idx_tokens_conta_hash", columnList = "token_hash"),
        @Index(name = "idx_tokens_conta_usuario", columnList = "usuario_id")
})
public class TokenConta {

    public enum Tipo {
        VERIFICAR_EMAIL,
        RESETAR_SENHA,
        ALTERAR_EMAIL
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(name = "tipo", nullable = false, length = 30)
    private String tipo;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(nullable = false, length = 160)
    private String email;

    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;

    @Column(nullable = false)
    private boolean usado = false;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public String getTokenHash() { return tokenHash; }
    public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Instant getExpiraEm() { return expiraEm; }
    public void setExpiraEm(Instant expiraEm) { this.expiraEm = expiraEm; }

    public boolean isUsado() { return usado; }
    public void setUsado(boolean usado) { this.usado = usado; }

    public Instant getCriadaEm() { return criadaEm; }
    public void setCriadaEm(Instant criadaEm) { this.criadaEm = criadaEm; }
}
