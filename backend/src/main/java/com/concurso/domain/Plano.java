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
    public static final String PRO_MENSAL = "PRO_MENSAL";
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

    public boolean isAtivo() {
        return ativo;
    }

    public void setAtivo(boolean ativo) {
        this.ativo = ativo;
    }

    public boolean ilimitado() {
        return limiteDiarioQuestoes < 0;
    }

    public boolean pago() {
        return !FREE.equals(codigo);
    }
}
