package com.concurso.repo;

import com.concurso.domain.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {

    List<Question> findByMateriaOrderByIdAsc(String materia);

    List<Question> findByMateriaAndAssuntoOrderByIdAsc(String materia, String assunto);

    List<Question> findByAssuntoOrderByIdAsc(String assunto);

    @Query(value = """
            SELECT COUNT(DISTINCT q.id)
            FROM questions q
            WHERE EXISTS (
                SELECT 1
                FROM question_concursos qc
                WHERE qc.question_id = q.id AND qc.concurso = :concurso
            )
            """, nativeQuery = true)
    long countByConcurso(@Param("concurso") String concurso);

    @Query(value = """
            SELECT q.materia AS materia, q.assunto AS assunto, COUNT(*) AS total
            FROM questions q
            WHERE (:concurso IS NULL OR :concurso = '' OR UPPER(:concurso) = 'TODOS'
                OR EXISTS (
                    SELECT 1
                    FROM question_concursos qc
                    WHERE qc.question_id = q.id AND qc.concurso = :concurso
                ))
            GROUP BY q.materia, q.assunto
            ORDER BY q.materia, q.assunto
            """, nativeQuery = true)
    List<TopicCount> findTopicCounts(@Param("concurso") String concurso);

    interface TopicCount {
        String getMateria();
        String getAssunto();
        long getTotal();
    }
}
