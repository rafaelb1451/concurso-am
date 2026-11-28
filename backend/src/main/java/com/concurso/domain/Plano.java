package com.concurso.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Plano comercial (tabela {@code plans} da spec).
 *
 * <p>{@code limiteDiarioQuestoes} = -1 significa ilimitado. O plano FREE também é um
 * {@link Plano}: assim a regra de acesso lê sempre a mesma tabela.</p>
 */
@Entity
@Table(name = "planos")
public class Plano {

    public static final String FREE = "FREE";
    public static final String BASICO = "BASICO";
    public static final String PLUS = "PLUS";

    /** Codigos antigos, mantidos apenas para leitura de bases que ainda nao migraram. */
    @Deprecated
    public static final String PRO_MENSAL = "PRO_MENSAL";
    @Deprecated
    public static final String PRO_ANUAL = "PRO_ANUAL";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String codigo;

    @Column(nullable = false, length = 80)
    private String nome;

    /** Valor em centavos para não usar ponto flutuante em dinheiro. */
    @Column(name = "valor_centavos", nullable = false)
    private int valorCentavos;

    /** MENSAL ou ANUAL; FREE não tem ciclo. */
    @Column(length = 20)
    private String ciclo;

    /** -1 = ilimitado. */
    @Column(name = "limite_diario_questoes", nullable = false)
    private int limiteDiarioQuestoes;

    /** Quantidade maxima de certames contratados; 0 = plano sem escopo (FREE). */
    @Column(name = "certames_maximos", nullable = false)
    private int certamesMaximos;

    /** Tutor de IA liberado? Apenas o PLUS liga esta flag. */
    @Column(name = "tutor_ia", nullable = false)
    private boolean tutorIa;

    /** Perguntas diarias ao tutor; -1 = ilimitado e 0 = sem tutor. */
    @Column(name = "cota_tutor_diaria", nullable = false)
    private int cotaTutorDiaria;

    @Column(nullable = false)
    private boolean ativo = true;

    public Long getId() {
        return id;
    }

    public String getCodigo() {
        return codigo;
    }

    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public int getValorCentavos() {
        return valorCentavos;
    }

    public void setValorCentavos(int valorCentavos) {
        this.valorCentavos = valorCentavos;
    }

    public String getCiclo() {
        return ciclo;
    }

    public void setCiclo(String ciclo) {
        this.ciclo = ciclo;
    }

    public int getLimiteDiarioQuestoes() {
        return limiteDiarioQuestoes;
    }

    public void setLimiteDiarioQuestoes(int limiteDiarioQuestoes) {
        this.limiteDiarioQuestoes = limiteDiarioQuestoes;
    }

    public int getCertamesMaximos() {
        return certamesMaximos;
    }

    public void setCertamesMaximos(int certamesMaximos) {
        this.certamesMaximos = certamesMaximos;
    }

    public boolean isTutorIa() {
        return tutorIa;
    }

    public void setTutorIa(boolean tutorIa) {
        this.tutorIa = tutorIa;
    }

    public int getCotaTutorDiaria() {
        return cotaTutorDiaria;
    }

    public void setCotaTutorDiaria(int cotaTutorDiaria) {
        this.cotaTutorDiaria = cotaTutorDiaria;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public void setAtivo(boolean ativo) {
        this.ativo = ativo;
    }

    public boolean ilimitado() {
        return limiteDiarioQuestoes < 0;
    }

    /** Plano com escopo por certame (todo plano pago). */
    public boolean escopado() {
        return pago() && certamesMaximos > 0;
    }

    public boolean pago() {
        return !FREE.equals(codigo);
    }
}
