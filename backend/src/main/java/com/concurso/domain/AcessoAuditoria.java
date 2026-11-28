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
 * Trilha de auditoria de acesso (tabela {@code acessos_auditoria}).
 *
 * <p>Registra negacoes e permissoes relevantes: certame fora do plano, tutor bloqueado/cota,
 * troca de certames. Nao guarda conteudo sensivel — apenas quem, de onde, o recurso e o motivo.</p>
 */
@Entity
@Table(name = "acessos_auditoria", indexes = {
        @Index(name = "idx_acessos_auditoria_usuario", columnList = "usuario_id, criada_em"),
        @Index(name = "idx_acessos_auditoria_recurso", columnList = "recurso, criada_em")
})
public class AcessoAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id")
    private Long usuarioId;

    @Column(length = 64)
    private String ip;

    @Column(length = 120)
    private String recurso;

    @Column(length = 20)
    private String concurso;

    @Column(nullable = false)
    private boolean permitido;

    @Column(length = 120)
    private String motivo;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    public Long getId() {
        return id;
    }

    public Long getUsuarioId() {
        return usuarioId;
    }

    public void setUsuarioId(Long usuarioId) {
        this.usuarioId = usuarioId;
    }

    public String getIp() {
        return ip;
    }

    public void setIp(String ip) {
        this.ip = ip;
    }

    public String getRecurso() {
        return recurso;
    }

    public void setRecurso(String recurso) {
        this.recurso = recurso;
    }

    public String getConcurso() {
        return concurso;
    }

    public void setConcurso(String concurso) {
        this.concurso = concurso;
    }

    public boolean isPermitido() {
        return permitido;
    }

    public void setPermitido(boolean permitido) {
        this.permitido = permitido;
    }

    public String getMotivo() {
        return motivo;
    }

    public void setMotivo(String motivo) {
        this.motivo = motivo;
    }

    public Instant getCriadaEm() {
        return criadaEm;
    }

    public void setCriadaEm(Instant criadaEm) {
        this.criadaEm = criadaEm;
    }
}
