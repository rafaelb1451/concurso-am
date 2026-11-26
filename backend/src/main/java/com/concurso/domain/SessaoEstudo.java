package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * Bloco de tempo de estudo registrado pelo aluno. Alimenta o tempo total por materia
 * no dashboard de evolucao. {@code materia == null} significa estudo geral (sem filtro).
 */
@Entity
@Table(name = "sessoes_estudo", indexes = {
        @Index(name = "idx_sessoes_estudo_usuario", columnList = "usuario_id")
})
public class SessaoEstudo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(length = 60)
    private String materia;

    @Column(name = "duracao_segundos", nullable = false)
    private int duracaoSegundos;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }

    public String getMateria() { return materia; }
    public void setMateria(String materia) { this.materia = materia; }

    public int getDuracaoSegundos() { return duracaoSegundos; }
    public void setDuracaoSegundos(int duracaoSegundos) { this.duracaoSegundos = duracaoSegundos; }

    public Instant getCriadaEm() { return criadaEm; }
    public void setCriadaEm(Instant criadaEm) { this.criadaEm = criadaEm; }
}
