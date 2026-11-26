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
        Question pmQuestion = questions.save(question("PM-AM"));
        Question pcQuestion = questions.save(question("PC-AM"));
        attempts.save(attempt(pmQuestion.getId(), true));
        attempts.save(attempt(pmQuestion.getId(), false));
        attempts.save(attempt(pcQuestion.getId(), false));
        entityManager.flush();

        assertEquals(1, questions.countByConcurso("PM-AM"));
        assertEquals(2, questions.count());

        List<QuestionRepository.TopicCount> pmTopics = questions.findTopicCounts("PM-AM");
        assertEquals(1, pmTopics.size());
        assertEquals(1, pmTopics.get(0).getTotal());
        assertEquals(2, questions.findTopicCounts("TODOS").get(0).getTotal());

        List<AttemptRepository.MateriaStats> stats = attempts.findMateriaStats(1L, "PM-AM");
        assertEquals(1, stats.size());
        assertEquals(2, stats.get(0).getRespondidas());
        assertEquals(1, stats.get(0).getAcertos());
    }

    private static Question question(String concurso) {
        Question question = new Question();
        question.setMateria("Direito Penal");
        question.setAssunto("Aplicação da lei penal");
        question.setOrigem(Origem.AUTORAL);
        question.setEnunciado("Enunciado válido para teste.");
        question.setAlternativas(List.of("A", "B"));
        question.setConcursos(Set.of(concurso));
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
