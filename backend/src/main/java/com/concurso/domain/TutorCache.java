package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

/**
 * Resposta do tutor ja' gerada, indexada por uma chave deterministica.
 *
 * <p>A chave e' o SHA-256 hex do JSON canonico de {@code {contexto, mensagens}} — o id do usuario
 * <b>nao</b> participa, entao alunos diferentes com a mesma duvida reaproveitam a mesma resposta.
 * O contador {@code acessos} mede o quanto o cache economizou de chamadas ao provedor.</p>
 */
@Entity
@Table(name = "tutor_cache",
        uniqueConstraints = @UniqueConstraint(name = "uk_tutor_cache_chave", columnNames = "chave"))
public class TutorCache {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String chave;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String resposta;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    @Column(nullable = false)
    private Integer acessos = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getChave() { return chave; }
    public void setChave(String chave) { this.chave = chave; }

    public String getResposta() { return resposta; }
    public void setResposta(String resposta) { this.resposta = resposta; }

    public Instant getCriadaEm() { return criadaEm; }
    public void setCriadaEm(Instant criadaEm) { this.criadaEm = criadaEm; }

    public Integer getAcessos() { return acessos; }
    public void setAcessos(Integer acessos) { this.acessos = acessos; }
}
