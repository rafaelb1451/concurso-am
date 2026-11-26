package com.concurso.repo;

import com.concurso.domain.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AttemptRepository extends JpaRepository<Attempt, Long> {

    long countByAcertouTrue();

    /** Respostas do aluno a partir de um instante (limite diario do FREE). */
    long countByUsuarioIdAndCriadaEmGreaterThanEqual(Long usuarioId, java.time.Instant desde);

    @Query(value = """
            SELECT q.materia AS materia, COUNT(a.id) AS respondidas,
                   SUM(CASE WHEN a.acertou = TRUE THEN 1 ELSE 0 END) AS acertos
            FROM attempts a
            JOIN questions q ON q.id = a.question_id
            WHERE a.usuario_id = :usuarioId
              AND (:concurso IS NULL OR :concurso = '' OR UPPER(:concurso) = 'TODOS'
                OR EXISTS (
                    SELECT 1
                    FROM question_concursos qc
                    WHERE qc.question_id = q.id AND qc.concurso = :concurso
                ))
            GROUP BY q.materia
            ORDER BY COUNT(a.id) DESC
            """, nativeQuery = true)
    List<MateriaStats> findMateriaStats(@Param("usuarioId") Long usuarioId,
                                        @Param("concurso") String concurso);

    /** Serie diaria de respostas do usuario (para o grafico de evolucao). */
    @Query(value = """
            SELECT CAST(a.criada_em AS DATE) AS dia, COUNT(a.id) AS respondidas,
                   SUM(CASE WHEN a.acertou = TRUE THEN 1 ELSE 0 END) AS acertos
            FROM attempts a
            JOIN questions q ON q.id = a.question_id
            WHERE a.usuario_id = :usuarioId
              AND a.criada_em >= :inicio
              AND (:materia IS NULL OR :materia = '' OR q.materia = :materia)
              AND (:concurso IS NULL OR :concurso = '' OR UPPER(:concurso) = 'TODOS'
                OR EXISTS (
                    SELECT 1
                    FROM question_concursos qc
                    WHERE qc.question_id = q.id AND qc.concurso = :concurso
                ))
            GROUP BY CAST(a.criada_em AS DATE)
            ORDER BY CAST(a.criada_em AS DATE)
            """, nativeQuery = true)
    List<EvolucaoDiaria> findEvolucaoDiaria(@Param("usuarioId") Long usuarioId,
                                            @Param("concurso") String concurso,
                                            @Param("materia") String materia,
                                            @Param("inicio") Instant inicio);

    /** Atribui as respostas legadas (sem dono) ao usuario administrador. */
    @Modifying
    @Query("UPDATE Attempt a SET a.usuarioId = :usuarioId WHERE a.usuarioId IS NULL")
    int assignLegacyTo(@Param("usuarioId") Long usuarioId);

    void deleteByUsuarioId(Long usuarioId);

    List<Attempt> findByUsuarioIdOrderByCriadaEmDesc(Long usuarioId);

    interface MateriaStats {
        String getMateria();
        long getRespondidas();
        long getAcertos();
    }

    interface EvolucaoDiaria {
        java.time.LocalDate getDia();
        long getRespondidas();
        long getAcertos();
    }
}
