package com.concurso.service;

import com.concurso.domain.Assinatura;
import com.concurso.domain.AssinaturaCertame;
import com.concurso.domain.Concursos;
import com.concurso.domain.Plano;
import com.concurso.domain.TutorUso;
import com.concurso.repo.AcessoAuditoriaRepository;
import com.concurso.repo.AssinaturaCertameRepository;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.QuestionRepository;
import com.concurso.repo.TutorUsoRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * Decisão central de "esse aluno pode acessar o quê".
 *
 * <p>O plano efetivo vem da assinatura (liberada só pelo webhook). O limite diário do FREE é
 * contado a partir das respostas do próprio dia — não existe contador paralelo para ficar
 * dessincronizado.</p>
 *
 * <p>A partir do acesso por certame, esta classe também responde pelo escopo contratado
 * ({@link #certamesDe(Long)}), pela cota do Tutor ({@link #podeTutor(Long)}) e pela trilha de
 * auditoria. Toda decisão é server-side: o frontend só reflete o que aqui for permitido.</p>
 */
@Service
public class AcessoService {

    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    public static final String RECURSO_CERTAME = "certame";
    public static final String RECURSO_TUTOR = "tutor";
    public static final String RECURSO_TROCA_CERTAMES = "troca-certames";

    private static final String CTA_PLUS =
            " Conheça o Plus e libere o Tutor de IA e até 3 certames.";

    private final AssinaturaService assinaturas;
    private final AttemptRepository attempts;
    private final AssinaturaCertameRepository certames;
    private final TutorUsoRepository tutorUso;
    private final AcessoAuditoriaRepository auditorias;
    private final AuditoriaService auditoria;
    private final QuestionRepository questions;

    /**
     * Feature flag de canário/rollback do escopo por certame. Quando {@code false}, a regra nova
     * é desligada e {@link #certamesDe(Long)} devolve vazio (sem escopo = comportamento antigo).
     *
     * <p>O gating do Tutor {@link #exigirTutor(Long)} <b>não</b> passa por esta flag: continua
     * derivado do plano ({@link Plano#isTutorIa()} + cota), independentemente do escopo.</p>
     */
    private final boolean escopoPorCertame;

    public AcessoService(AssinaturaService assinaturas, AttemptRepository attempts,
                         AssinaturaCertameRepository certames, TutorUsoRepository tutorUso,
                         AcessoAuditoriaRepository auditorias, AuditoriaService auditoria,
                         QuestionRepository questions,
                         @Value("${concurso.acesso.escopo-por-certame:true}") boolean escopoPorCertame) {
        this.assinaturas = assinaturas;
        this.attempts = attempts;
        this.certames = certames;
        this.tutorUso = tutorUso;
        this.auditorias = auditorias;
        this.auditoria = auditoria;
        this.questions = questions;
        this.escopoPorCertame = escopoPorCertame;
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

    // ------------------------------------------------------------------
    // Escopo por certame
    // ------------------------------------------------------------------

    /**
     * Certames da assinatura ativa. Vazio significa "sem escopo" (FREE ou plano pago legado sem
     * escolha registrada), que trata o conteúdo como amostra/legado e não bloqueia consultas.
     *
     * <p>Assinaturas pagas criadas antes da V4 (ou concedidas manualmente) não têm linhas em
     * {@code assinatura_certames}. Para elas o fallback são todos os certames existentes: o
     * grandfathering da migração faz o mesmo, e o admin ajusta depois.</p>
     */
    @Transactional(readOnly = true)
    public Set<String> certamesDe(Long usuarioId) {
        // Canário/rollback: flag desligada = comportamento antigo (sem escopo por certame).
        // Todo conteúdo volta a ficar visível, como antes da V4; o Tutor segue pelo plano.
        if (!escopoPorCertame) {
            return Set.of();
        }
        if (usuarioId == null) {
            return Set.of();
        }
        Plano plano = planoDe(usuarioId);
        if (!plano.pago()) {
            return Set.of();
        }
        Optional<Assinatura> atual = assinaturas.assinaturaAtual(usuarioId)
                .filter(Assinatura::liberaPro);
        if (atual.isEmpty()) {
            return Set.of();
        }
        Set<String> doBanco = new LinkedHashSet<>();
        for (AssinaturaCertame linha : certames.findByAssinaturaIdOrderByConcursoAsc(atual.get().getId())) {
            String codigo = RegrasCertame.normalizar(linha.getConcurso());
            if (codigo != null) {
                doBanco.add(codigo);
            }
        }
        if (!doBanco.isEmpty()) {
            return Set.copyOf(doBanco);
        }
        // Legado sem escolha explicita: preserva o acesso a todos os certames conhecidos.
        Set<String> legado = new LinkedHashSet<>();
        for (String concurso : questions.findConcursosDistintos()) {
            String codigo = RegrasCertame.normalizar(concurso);
            if (codigo != null) {
                legado.add(codigo);
            }
        }
        return Set.copyOf(legado);
    }

    /** Mesmo conjunto de {@link #certamesDe(Long)}, exposto para o painel/contrato da API. */
    public Set<String> certamesDoPlano(Long usuarioId) {
        return certamesDe(usuarioId);
    }

    /**
     * Certames gravados em uma assinatura especifica, independentemente de ela ja liberar acesso.
     * Usado apenas para exibir a escolha de um checkout PENDENTE — nunca para autorizar conteudo.
     */
    @Transactional(readOnly = true)
    public Set<String> certamesDaAssinatura(Long assinaturaId) {
        if (assinaturaId == null) {
            return Set.of();
        }
        Set<String> saida = new LinkedHashSet<>();
        for (AssinaturaCertame linha : certames.findByAssinaturaIdOrderByConcursoAsc(assinaturaId)) {
            String codigo = RegrasCertame.normalizar(linha.getConcurso());
            if (codigo != null) {
                saida.add(codigo);
            }
        }
        return Set.copyOf(saida);
    }

    /**
     * 403 quando algum certame pedido está fora do escopo. Escopo vazio (FREE/legado) não bloqueia:
     * é o comportamento de amostra definido no produto.
     */
    public void exigirEscopo(Long usuarioId, Collection<String> pedidos) {
        exigirEscopo(usuarioId, pedidos, null);
    }

    public void exigirEscopo(Long usuarioId, Collection<String> pedidos, String ip) {
        if (pedidos == null || pedidos.isEmpty()) {
            return;
        }
        Set<String> escopo = certamesDe(usuarioId);
        if (escopo.isEmpty()) {
            return;
        }
        for (String pedido : pedidos) {
            String concurso = RegrasCertame.normalizar(pedido);
            if (concurso == null || "TODOS".equals(concurso)) {
                continue;
            }
            if (!escopo.contains(concurso)) {
                auditar(usuarioId, ip, RECURSO_CERTAME, concurso, false, "certame fora do plano");
                throw new AuthException(HttpStatus.FORBIDDEN,
                        "O certame " + concurso + " não está incluído no seu plano."
                                + " Troque de certame ou assine o Plus." + CTA_PLUS);
            }
        }
    }

    /** A pergunta (com seus certames) pode ser acessada pelo aluno? */
    public boolean questaoNoEscopo(Long usuarioId, Collection<String> concursosDaQuestao) {
        Set<String> escopo = certamesDe(usuarioId);
        if (escopo.isEmpty()) {
            return true;
        }
        if (concursosDaQuestao == null) {
            return false;
        }
        for (String concurso : concursosDaQuestao) {
            String codigo = RegrasCertame.normalizar(concurso);
            if (codigo != null && escopo.contains(codigo)) {
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------------
    // Tutor de IA
    // ------------------------------------------------------------------

    public boolean podeTutor(Long usuarioId) {
        if (usuarioId == null) {
            return false;
        }
        Plano plano = planoDe(usuarioId);
        if (!plano.isTutorIa()) {
            return false;
        }
        int cota = plano.getCotaTutorDiaria();
        if (cota < 0) {
            return true;
        }
        return usadoTutorHoje(usuarioId) < cota;
    }

    public int usadoTutorHoje(Long usuarioId) {
        if (usuarioId == null) {
            return 0;
        }
        return tutorUso.findById(new com.concurso.domain.TutorUsoId(usuarioId, LocalDate.now(FUSO)))
                .map(TutorUso::getUsado)
                .orElse(0);
    }

    /**
     * 403 com mensagem amigável e CTA quando o plano não tem Tutor ou a cota do dia acabou.
     * A negativa é auditada antes de lançar (a auditoria roda em transação própria).
     */
    public void exigirTutor(Long usuarioId) {
        exigirTutor(usuarioId, null);
    }

    public void exigirTutor(Long usuarioId, String ip) {
        Plano plano = planoDe(usuarioId);
        if (!plano.isTutorIa()) {
            auditar(usuarioId, ip, RECURSO_TUTOR, null, false, "plano sem tutor de IA");
            throw new AuthException(HttpStatus.FORBIDDEN,
                    "O Tutor de IA está disponível apenas no plano Plus." + CTA_PLUS);
        }
        int cota = plano.getCotaTutorDiaria();
        int usado = usadoTutorHoje(usuarioId);
        if (cota >= 0 && usado >= cota) {
            auditar(usuarioId, ip, RECURSO_TUTOR, null, false, "cota diaria do tutor excedida");
            throw new AuthException(HttpStatus.FORBIDDEN,
                    "Você atingiu a cota diária de " + cota + " perguntas ao Tutor do plano "
                            + plano.getNome() + ". A cota renova amanhã; conheça o Plus para mais.");
        }
        auditar(usuarioId, ip, RECURSO_TUTOR, null, true, "tutor liberado");
    }

    /**
     * Incrementa o contador do dia de forma atômica. Não abre transação em volta: cada chamada ao
     * repositório tem sua própria transação, então a corrida do primeiro acesso do dia pode ser
     * tratada com um retry sem contaminar a transação do request.
     */
    public void registrarUsoTutor(Long usuarioId) {
        if (usuarioId == null) {
            return;
        }
        LocalDate dia = LocalDate.now(FUSO);
        if (tutorUso.incrementar(usuarioId, dia) > 0) {
            return;
        }
        try {
            tutorUso.saveAndFlush(new TutorUso(usuarioId, dia, 1));
        } catch (org.springframework.dao.DataIntegrityViolationException corrida) {
            // Outra requisicao criou a linha primeiro; agora o UPDATE atomico encontra a linha.
            tutorUso.incrementar(usuarioId, dia);
        }
    }

    // ------------------------------------------------------------------
    // Troca de certames (1x por ciclo)
    // ------------------------------------------------------------------

    /** A assinatura ativa ainda permite trocar os certames neste ciclo? */
    public boolean podeTrocarCertame(Long usuarioId) {
        Optional<Assinatura> atual = assinaturas.assinaturaAtual(usuarioId)
                .filter(Assinatura::liberaPro);
        if (atual.isEmpty() || !planoDe(usuarioId).pago()) {
            return false;
        }
        Instant inicioCiclo = inicioDoCiclo(atual.get());
        return !auditorias.existsByUsuarioIdAndRecursoAndPermitidoTrueAndCriadaEmGreaterThanEqual(
                usuarioId, RECURSO_TROCA_CERTAMES, inicioCiclo);
    }

    @Transactional
    public List<String> trocarCertames(Long usuarioId, Collection<String> pedidos, String ip) {
        Optional<Assinatura> atual = assinaturas.assinaturaAtual(usuarioId)
                .filter(Assinatura::liberaPro);
        if (atual.isEmpty()) {
            auditar(usuarioId, ip, RECURSO_TROCA_CERTAMES, null, false, "sem assinatura ativa");
            throw new AuthException(HttpStatus.FORBIDDEN,
                    "Assine o Básico ou o Plus para escolher certames.");
        }
        Plano plano = planoDe(usuarioId);
        List<String> novos;
        try {
            novos = RegrasCertame.validar(plano, pedidos);
        } catch (IllegalArgumentException e) {
            auditar(usuarioId, ip, RECURSO_TROCA_CERTAMES, null, false, e.getMessage());
            throw e;
        }
        if (!podeTrocarCertame(usuarioId)) {
            auditar(usuarioId, ip, RECURSO_TROCA_CERTAMES, null, false, "troca ja usada no ciclo");
            throw new AuthException(HttpStatus.CONFLICT,
                    "Você já trocou os certames neste ciclo. A troca fica disponível na próxima renovação.");
        }

        Long assinaturaId = atual.get().getId();
        certames.apagarPorAssinatura(assinaturaId);
        for (String concurso : novos) {
            certames.save(new AssinaturaCertame(assinaturaId, concurso));
        }
        certames.flush();
        auditar(usuarioId, ip, RECURSO_TROCA_CERTAMES, String.join(",", novos), true,
                "certames atualizados");
        return novos;
    }

    /**
     * Exceção manual do admin: define os certames da assinatura ativa sem respeitar o limite do
     * plano (casos de bloqueio indevido ou cortesia). Valida apenas o formato dos códigos.
     */
    @Transactional
    public List<String> definirCertamesAdmin(Long usuarioId, Collection<String> pedidos,
                                             Long adminId, String ip) {
        Optional<Assinatura> atual = assinaturas.assinaturaAtual(usuarioId)
                .filter(Assinatura::liberaPro);
        if (atual.isEmpty()) {
            auditar(usuarioId, ip, RECURSO_TROCA_CERTAMES, null, false,
                    "admin: sem assinatura ativa");
            throw new AuthException(HttpStatus.BAD_REQUEST,
                    "O usuário não tem assinatura ativa. Conceda um plano primeiro.");
        }
        LinkedHashSet<String> novos = new LinkedHashSet<>();
        if (pedidos != null) {
            for (String p : pedidos) {
                String c = RegrasCertame.normalizar(p);
                if (c != null && !"TODOS".equals(c)) {
                    novos.add(c);
                }
            }
        }
        Long assinaturaId = atual.get().getId();
        certames.apagarPorAssinatura(assinaturaId);
        for (String c : novos) {
            certames.save(new AssinaturaCertame(assinaturaId, c));
        }
        certames.flush();
        auditar(usuarioId, ip, RECURSO_TROCA_CERTAMES, String.join(",", novos), true,
                "admin ajustou certames (exceção)");
        return new ArrayList<>(novos);
    }

    private static Instant inicioDoCiclo(Assinatura assinatura) {
        if (assinatura.getPeriodoInicio() != null) {
            return assinatura.getPeriodoInicio();
        }
        return assinatura.getCriadaEm() == null ? Instant.EPOCH : assinatura.getCriadaEm();
    }

    // ------------------------------------------------------------------
    // Limite diario de questoes
    // ------------------------------------------------------------------

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
                    "Você atingiu o limite de " + plano.getLimiteDiarioQuestoes()
                            + " questões por dia do plano " + plano.getNome()
                            + ". Assine o Básico ou o Plus para responder sem limite.");
        }
    }

    // ------------------------------------------------------------------
    // Auditoria
    // ------------------------------------------------------------------

    public void auditar(Long usuarioId, String ip, String recurso, String concurso,
                        boolean permitido, String motivo) {
        auditoria.registrar(usuarioId, ip, recurso,
                concurso == null ? null : Concursos.normalizar(concurso),
                permitido, motivo);
    }
}
