package com.concurso.repo;

import com.concurso.domain.TutorCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface TutorCacheRepository extends JpaRepository<TutorCache, Long> {

    Optional<TutorCache> findByChave(String chave);

    /**
     * Incremento atomico do contador. Um {@code setAcessos(getAcessos()+1)} perderia atualizacoes
     * quando duas requisicoes iguais chegam juntas; o UPDATE direto no banco nao perde.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Transactional
    @Query("update TutorCache c set c.acessos = c.acessos + 1 where c.chave = :chave")
    int incrementarAcessos(@Param("chave") String chave);
}
