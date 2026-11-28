package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.LocalDate;

/**
 * Contador diario de perguntas ao Tutor de IA (tabela {@code tutor_uso}).
 *
 * <p>A cota e' aplicada no servidor. O incremento e' feito por UPDATE atomico no repositorio,
 * evitando perder cliques concorrentes do mesmo aluno.</p>
 */
@Entity
@Table(name = "tutor_uso")
public class TutorUso {

    @EmbeddedId
    private TutorUsoId id = new TutorUsoId();

    @Column(nullable = false)
    private int usado;

    public TutorUso() {
    }

    public TutorUso(Long usuarioId, LocalDate dia, int usado) {
        this.id = new TutorUsoId(usuarioId, dia);
        this.usado = usado;
    }

    public TutorUsoId getId() {
        return id;
    }

    public void setId(TutorUsoId id) {
        this.id = id;
    }

    public Long getUsuarioId() {
        return id == null ? null : id.getUsuarioId();
    }

    public LocalDate getDia() {
        return id == null ? null : id.getDia();
    }

    public int getUsado() {
        return usado;
    }

    public void setUsado(int usado) {
        this.usado = usado;
    }
}
