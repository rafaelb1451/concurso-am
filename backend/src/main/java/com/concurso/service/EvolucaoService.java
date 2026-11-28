package com.concurso.service;

import com.concurso.domain.SessaoEstudo;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.SessaoEstudoRepository;
import com.concurso.web.Dtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/** Evolucao no tempo e tempo de estudo por materia, tudo por usuario. */
@Service
public class EvolucaoService {

    private static final int TETO_DURACAO_SEGUNDOS = 24 * 3600;

    private final AttemptRepository attempts;
    private final SessaoEstudoRepository estudos;
    private final AcessoService acesso;

    public EvolucaoService(AttemptRepository attempts, SessaoEstudoRepository estudos,
                           AcessoService acesso) {
        this.attempts = attempts;
        this.estudos = estudos;
        this.acesso = acesso;
    }

    @Transactional(readOnly = true)
    public Dtos.EvolucaoView evolucao(Long usuarioId, String concurso, String materia,
                                      String banca, int dias) {
        int janela = Math.max(1, Math.min(365, dias));
        Instant inicio = Instant.now().minus(Duration.ofDays(janela));
        String filtroBanca = banca == null || banca.isBlank() ? null : banca;

        List<Dtos.EvolucaoPonto> pontos = new ArrayList<>();
        long respondidas = 0;
        long acertos = 0;
        Set<String> escopo = acesso.certamesDe(usuarioId);
        boolean todos = concurso == null || concurso.isBlank() || "TODOS".equalsIgnoreCase(concurso);
        List<AttemptRepository.EvolucaoDiaria> linhas;
        if (!todos) {
            acesso.exigirEscopo(usuarioId, Set.of(concurso));
            linhas = attempts.findEvolucaoDiaria(usuarioId, concurso, materia, filtroBanca, inicio);
        } else if (!escopo.isEmpty()) {
            linhas = attempts.findEvolucaoDiariaPorEscopo(usuarioId, escopo, materia, filtroBanca, inicio);
        } else {
            linhas = attempts.findEvolucaoDiaria(usuarioId, concurso, materia, filtroBanca, inicio);
        }
        for (AttemptRepository.EvolucaoDiaria linha : linhas) {
            respondidas += linha.getRespondidas();
            acertos += linha.getAcertos();
            pontos.add(new Dtos.EvolucaoPonto(
                    linha.getDia().toString(),
                    linha.getRespondidas(),
                    linha.getAcertos(),
                    percentual(linha.getAcertos(), linha.getRespondidas())));
        }

        long tempo = materia == null || materia.isBlank()
                ? estudos.somarTempo(usuarioId)
                : estudos.somarTempoPorMateria(usuarioId, materia);

        return new Dtos.EvolucaoView(respondidas, acertos,
                percentual(acertos, respondidas), tempo, pontos);
    }

    @Transactional
    public void registrarEstudo(Long usuarioId, String materia, int duracaoSegundos) {
        if (duracaoSegundos <= 0) {
            throw new IllegalArgumentException("Duração de estudo inválida.");
        }
        SessaoEstudo sessao = new SessaoEstudo();
        sessao.setUsuarioId(usuarioId);
        sessao.setMateria(materia == null || materia.isBlank() ? null : materia.trim());
        sessao.setDuracaoSegundos(Math.min(duracaoSegundos, TETO_DURACAO_SEGUNDOS));
        estudos.save(sessao);
    }

    private static double percentual(long acertos, long respondidas) {
        return respondidas == 0 ? 0 : Math.round(acertos * 1000.0 / respondidas) / 10.0;
    }
}
