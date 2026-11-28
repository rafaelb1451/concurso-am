package com.concurso.service;

import com.concurso.domain.AcessoAuditoria;
import com.concurso.repo.AcessoAuditoriaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;

/**
 * Grava a trilha de auditoria em transacao propria.
 *
 * <p>Uma negacao lanca excecao e a transacao do request e' desfeita; como o registro roda em
 * {@code REQUIRES_NEW}, ele sobrevive ao rollback. O {@link TransactionTemplate} e' usado de
 * proposito: o commit acontece dentro do {@code execute}, entao uma falha de banco na auditoria
 * tambem fica contida e nao derruba a regra de acesso.</p>
 */
@Service
public class AuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(AuditoriaService.class);

    private final AcessoAuditoriaRepository auditorias;
    private final TransactionTemplate transacao;

    public AuditoriaService(AcessoAuditoriaRepository auditorias,
                            PlatformTransactionManager gerenciadorDeTransacoes) {
        this.auditorias = auditorias;
        this.transacao = new TransactionTemplate(gerenciadorDeTransacoes);
        this.transacao.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public void registrar(Long usuarioId, String ip, String recurso, String concurso,
                          boolean permitido, String motivo) {
        try {
            transacao.executeWithoutResult(status -> {
                AcessoAuditoria registro = new AcessoAuditoria();
                registro.setUsuarioId(usuarioId);
                registro.setIp(cortar(ip, 64));
                registro.setRecurso(cortar(recurso, 120));
                registro.setConcurso(cortar(concurso, 20));
                registro.setPermitido(permitido);
                registro.setMotivo(cortar(motivo, 120));
                registro.setCriadaEm(Instant.now());
                auditorias.save(registro);
            });
        } catch (RuntimeException e) {
            log.warn("Nao foi possivel gravar auditoria de acesso (usuario {}, recurso {}): {}",
                    usuarioId, recurso, e.getMessage());
        }
    }

    private static String cortar(String valor, int maximo) {
        if (valor == null) {
            return null;
        }
        String limpo = valor.strip();
        if (limpo.isEmpty()) {
            return null;
        }
        return limpo.length() <= maximo ? limpo : limpo.substring(0, maximo);
    }
}
