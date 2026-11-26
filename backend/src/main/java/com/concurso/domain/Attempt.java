package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/** Resposta dada pelo usuario a uma questao. Base das estatisticas. */
@Entity
@Table(name = "attempts", indexes = {
        @Index(name = "idx_attempts_question_id", columnList = "question_id"),
        @Index(name = "idx_attempts_usuario_id", columnList = "usuario_id")
})
public class Attempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_id", nullable = false)
    private Long questionId;

    /** Usuario que respondeu. {@code null} apenas em registros legados (antes das contas). */
    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(nullable = false)
    private Integer escolhida;

    @Column(nullable = false)
    private boolean acertou;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }

    public Integer getEscolhida() { return escolhida; }
    public void setEscolhida(Integer escolhida) { this.escolhida = escolhida; }

    public boolean isAcertou() { return acertou; }
    public void setAcertou(boolean acertou) { this.acertou = acertou; }

    public Instant getCriadaEm() { return criadaEm; }
    public void setCriadaEm(Instant criadaEm) { this.criadaEm = criadaEm; }
}
