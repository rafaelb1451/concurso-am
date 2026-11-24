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
import java.util.Set;

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
     * Sessao de estudo: filtra por concurso, materia e assunto, e embaralha.
     * A ordem aleatoria e' proposital — estudar sempre na mesma sequencia vicia a memoria
     * da posicao em vez do conteudo.
     */
    @Transactional(readOnly = true)
    public List<Dtos.QuestionView> listar(String concurso, String materia, String assunto, int quantidade) {
        List<Question> encontradas = new ArrayList<>();
        for (Question q : universe(materia, assunto)) {
            if (atendeConcurso(q, concurso)) {
                encontradas.add(q);
            }
        }
        Collections.shuffle(encontradas, random);

        int limite = Math.max(1, Math.min(50, quantidade));
        return encontradas.stream().limit(limite).map(QuestaoService::toView).toList();
    }

    @Transactional
    public Dtos.AnswerView responder(Long id, Integer alternativa) {
        Question questao = questions.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Questao nao encontrada"));

        int total = questao.getAlternativas().size();
        if (alternativa == null || alternativa < 0 || alternativa >= total) {
            throw new IllegalArgumentException("Alternativa invalida");
        }

        boolean acertou = alternativa.equals(questao.getCorreta());

        Attempt tentativa = new Attempt();
        tentativa.setQuestionId(id);
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
    public List<Dtos.TopicoView> topicos(String concurso) {
        Map<String, Long> contagem = new LinkedHashMap<>();
        for (Question q : questions.findAll()) {
            if (!atendeConcurso(q, concurso)) {
                continue;
            }
            contagem.merge(q.getMateria() + "|" + q.getAssunto(), 1L, Long::sum);
        }
        List<Dtos.TopicoView> saida = new ArrayList<>();
        contagem.forEach((chave, total) -> {
            String[] partes = chave.split("\\|", 2);
            saida.add(new Dtos.TopicoView(partes[0], partes[1], total));
        });
        saida.sort((a, b) -> a.materia().equals(b.materia())
                ? a.assunto().compareTo(b.assunto())
                : a.materia().compareTo(b.materia()));
        return saida;
    }

    /** Quantas questoes cada concurso tem (para o seletor da tela). */
    @Transactional(readOnly = true)
    public List<Dtos.ConcursoView> concursos() {
        List<Question> todas = questions.findAll();
        List<Dtos.ConcursoView> saida = new ArrayList<>();
        for (String concurso : Concursos.TODOS) {
            long total = todas.stream().filter(q -> q.getConcursos().contains(concurso)).count();
            saida.add(new Dtos.ConcursoView(concurso, total));
        }
        saida.add(new Dtos.ConcursoView("TODOS", todas.size()));
        return saida;
    }

    @Transactional(readOnly = true)
    public Dtos.DesempenhoView desempenho(String concurso) {
        Map<Long, Question> porId = new LinkedHashMap<>();
        questions.findAll().forEach(q -> porId.put(q.getId(), q));

        Map<String, long[]> porMateria = new LinkedHashMap<>();
        long respondidas = 0;
        long acertos = 0;

        for (Attempt tentativa : attempts.findAll()) {
            Question q = porId.get(tentativa.getQuestionId());
            if (q == null || !atendeConcurso(q, concurso)) {
                continue;
            }
            long[] linha = porMateria.computeIfAbsent(q.getMateria(), k -> new long[2]);
            linha[0]++;
            respondidas++;
            if (tentativa.isAcertou()) {
                linha[1]++;
                acertos++;
            }
        }

        List<Dtos.MateriaStats> stats = new ArrayList<>();
        porMateria.forEach((materia, linha) ->
                stats.add(new Dtos.MateriaStats(materia, linha[0], linha[1])));
        stats.sort((a, b) -> Long.compare(b.respondidas(), a.respondidas()));

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
        return questions.findAll();
    }

    private static boolean atendeConcurso(Question q, String concurso) {
        if (concurso == null || concurso.isBlank() || "TODOS".equalsIgnoreCase(concurso)) {
            return true;
        }
        return q.getConcursos().contains(concurso);
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
