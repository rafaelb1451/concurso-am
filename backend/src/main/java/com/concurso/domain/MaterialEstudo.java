package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/**
 * Material de estudo publico de um certame (ex.: legislacao do edital do CREA-AM).
 *
 * <p>O conteudo e' <b>texto puro</b>, com paragrafos separados por linha em branco. Nao existe
 * rota de escrita publica: o material entra pelo seed {@code materiais.json}.</p>
 */
@Entity
@Table(name = "materiais_estudo",
        uniqueConstraints = @UniqueConstraint(name = "uk_materiais_estudo_slug", columnNames = "slug"),
        indexes = @Index(name = "idx_materiais_estudo_concurso", columnList = "concurso, ordem"))
public class MaterialEstudo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Codigo do certame (ex.: CREA-AM). */
    @Column(nullable = false, length = 20)
    private String concurso;

    @Column(nullable = false, length = 160)
    private String slug;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String resumo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MaterialCategoria categoria;

    /** Fonte oficial (ex.: "Lei 5.194/1966"). */
    @Column(length = 200)
    private String fonte;

    /** Texto puro; paragrafos separados por uma linha em branco. */
    @Column(columnDefinition = "TEXT")
    private String conteudo;

    @Column(nullable = false)
    private Integer ordem = 0;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getConcurso() { return concurso; }
    public void setConcurso(String concurso) { this.concurso = concurso; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getResumo() { return resumo; }
    public void setResumo(String resumo) { this.resumo = resumo; }

    public MaterialCategoria getCategoria() { return categoria; }
    public void setCategoria(MaterialCategoria categoria) { this.categoria = categoria; }

    public String getFonte() { return fonte; }
    public void setFonte(String fonte) { this.fonte = fonte; }

    public String getConteudo() { return conteudo; }
    public void setConteudo(String conteudo) { this.conteudo = conteudo; }

    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }

    public Instant getAtualizadoEm() { return atualizadoEm; }
    public void setAtualizadoEm(Instant atualizadoEm) { this.atualizadoEm = atualizadoEm; }
}
