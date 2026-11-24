package com.concurso.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

import java.util.ArrayList;
import java.util.List;

/**
 * Uma questao de concurso.
 *
 * <p>Guarda a <b>procedencia</b>: questoes de prova oficial carregam banca/ano/orgao/cargo;
 * as autorais carregam o topico e o fundamento que as ancora. O aluno ve' a diferenca — e'
 * o que separa treinar a redacao real da banca de treinar uma questao calibrada.</p>
 */
@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String materia;

    @Column(nullable = false, length = 120)
    private String assunto;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Origem origem = Origem.AUTORAL;

    @Column(length = 40)
    private String banca;

    private Integer ano;

    @Column(length = 80)
    private String orgao;

    @Column(length = 80)
    private String cargo;

    /** Base da resposta: artigo de lei, sumula ou item do edital. */
    @Column(columnDefinition = "TEXT")
    private String fundamento;

    /**
     * Precedente de maior hierarquia que resolve o ponto: sumula vinculante, tese de
     * repercussao geral ou de repetitivo, sumula do STF/STJ/TJ. Prevalece sobre o texto legal.
     */
    @Column(columnDefinition = "TEXT")
    private String precedente;

    /** Data em que o comentario foi conferido contra a legislacao vigente. */
    @Column(name = "verificado_em")
    private java.time.LocalDate verificadoEm;

    /** 1 = facil, 2 = medio, 3 = dificil. */
    private Integer dificuldade = 2;

    /**
     * Concursos a que a questao se aplica: "PM-AM", "PC-AM" ou ambos.
     * Conteudo comum aos dois leva as duas marcas; materia especifica leva so' a sua.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "question_concursos", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "concurso", length = 20)
    private java.util.Set<String> concursos = new java.util.LinkedHashSet<>();

    @Column(nullable = false, columnDefinition = "TEXT")
    private String enunciado;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "question_alternativas", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "posicao")
    @Column(name = "texto", length = 1000)
    private List<String> alternativas = new ArrayList<>();

    /** Indice (0-based) da alternativa correta. */
    @Column(name = "correta", nullable = false)
    private Integer correta = 0;

    @Column(columnDefinition = "TEXT")
    private String explicacao;

    /**
     * Hash do enunciado normalizado, usado para nao importar a mesma questao duas vezes
     * (inclusive quando ela vem de provas diferentes com pequenas diferencas de pontuacao).
     */
    @Column(length = 40)
    private String hash;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMateria() { return materia; }
    public void setMateria(String materia) { this.materia = materia; }

    public String getAssunto() { return assunto; }
    public void setAssunto(String assunto) { this.assunto = assunto; }

    public Origem getOrigem() { return origem; }
    public void setOrigem(Origem origem) { this.origem = origem; }

    public String getBanca() { return banca; }
    public void setBanca(String banca) { this.banca = banca; }

    public Integer getAno() { return ano; }
    public void setAno(Integer ano) { this.ano = ano; }

    public String getOrgao() { return orgao; }
    public void setOrgao(String orgao) { this.orgao = orgao; }

    public String getCargo() { return cargo; }
    public void setCargo(String cargo) { this.cargo = cargo; }

    public String getFundamento() { return fundamento; }
    public void setFundamento(String fundamento) { this.fundamento = fundamento; }

    public Integer getDificuldade() { return dificuldade; }
    public void setDificuldade(Integer dificuldade) { this.dificuldade = dificuldade; }

    public String getEnunciado() { return enunciado; }
    public void setEnunciado(String enunciado) { this.enunciado = enunciado; }

    public List<String> getAlternativas() { return alternativas; }
    public void setAlternativas(List<String> alternativas) { this.alternativas = alternativas; }

    public Integer getCorreta() { return correta; }
    public void setCorreta(Integer correta) { this.correta = correta; }

    public String getExplicacao() { return explicacao; }
    public void setExplicacao(String explicacao) { this.explicacao = explicacao; }

    public java.util.Set<String> getConcursos() { return concursos; }
    public void setConcursos(java.util.Set<String> concursos) { this.concursos = concursos; }

    public String getHash() { return hash; }
    public void setHash(String hash) { this.hash = hash; }

    public String getPrecedente() { return precedente; }
    public void setPrecedente(String precedente) { this.precedente = precedente; }

    public java.time.LocalDate getVerificadoEm() { return verificadoEm; }
    public void setVerificadoEm(java.time.LocalDate verificadoEm) { this.verificadoEm = verificadoEm; }
}
