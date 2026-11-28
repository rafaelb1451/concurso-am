package com.concurso.repo;

import com.concurso.domain.TutorUso;
import com.concurso.domain.TutorUsoId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

public interface TutorUsoRepository extends JpaRepository<TutorUso, TutorUsoId> {

    /**
     * Incremento atomico do contador do dia. Retorna 0 quando ainda nao existe linha, caso em
     * que o chamador cria a primeira com {@code usado = 1} (e trata a corrida com retry).
     */
    @Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            UPDATE TutorUso t
               SET t.usado = t.usado + 1
             WHERE t.id.usuarioId = :usuarioId
               AND t.id.dia = :dia
            """)
    int incrementar(@Param("usuarioId") Long usuarioId, @Param("dia") LocalDate dia);

    /** Apaga o contador de uso do Tutor do usuário (direito ao esquecimento — LGPD). */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM TutorUso t WHERE t.id.usuarioId = :usuarioId")
    int deleteByUsuarioId(@Param("usuarioId") Long usuarioId);
}
