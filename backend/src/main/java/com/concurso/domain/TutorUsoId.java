package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;

/** Chave composta de {@link TutorUso}: (usuario, dia). */
@Embeddable
public class TutorUsoId implements Serializable {

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(name = "dia")
    private LocalDate dia;

    public TutorUsoId() {
    }

    public TutorUsoId(Long usuarioId, LocalDate dia) {
        this.usuarioId = usuarioId;
        this.dia = dia;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public LocalDate getDia() {
        return dia;
    }

    public void setDia(LocalDate dia) {
        this.dia = dia;
    }

    @Override
    public boolean equals(Object outro) {
        if (this == outro) {
            return true;
        }
        if (!(outro instanceof TutorUsoId id)) {
            return false;
        }
        return Objects.equals(usuarioId, id.usuarioId) && Objects.equals(dia, id.dia);
    }

    @Override
    public int hashCode() {
        return Objects.hash(usuarioId, dia);
    }
}
