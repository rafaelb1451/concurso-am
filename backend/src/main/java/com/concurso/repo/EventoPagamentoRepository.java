package com.concurso.repo;

import com.concurso.domain.EventoPagamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EventoPagamentoRepository extends JpaRepository<EventoPagamento, Long> {

    Optional<EventoPagamento> findByGatewayAndGatewayEventId(String gateway, String gatewayEventId);

    void deleteByUsuarioId(Long usuarioId);
}