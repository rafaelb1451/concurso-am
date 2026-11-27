package com.concurso.repo;

import com.concurso.domain.Attempt;
import com.concurso.domain.Origem;
import com.concurso.domain.Question;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;

@DataJpaTest
class RepositoryAggregationTest {

    @Autowired
    private QuestionRepository questions;

    @Autowired
    private AttemptRepository attempts;

    @PersistenceContext
    private EntityManager entityManager;

    @Test
    void aggregatesQuestionAndAttemptCountsByContest() {
        Question pmQuestion = questions.save(question(Set.of("PM-AM"), "FGV"));
        Question pcQuestion = questions.save(question(Set.of("PC-AM"), "FGV"));
        attempts.save(attempt(pmQuestion.getId(), true));
        attempts.save(attempt(pmQuestion.getId(), false));
        attempts.save(attempt(pcQuestion.getId(), false));
        entityManager.flush();

        assertEquals(1, questions.countByConcurso("PM-AM"));
        assertEquals(2, questions.count());

        List<QuestionRepository.TopicCount> pmTopics = questions.findTopicCounts("PM-AM", null);
        assertEquals(1, pmTopics.size());
        assertEquals(1, pmTopics.get(0).getTotal());
        assertEquals(2, questions.findTopicCounts("TODOS", null).get(0).getTotal());

        List<AttemptRepository.MateriaStats> stats = attempts.findMateriaStats(1L, "PM-AM", null);
        assertEquals(1, stats.size());
        assertEquals(2, stats.get(0).getRespondidas());
        assertEquals(1, stats.get(0).getAcertos());
    }

    @Test
    void groupsContestsAndBanksFromQuestionRows() {
        questions.save(question(Set.of("PM-AM"), "FGV"));
        questions.save(question(Set.of("PM-AM", "CREA-AM"), "FGV"));
        questions.save(question(Set.of("PC-AM"), "CEBRASPE"));
        entityManager.flush();

        List<QuestionRepository.ConcursoCount> concursos = questions.findConcursoCounts();
        assertEquals(3, concursos.size());
        assertEquals("PM-AM", concursos.get(0).getConcurso());
        assertEquals(2, concursos.get(0).getTotal());
        assertEquals(1, concursos.get(1).getTotal());
        assertEquals(1, concursos.get(2).getTotal());

        List<QuestionRepository.BancaCount> bancas = questions.findBancaCounts();
        assertEquals(2, bancas.size());
        assertEquals("FGV", bancas.get(0).getBanca());
        assertEquals(2, bancas.get(0).getQuestoes());
        assertEquals("CEBRASPE", bancas.get(1).getBanca());

        // o filtro de banca combina com o de concurso na consulta de topicos
        assertEquals(2, questions.findTopicCounts(null, "FGV").get(0).getTotal());
        assertEquals(1, questions.findTopicCounts("CREA-AM", "FGV").get(0).getTotal());
    }

    private static Question question(Set<String> concursos, String banca) {
        Question question = new Question();
        question.setMateria("Direito Penal");
        question.setAssunto("Aplicação da lei penal");
        question.setOrigem(Origem.AUTORAL);
        question.setBanca(banca);
        question.setEnunciado("Enunciado válido para teste.");
        question.setAlternativas(List.of("A", "B"));
        question.setConcursos(concursos);
        return question;
    }

    private static Attempt attempt(Long questionId, boolean acertou) {
        Attempt attempt = new Attempt();
        attempt.setQuestionId(questionId);
        attempt.setUsuarioId(1L);
        attempt.setEscolhida(acertou ? 0 : 1);
        attempt.setAcertou(acertou);
        return attempt;
    }
}
