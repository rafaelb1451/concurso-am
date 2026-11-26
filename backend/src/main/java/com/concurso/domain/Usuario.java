package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** Conta do aluno. Cada usuario ve apenas os proprios dados. */
@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String nome;

    @Column(nullable = false, unique = true, length = 160)
    private String email;

    /** Hash PBKDF2 da senha (nunca a senha em claro). */
    @Column(name = "senha_hash", length = 200)
    private String senhaHash;

    /** Administrador pode importar questoes e comentarios. */
    @Column(nullable = false)
    private boolean admin = false;

    @Column(name = "email_verificado", nullable = false)
    private boolean emailVerificado = false;

    @Column(name = "email_verificado_em")
    private Instant emailVerificadoEm;

    @Column(name = "senha_alterada_em")
    private Instant senhaAlteradaEm;

    @Column(name = "termos_aceitos_em")
    private Instant termosAceitosEm;

    @Column(name = "privacidade_aceita_em")
    private Instant privacidadeAceitaEm;

    @Column(name = "tentativas_falhas", nullable = false)
    private int tentativasFalhas = 0;

    @Column(name = "bloqueado_ate")
    private Instant bloqueadoAte;

    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }

    public boolean isAdmin() { return admin; }
    public void setAdmin(boolean admin) { this.admin = admin; }

    public boolean isEmailVerificado() { return emailVerificado; }
    public void setEmailVerificado(boolean emailVerificado) { this.emailVerificado = emailVerificado; }

    public Instant getEmailVerificadoEm() { return emailVerificadoEm; }
    public void setEmailVerificadoEm(Instant emailVerificadoEm) { this.emailVerificadoEm = emailVerificadoEm; }

    public Instant getSenhaAlteradaEm() { return senhaAlteradaEm; }
    public void setSenhaAlteradaEm(Instant senhaAlteradaEm) { this.senhaAlteradaEm = senhaAlteradaEm; }

    public Instant getTermosAceitosEm() { return termosAceitosEm; }
    public void setTermosAceitosEm(Instant termosAceitosEm) { this.termosAceitosEm = termosAceitosEm; }

    public Instant getPrivacidadeAceitaEm() { return privacidadeAceitaEm; }
    public void setPrivacidadeAceitaEm(Instant privacidadeAceitaEm) { this.privacidadeAceitaEm = privacidadeAceitaEm; }

    public int getTentativasFalhas() { return tentativasFalhas; }
    public void setTentativasFalhas(int tentativasFalhas) { this.tentativasFalhas = tentativasFalhas; }

    public Instant getBloqueadoAte() { return bloqueadoAte; }
    public void setBloqueadoAte(Instant bloqueadoAte) { this.bloqueadoAte = bloqueadoAte; }

    public Instant getCriadaEm() { return criadaEm; }
    public void setCriadaEm(Instant criadaEm) { this.criadaEm = criadaEm; }
}
