package com.concurso.service;

import com.concurso.domain.Assinatura;
import com.concurso.domain.EventoPagamento;
import com.concurso.domain.Plano;
import com.concurso.domain.StatusAssinatura;
import com.concurso.domain.Usuario;
import com.concurso.repo.AssinaturaRepository;
import com.concurso.repo.EventoPagamentoRepository;
import com.concurso.repo.PlanoRepository;
import com.concurso.repo.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Ações administrativas de assinatura: conceder PRO por cortesia/suporte e revogar.
 *
 * <p>Não existe pagamento envolvido; por isso toda ação grava um evento de auditoria
 * ({@code eventos_pagamento} com gateway {@code manual}) contendo quem concedeu, para quem,
 * plano e prazo. É o único caminho legítimo de liberar acesso sem pagamento.</p>
 */
@Service
public class AdminAssinaturaService {

    private static final Logger log = LoggerFactory.getLogger(AdminAssinaturaService.class);
    private static final String GATEWAY_MANUAL = "manual";

    private final UsuarioRepository usuarios;
    private final PlanoRepository planos;
    private final AssinaturaRepository assinaturas;
    private final EventoPagamentoRepository eventos;
    private final ObjectMapper mapper;

    public AdminAssinaturaService(UsuarioRepository usuarios, PlanoRepository planos,
                                  AssinaturaRepository assinaturas, EventoPagamentoRepository eventos,
                                  ObjectMapper mapper) {
        this.usuarios = usuarios;
        this.planos = planos;
        this.assinaturas = assinaturas;
        this.eventos = eventos;
        this.mapper = mapper;
    }

    @Transactional
    public Assinatura conceder(String email, String planoCodigo, int dias, Long adminId) {
        if (dias < 1 || dias > 3650) {
            throw new IllegalArgumentException("Informe um prazo entre 1 e 3650 dias.");
        }
        Usuario usuario = usuarios.findByEmail(normalizar(email))
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));
        Plano plano = planos.findByCodigo(planoCodigo == null ? "" : planoCodigo.trim().toUpperCase())
                .orElseThrow(() -> new IllegalArgumentException("Plano inexistente."));
        if (!plano.pago() || !plano.isAtivo()) {
            throw new IllegalArgumentException("Este plano nao pode ser concedido.");
        }

        // Concessao manual sempre cria uma linha propria: nao sobrescreve um checkout
        // pendente do aluno (o que misturaria plano pago com cortesia).
        Assinatura assinatura = new Assinatura();
        Instant agora = Instant.now();
        assinatura.setUsuarioId(usuario.getId());
        assinatura.setPlanoId(plano.getId());
        assinatura.setGateway(GATEWAY_MANUAL);
        assinatura.setStatus(StatusAssinatura.ATIVA);
        assinatura.setCancelaNoFim(false);
        assinatura.setCarenciaFim(null);
        assinatura.setPeriodoInicio(agora);
        assinatura.setPeriodoFim(agora.plus(dias, ChronoUnit.DAYS));
        assinaturas.save(assinatura);

        registrar("CONCESSAO_MANUAL", usuario, adminId, Map.of(
                "plano", plano.getCodigo(),
                "dias", dias,
                "periodoFim", assinatura.getPeriodoFim().toString()));
        log.info("Admin {} concedeu {} por {} dias para {}", adminId, plano.getCodigo(), dias, usuario.getEmail());
        return assinatura;
    }

    @Transactional
    public Assinatura revogar(String email, Long adminId) {
        Usuario usuario = usuarios.findByEmail(normalizar(email))
                .orElseThrow(() -> new IllegalArgumentException("Usuario nao encontrado."));
        java.util.List<Assinatura> doUsuario =
                assinaturas.findByUsuarioIdOrderByCriadaEmDesc(usuario.getId());
        Assinatura assinatura = doUsuario.stream()
                .filter(Assinatura::liberaPro)
                .max(java.util.Comparator.comparing(
                        a -> a.getPeriodoFim() == null ? Instant.EPOCH : a.getPeriodoFim()))
                .or(() -> doUsuario.stream().findFirst())
                .orElseThrow(() -> new IllegalArgumentException("Este usuario nao tem assinatura."));

        assinatura.setStatus(StatusAssinatura.EXPIRADA);
        assinatura.setCancelaNoFim(true);
        assinatura.setPeriodoFim(Instant.now());
        assinaturas.save(assinatura);

        registrar("REVOGACAO_MANUAL", usuario, adminId, Map.of("assinaturaId", String.valueOf(assinatura.getId())));
        log.info("Admin {} revogou o acesso de {}", adminId, usuario.getEmail());
        return assinatura;
    }

    /** Lista usuários para o painel (opcionalmente filtrando por nome/e-mail). */
    public java.util.List<Usuario> listar(String busca) {
        String termo = busca == null ? "" : busca.trim().toLowerCase();
        return usuarios.findAll().stream()
                .filter(u -> termo.isEmpty()
                        || u.getEmail().toLowerCase().contains(termo)
                        || (u.getNome() != null && u.getNome().toLowerCase().contains(termo)))
                .sorted(java.util.Comparator.comparing(Usuario::getId))
                .toList();
    }

    private void registrar(String tipo, Usuario usuario, Long adminId, Map<String, Object> detalhes) {
        EventoPagamento evento = new EventoPagamento();
        evento.setGateway(GATEWAY_MANUAL);
        evento.setGatewayEventId(tipo + ":" + UUID.randomUUID());
        evento.setTipo(tipo);
        Map<String, Object> payload = new LinkedHashMap<>(detalhes);
        payload.put("adminId", adminId);
        payload.put("usuarioId", usuario.getId());
        payload.put("email", usuario.getEmail());
        evento.setPayload(mapper.writeValueAsString(payload));
        evento.setUsuarioId(usuario.getId());
        eventos.save(evento);
    }

    private static String normalizar(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
