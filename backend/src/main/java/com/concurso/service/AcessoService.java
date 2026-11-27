package com.concurso.service;

import com.concurso.domain.Plano;
import com.concurso.repo.AttemptRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Decisão central de "esse aluno pode acessar o quê".
 *
 * <p>O plano efetivo vem da assinatura (liberada só pelo webhook). O limite diário do FREE é
 * contado a partir das respostas do próprio dia — não existe contador paralelo para ficar
 * dessincronizado.</p>
 */
@Service
public class AcessoService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private final AssinaturaService assinaturas;
    private final AttemptRepository attempts;

    public AcessoService(AssinaturaService assinaturas, AttemptRepository attempts) {
        this.assinaturas = assinaturas;
        this.attempts = attempts;
    }

    public Plano planoDe(Long usuarioId) {
        return assinaturas.planoEfetivo(usuarioId);
    }

    public boolean ilimitado(Long usuarioId) {
        return planoDe(usuarioId).ilimitado();
    }

    public int limiteDiario(Long usuarioId) {
        return planoDe(usuarioId).getLimiteDiarioQuestoes();
    }

    public long respondidasHoje(Long usuarioId) {
        Instant inicioDoDia = LocalDate.now(FUSO).atStartOfDay(FUSO).toInstant();
        return attempts.countByUsuarioIdAndCriadaEmGreaterThanEqual(usuarioId, inicioDoDia);
    }

    /** Lança 429 quando o aluno FREE esgotou o limite do dia (uma resposta). */
    public void exigirDireitoDeResponder(Long usuarioId) {
        exigirDireitoDeResponder(usuarioId, 1);
    }

    /**
     * Lança 429 quando o lote pedido ultrapassa o que resta do limite diário.
     * Usado também na correção de simulado, que grava várias respostas de uma vez.
     */
    public void exigirDireitoDeResponder(Long usuarioId, int lote) {
        if (lote <= 0) {
            return;
        }
        Plano plano = planoDe(usuarioId);
        if (plano.ilimitado()) {
            return;
        }
        long usadas = respondidasHoje(usuarioId);
        if (usadas + lote > plano.getLimiteDiarioQuestoes()) {
            throw new AuthException(HttpStatus.TOO_MANY_REQUESTS,
                    "Voce atingiu o limite de " + plano.getLimiteDiarioQuestoes()
                            + " questoes por dia do plano " + plano.getNome()
                            + ". Assine o PRO para responder sem limite.");
        }
    }
}
