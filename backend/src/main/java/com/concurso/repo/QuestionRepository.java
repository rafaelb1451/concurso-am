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

    /**
     * Certames existentes no banco, com a quantidade de questoes de cada um. A lista deixou de ser
     * fixa no codigo: agrupa a tabela de vinculo, entao um concurso novo aparece sozinho.
     */
    @Query(value = """
            SELECT qc.concurso AS concurso, COUNT(DISTINCT qc.question_id) AS total
            FROM question_concursos qc
            GROUP BY qc.concurso
            ORDER BY COUNT(DISTINCT qc.question_id) DESC, qc.concurso
            """, nativeQuery = true)
    List<ConcursoCount> findConcursoCounts();

    /** Bancas distintas do banco, da mais cobrada para a menos cobrada. */
    @Query(value = """
            SELECT TRIM(q.banca) AS banca, COUNT(*) AS questoes
            FROM questions q
            WHERE q.banca IS NOT NULL AND TRIM(q.banca) <> ''
            GROUP BY TRIM(q.banca)
            ORDER BY COUNT(*) DESC, TRIM(q.banca)
            """, nativeQuery = true)
    List<BancaCount> findBancaCounts();

    @Query(value = """
            SELECT q.materia AS materia, q.assunto AS assunto, COUNT(*) AS total
            FROM questions q
            WHERE (:concurso IS NULL OR :concurso = '' OR UPPER(:concurso) = 'TODOS'
                OR EXISTS (
                    SELECT 1
                    FROM question_concursos qc
                    WHERE qc.question_id = q.id AND qc.concurso = :concurso
                ))
              AND (:banca IS NULL OR :banca = '' OR UPPER(q.banca) = UPPER(:banca))
            GROUP BY q.materia, q.assunto
            ORDER BY q.materia, q.assunto
            """, nativeQuery = true)
    List<TopicCount> findTopicCounts(@Param("concurso") String concurso,
                                     @Param("banca") String banca);

    interface TopicCount {
        String getMateria();
        String getAssunto();
        long getTotal();
    }

    interface ConcursoCount {
        String getConcurso();
        long getTotal();
    }

    interface BancaCount {
        String getBanca();
        long getQuestoes();
    }
}
