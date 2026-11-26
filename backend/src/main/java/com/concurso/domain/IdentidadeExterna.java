package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/**
 * Identidade externa vinculada a um usuario local (tabela {@code user_identities} da spec).
 *
 * <p>O par {@code (provider, providerSubject)} e' a chave natural: para o Google, {@code provider}
 * e' {@code google} e {@code providerSubject} e' o claim {@code sub}, que nunca muda — nem se a
 * pessoa trocar o e-mail na conta Google. Por isso o vinculo nao pode ser pelo e-mail.</p>
 */
@Entity
@Table(name = "identidades_externas",
        uniqueConstraints = @UniqueConstraint(name = "uk_identidade_provider_subject",
                columnNames = {"provider", "provider_subject"}),
        indexes = @Index(name = "idx_identidade_usuario", columnList = "usuario_id"))
public class IdentidadeExterna {

    public static final String PROVIDER_GOOGLE = "google";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_subject", nullable = false, length = 200)
    private String providerSubject;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    public Long getId() {
        return id;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderSubject() {
        return providerSubject;
    }

    public void setProviderSubject(String providerSubject) {
        this.providerSubject = providerSubject;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public Instant getCriadaEm() {
        return criadaEm;
    }

    public void setCriadaEm(Instant criadaEm) {
        this.criadaEm = criadaEm;
    }
}
