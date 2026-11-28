package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

/**
 * Certame contratado por uma assinatura (tabela {@code assinatura_certames}).
 *
 * <p>O vinculo pertence a assinatura, nao ao plano: o aluno escolhe os certames no checkout e a
 * linha PENDENTE ja carrega a escolha para quando o webhook ativar o acesso.</p>
 */
@Entity
@Table(name = "assinatura_certames")
@IdClass(AssinaturaCertameId.class)
public class AssinaturaCertame {

    @Id
    @Column(name = "assinatura_id", nullable = false)
    private Long assinaturaId;

    @Id
    @Column(nullable = false, length = 20)
    private String concurso;

    public AssinaturaCertame() {
    }

    public AssinaturaCertame(Long assinaturaId, String concurso) {
        this.assinaturaId = assinaturaId;
        this.concurso = concurso;
    }

    public Long getAssinaturaId() {
        return assinaturaId;
    }

    public void setAssinaturaId(Long assinaturaId) {
        this.assinaturaId = assinaturaId;
    }

    public String getConcurso() {
        return concurso;
    }

    public void setConcurso(String concurso) {
        this.concurso = concurso;
    }
}
