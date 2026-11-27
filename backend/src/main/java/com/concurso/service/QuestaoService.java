package com.concurso.service;

import com.concurso.domain.Attempt;
import com.concurso.domain.Concursos;
import com.concurso.domain.Question;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.QuestionRepository;
import com.concurso.web.Dtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;

@Service
public class QuestaoService {

    private final QuestionRepository questions;
    private final AttemptRepository attempts;
    private final Random random = new Random();

    public QuestaoService(QuestionRepository questions, AttemptRepository attempts) {
        this.questions = questions;
        this.attempts = attempts;
    }

    /**
     * Sessao de estudo: filtra por concurso, materia, assunto e banca, e embaralha.
     * A ordem aleatoria e' proposital — estudar sempre na mesma sequencia vicia a memoria
     * da posicao em vez do conteudo.
     */
    @Transactional(readOnly = true)
    public List<Dtos.QuestionView> listar(String concurso, String materia, String assunto,
                                          String banca, int quantidade) {
        List<Question> encontradas = new ArrayList<>();
        for (Question q : universe(materia, assunto)) {
            if (atendeConcurso(q, concurso) && atendeBanca(q, banca)) {
                encontradas.add(q);
            }
        }
        Collections.shuffle(encontradas, random);

        int limite = Math.max(1, Math.min(50, quantidade));
        return encontradas.stream().limit(limite).map(QuestaoService::toView).toList();
    }

    @Transactional
    public Dtos.AnswerView responder(Long usuarioId, Long id, Integer alternativa) {
        Question questao = questions.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Questao nao encontrada"));

        int total = questao.getAlternativas().size();
        if (alternativa == null || alternativa < 0 || alternativa >= total) {
            throw new IllegalArgumentException("Alternativa invalida");
        }

        boolean acertou = alternativa.equals(questao.getCorreta());

        Attempt tentativa = new Attempt();
        tentativa.setQuestionId(id);
        tentativa.setUsuarioId(usuarioId);
        tentativa.setEscolhida(alternativa);
        tentativa.setAcertou(acertou);
        attempts.save(tentativa);

        return new Dtos.AnswerView(
                acertou,
                questao.getCorreta(),
                letra(questao.getCorreta()),
                questao.getExplicacao(),
                questao.getFundamento(),
                questao.getAssunto(),
                questao.getOrigem().name(),
                questao.getPrecedente(),
                questao.getVerificadoEm());
    }

    @Transactional(readOnly = true)
    public List<Dtos.TopicoView> topicos(String concurso, String banca) {
        String filtroConcurso = concurso == null || concurso.isBlank() ? null : concurso;
        String filtroBanca = banca == null || banca.isBlank() ? null : banca;
        return questions.findTopicCounts(filtroConcurso, filtroBanca).stream()
                .map(topico -> new Dtos.TopicoView(topico.getMateria(), topico.getAssunto(), topico.getTotal()))
                .toList();
    }

    /**
     * Certames dinamicos: agrupa {@code question_concursos}, em vez de partir de uma lista fixa.
     * O sentinela TODOS continua existindo para o seletor da tela e usa a contagem total.
     */
    @Transactional(readOnly = true)
    public List<Dtos.ConcursoView> concursos() {
        Map<String, Long> porCodigo = new LinkedHashMap<>();
        for (QuestionRepository.ConcursoCount linha : questions.findConcursoCounts()) {
            String codigo = Concursos.normalizar(linha.getConcurso());
            if (codigo == null || !Concursos.valido(codigo)) {
                continue;
            }
            porCodigo.merge(codigo, linha.getTotal(), Long::sum);
        }
        List<Dtos.ConcursoView> saida = new ArrayList<>();
        porCodigo.forEach((codigo, total) -> saida.add(new Dtos.ConcursoView(codigo, total)));
        saida.add(new Dtos.ConcursoView("TODOS", questions.count()));
        return saida;
    }

    /** Bancas distintas do banco, com a contagem de questoes (eixo principal do estudo). */
    @Transactional(readOnly = true)
    public List<Dtos.BancaView> bancas() {
        List<Dtos.BancaView> saida = new ArrayList<>();
        for (QuestionRepository.BancaCount linha : questions.findBancaCounts()) {
            String banca = linha.getBanca() == null ? "" : linha.getBanca().trim();
            if (!banca.isEmpty()) {
                saida.add(new Dtos.BancaView(banca, linha.getQuestoes()));
            }
        }
        return saida;
    }

    @Transactional(readOnly = true)
    public Dtos.DesempenhoView desempenho(Long usuarioId, String concurso, String banca) {
        long respondidas = 0;
        long acertos = 0;
        List<Dtos.MateriaStats> stats = new ArrayList<>();
        String filtroConcurso = concurso == null || concurso.isBlank() ? null : concurso;
        String filtroBanca = banca == null || banca.isBlank() ? null : banca;
        for (AttemptRepository.MateriaStats linha
                : attempts.findMateriaStats(usuarioId, filtroConcurso, filtroBanca)) {
            stats.add(new Dtos.MateriaStats(linha.getMateria(), linha.getRespondidas(), linha.getAcertos()));
            respondidas += linha.getRespondidas();
            acertos += linha.getAcertos();
        }

        double percentual = respondidas == 0 ? 0 : Math.round(acertos * 1000.0 / respondidas) / 10.0;
        return new Dtos.DesempenhoView(respondidas, acertos, percentual, stats);
    }

    // ------------------------------------------------------------------

    private List<Question> universe(String materia, String assunto) {
        if (materia != null && !materia.isBlank() && assunto != null && !assunto.isBlank()) {
            return questions.findByMateriaAndAssuntoOrderByIdAsc(materia, assunto);
        }
        if (materia != null && !materia.isBlank()) {
            return questions.findByMateriaOrderByIdAsc(materia);
        }
        if (assunto != null && !assunto.isBlank()) {
            return questions.findByAssuntoOrderByIdAsc(assunto);
        }
        return questions.findAll();
    }

    private static boolean atendeConcurso(Question q, String concurso) {
        if (concurso == null || concurso.isBlank() || "TODOS".equalsIgnoreCase(concurso)) {
            return true;
        }
        return q.getConcursos().contains(concurso);
    }

    private static boolean atendeBanca(Question q, String banca) {
        if (banca == null || banca.isBlank()) {
            return true;
        }
        return q.getBanca() != null && q.getBanca().trim().equalsIgnoreCase(banca.trim());
    }

    private static String letra(int indice) {
        return String.valueOf((char) ('A' + indice));
    }

    static Dtos.QuestionView toView(Question q) {
        return new Dtos.QuestionView(
                q.getId(),
                q.getMateria(),
                q.getAssunto(),
                q.getOrigem().name(),
                q.getBanca(),
                q.getAno(),
                q.getOrgao(),
                q.getCargo(),
                q.getDificuldade(),
                q.getEnunciado(),
                List.copyOf(q.getAlternativas()),
                new ArrayList<>(new LinkedHashSet<>(q.getConcursos())),
                q.getHash(),
                q.getExplicacao() != null && !q.getExplicacao().isBlank(),
                q.getPrecedente(),
                q.getVerificadoEm());
    }
}
