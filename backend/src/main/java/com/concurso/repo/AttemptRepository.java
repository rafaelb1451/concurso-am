package com.concurso.repo;

import com.concurso.domain.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AttemptRepository extends JpaRepository<Attempt, Long> {

    long countByAcertouTrue();

    @Query(value = """
            SELECT q.materia AS materia, COUNT(a.id) AS respondidas,
                   SUM(CASE WHEN a.acertou = TRUE THEN 1 ELSE 0 END) AS acertos
            FROM attempts a
            JOIN questions q ON q.id = a.question_id
            WHERE (:concurso IS NULL OR :concurso = '' OR UPPER(:concurso) = 'TODOS'
                OR EXISTS (
                    SELECT 1
                    FROM question_concursos qc
                    WHERE qc.question_id = q.id AND qc.concurso = :concurso
                ))
            GROUP BY q.materia
            ORDER BY COUNT(a.id) DESC
            """, nativeQuery = true)
    List<MateriaStats> findMateriaStats(@Param("concurso") String concurso);

    interface MateriaStats {
        String getMateria();
        long getRespondidas();
        long getAcertos();
    }
}
