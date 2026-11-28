package com.concurso.domain;

import java.io.Serializable;
import java.util.Objects;

/** Chave composta de {@link AssinaturaCertame}: (assinatura, concurso). */
public class AssinaturaCertameId implements Serializable {

    private Long assinaturaId;
    private String concurso;

    public AssinaturaCertameId() {
    }

    public AssinaturaCertameId(Long assinaturaId, String concurso) {
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

    @Override
    public boolean equals(Object outro) {
        if (this == outro) {
            return true;
        }
        if (!(outro instanceof AssinaturaCertameId id)) {
            return false;
        }
        return Objects.equals(assinaturaId, id.assinaturaId)
                && Objects.equals(concurso, id.concurso);
    }

    @Override
    public int hashCode() {
        return Objects.hash(assinaturaId, concurso);
    }
}
