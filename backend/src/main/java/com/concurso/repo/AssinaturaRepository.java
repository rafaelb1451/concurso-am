package com.concurso.repo;

import com.concurso.domain.Assinatura;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AssinaturaRepository extends JpaRepository<Assinatura, Long> {

    Optional<Assinatura> findFirstByUsuarioIdOrderByCriadaEmDesc(Long usuarioId);

    Optional<Assinatura> findByGatewayAndGatewaySubscriptionId(String gateway, String gatewaySubscriptionId);

    Optional<Assinatura> findByGatewayAndGatewayCheckoutId(String gateway, String gatewayCheckoutId);

    void deleteByUsuarioId(Long usuarioId);
}