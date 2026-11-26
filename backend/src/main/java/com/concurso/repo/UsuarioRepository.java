package com.concurso.repo;

import com.concurso.domain.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Registra uma tentativa de login falha de forma atomica, independente da transacao chamadora
     * que em seguida lança excecao. Incrementa o contador e bloqueia a conta ao atingir o limite.
     */
    @Modifying
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Query("""
            UPDATE Usuario u SET
              u.tentativasFalhas = u.tentativasFalhas + 1,
              u.bloqueadoAte = CASE WHEN u.tentativasFalhas + 1 >= :limite THEN :bloqueadoAte ELSE u.bloqueadoAte END
            WHERE u.id = :id
            """)
    int registrarFalhaLogin(@Param("id") Long id,
                            @Param("limite") int limite,
                            @Param("bloqueadoAte") Instant bloqueadoAte);

    /** Zera o contador de falhas e libera o bloqueio (login bem-sucedido ou bloqueio expirado). */
    @Modifying
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Query("UPDATE Usuario u SET u.tentativasFalhas = 0, u.bloqueadoAte = NULL WHERE u.id = :id")
    int limparFalhas(@Param("id") Long id);
}
