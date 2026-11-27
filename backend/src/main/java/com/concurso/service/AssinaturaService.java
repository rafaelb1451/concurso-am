package com.concurso.service;

import com.concurso.domain.Assinatura;
import com.concurso.domain.EventoPagamento;
import com.concurso.domain.Plano;
import com.concurso.domain.StatusAssinatura;
import com.concurso.integration.payment.PaymentGateway;
import com.concurso.repo.AssinaturaRepository;
import com.concurso.repo.EventoPagamentoRepository;
import com.concurso.repo.PlanoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/**
 * Regras de assinatura: iniciar checkout, aplicar webhooks (idempotente) e cancelar.
 *
 * <p>Quem libera acesso é o <b>webhook</b>, nunca o retorno do navegador: o aluno pode fechar a
 * página antes de voltar, e o retorno da URL de sucesso é apenas informativo.</p>
 */
@Service
public class AssinaturaService {

    private static final Logger log = LoggerFactory.getLogger(AssinaturaService.class);

    /** Dias de acesso após uma falha de renovação antes de bloquear. */
    private static final int DIAS_CARENCIA = 5;

    public enum ResultadoWebhook {
        PROCESSADO, DUPLICADO, IGNORADO
    }

    private final PaymentGateway gateway;
    private final PlanoRepository planos;
    private final AssinaturaRepository assinaturas;
    private final EventoPagamentoRepository eventos;
    private final String urlApp;

    public AssinaturaService(PaymentGateway gateway, PlanoRepository planos,
                            AssinaturaRepository assinaturas, EventoPagamentoRepository eventos,
                            @Value("${concurso.app.url:http://localhost:5173}") String urlApp) {
        this.gateway = gateway;
        this.planos = planos;
        this.assinaturas = assinaturas;
        this.eventos = eventos;
        this.urlApp = urlApp;
    }

    public boolean pagamentoConfigurado() {
        return gateway.configurado();
    }

    /** Validacao de autenticidade do webhook, exposta para o controller limitar apos validar. */
    public boolean webhookValido(PaymentGateway.WebhookRequest requisicao) {
        return gateway.webhookValido(requisicao);
    }

    /** Variante por token (usada pelo gateway Asaas). */
    public boolean webhookValido(String token) {
        return gateway.webhookValido(token);
    }

    /** Plano atual do aluno: o pago, se estiver liberado; senão FREE. */
    @Transactional(readOnly = true)
    public Plano planoEfetivo(Long usuarioId) {
        Optional<Assinatura> assinatura = vigente(usuarioId);
        if (assinatura.isPresent() && assinatura.get().liberaPro()) {
            Optional<Plano> pago = planos.findById(assinatura.get().getPlanoId());
            if (pago.isPresent()) {
                return pago.get();
            }
        }
        return planos.findByCodigo(Plano.FREE)
                .orElseThrow(() -> new IllegalStateException("Plano FREE nao cadastrado."));
    }

    public Optional<Assinatura> assinaturaAtual(Long usuarioId) {
        return vigente(usuarioId);
    }

    /**
     * Assinatura que vale hoje. Com uma linha por checkout podem coexistir varias
     * (ex.: anual pendente + mensal ativa); a vigente e' a que libera acesso por mais tempo.
     */
    Optional<Assinatura> vigente(Long usuarioId) {
        java.util.List<Assinatura> todas = assinaturas.findByUsuarioIdOrderByCriadaEmDesc(usuarioId);
        Optional<Assinatura> liberando = todas.stream()
                .filter(Assinatura::liberaPro)
                .max(java.util.Comparator.comparing(
                        a -> a.getPeriodoFim() == null ? Instant.EPOCH : a.getPeriodoFim()));
        if (liberando.isPresent()) {
            return liberando;
        }
        return todas.stream()
                .filter(a -> a.getStatus() == StatusAssinatura.PENDENTE)
                .findFirst()
                .or(() -> todas.stream().findFirst());
    }

    /**
     * Cria o checkout hospedado para um plano pago e guarda a assinatura como PENDENTE.
     *
     * @return URL da página de pagamento
     */
    @Transactional
    public String iniciarCheckout(Long usuarioId, Long planoId, PaymentGateway.DadosCliente cliente) {
        if (!gateway.configurado()) {
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Pagamento indisponivel no momento. Tente mais tarde.");
        }
        Plano plano = planos.findById(planoId)
                .orElseThrow(() -> new IllegalArgumentException("Plano inexistente."));
        if (!plano.pago() || !plano.isAtivo()) {
            throw new IllegalArgumentException("Este plano nao pode ser assinado.");
        }

        String referencia = "usuario:" + usuarioId + ":plano:" + plano.getCodigo();
        PaymentGateway.CheckoutCriado checkout = gateway.criarCheckout(new PaymentGateway.DadosCheckout(
                cliente,
                plano.getCodigo(),
                plano.getNome(),
                plano.getValorCentavos(),
                plano.getCiclo(),
                referencia,
                urlApp + "/?assinatura=sucesso",
                urlApp + "/assinatura/cancelado"));

        // Uma linha por checkout: reutilizar a PENDENTE fazia o webhook aplicar o plano
        // do checkout mais recente, nao o plano efetivamente pago (ver auditoria A-01).
        Assinatura assinatura = new Assinatura();
        assinatura.setUsuarioId(usuarioId);
        assinatura.setPlanoId(plano.getId());
        assinatura.setGateway(gateway.id());
        assinatura.setGatewayCheckoutId(checkout.id());
        assinatura.setStatus(StatusAssinatura.PENDENTE);
        assinaturas.save(assinatura);

        return checkout.url();
    }

    /**
     * Aplica um webhook do gateway.
     *
     * <p>Idempotência em duas camadas: consulta pelo id do evento e, se duas requisições
     * chegarem juntas, a restrição única de {@code (gateway, gateway_event_id)} barra a segunda.</p>
     */
    @Transactional
    public ResultadoWebhook processarWebhook(String token, String corpoBruto) {
        return processarWebhook(new PaymentGateway.WebhookRequest(token, null, null, corpoBruto));
    }

    @Transactional
    public ResultadoWebhook processarWebhook(PaymentGateway.WebhookRequest requisicao) {
        if (!gateway.webhookValido(requisicao)) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Token de webhook invalido.");
        }

        String corpoBruto = requisicao.body();
        PaymentGateway.EventoWebhook evento = gateway.traduzir(corpoBruto);
        if (eventos.findByGatewayAndGatewayEventId(gateway.id(), evento.id()).isPresent()) {
            log.info("Webhook {} repetido ({}); ignorando.", evento.tipo(), evento.id());
            return ResultadoWebhook.DUPLICADO;
        }

        Assinatura assinatura = localizar(evento);
        if (assinatura == null) {
            // evento de algo que nao e' nosso: registra para auditoria e nao aplica nada
            registrarEvento(evento, corpoBruto, null);
            return ResultadoWebhook.IGNORADO;
        }
        if (!valorConfere(assinatura, evento)) {
            // valor/moeda divergentes do plano: registra e nao libera acesso
            registrarEvento(evento, corpoBruto, assinatura.getUsuarioId());
            return ResultadoWebhook.IGNORADO;
        }

        aplicar(assinatura, evento);
        assinaturas.save(assinatura);
        registrarEvento(evento, corpoBruto, assinatura.getUsuarioId());
        return ResultadoWebhook.PROCESSADO;
    }

    private Assinatura localizar(PaymentGateway.EventoWebhook evento) {
        if (!evento.assinaturaId().isBlank()) {
            Optional<Assinatura> porId = assinaturas
                    .findByGatewayAndGatewaySubscriptionId(gateway.id(), evento.assinaturaId());
            if (porId.isPresent()) {
                return porId.get();
            }
        }
        if (!evento.checkoutId().isBlank()) {
            Optional<Assinatura> porCheckout = assinaturas
                    .findByGatewayAndGatewayCheckoutId(gateway.id(), evento.checkoutId());
            if (porCheckout.isPresent()) {
                return porCheckout.get();
            }
        }

        Referencia ref = referencia(evento.referenciaExterna());
        if (ref == null) {
            return null;
        }
        // Casa usuario E plano pagos: um pagamento de PRO_MENSAL nunca ativa PRO_ANUAL.
        Assinatura mesmaFamilia = null;
        for (Assinatura candidata : assinaturas.findByUsuarioIdOrderByCriadaEmDesc(ref.usuarioId())) {
            Plano plano = planos.findById(candidata.getPlanoId()).orElse(null);
            if (plano == null || !plano.getCodigo().equalsIgnoreCase(ref.planoCodigo())) {
                continue;
            }
            if (candidata.getStatus() == StatusAssinatura.PENDENTE) {
                return candidata;
            }
            if (mesmaFamilia == null) {
                mesmaFamilia = candidata;
            }
        }
        return mesmaFamilia;
    }

    /**
     * Confere o valor e a moeda do evento contra o preco do plano no banco.
     * Eventos sem valor informado ({@code -1}) sao aceitos para nao quebrar gateways
     * que nao enviam o montante em todos os tipos de notificacao.
     */
    private boolean valorConfere(Assinatura assinatura, PaymentGateway.EventoWebhook evento) {
        if (evento.valorCentavos() < 0) {
            return true;
        }
        if (evento.moeda() != null && !evento.moeda().isBlank()
                && !"BRL".equalsIgnoreCase(evento.moeda())) {
            log.warn("Webhook ignorado: moeda {} (esperado BRL).", evento.moeda());
            return false;
        }
        int esperado = planos.findById(assinatura.getPlanoId())
                .map(Plano::getValorCentavos)
                .orElse(-1);
        if (esperado != evento.valorCentavos()) {
            log.warn("Webhook ignorado: valor divergente para o plano {} (esperado {} centavos, recebido {}).",
                    assinatura.getPlanoId(), esperado, evento.valorCentavos());
            return false;
        }
        return true;
    }

    private void aplicar(Assinatura assinatura, PaymentGateway.EventoWebhook evento) {
        String tipo = evento.tipo();
        if (evento.pago()) {
            Instant agora = Instant.now();
            assinatura.setStatus(StatusAssinatura.ATIVA);
            assinatura.setCarenciaFim(null);
            assinatura.setCancelaNoFim(false);
            assinatura.setPeriodoInicio(agora);
            assinatura.setPeriodoFim(fimDoPeriodo(agora, assinatura.getPlanoId()));
            return;
        }
        switch (tipo) {
            case "PAYMENT_OVERDUE" -> {
                assinatura.setStatus(StatusAssinatura.EM_ATRASO);
                Instant base = assinatura.getPeriodoFim() != null ? assinatura.getPeriodoFim() : Instant.now();
                assinatura.setCarenciaFim(base.plus(DIAS_CARENCIA, ChronoUnit.DAYS));
            }
            case "PAYMENT_REFUNDED" -> {
                // estorno: corta o acesso na hora (nao espera o fim do periodo)
                assinatura.setStatus(StatusAssinatura.EXPIRADA);
                assinatura.setCancelaNoFim(true);
                assinatura.setPeriodoFim(Instant.now());
            }
            case "SUBSCRIPTION_DELETED", "SUBSCRIPTION_INACTIVATED" -> {
                assinatura.setStatus(StatusAssinatura.CANCELADA);
                assinatura.setCancelaNoFim(true);
            }
            case "PAYMENT_EXPIRED" -> {
                assinatura.setStatus(StatusAssinatura.EXPIRADA);
                assinatura.setCancelaNoFim(true);
            }
            default -> {
                // eventos sem efeito de acesso (ex.: SUBSCRIPTION_CREATED)
            }
        }
    }

    /** Fim do periodo pago: um mes ou um ano de calendario (Instant nao suporta meses). */
    private Instant fimDoPeriodo(Instant inicio, Long planoId) {
        boolean anual = planos.findById(planoId)
                .map(p -> "ANUAL".equalsIgnoreCase(p.getCiclo()))
                .orElse(false);
        java.time.ZonedDateTime data = inicio.atZone(java.time.ZoneId.of("America/Sao_Paulo"));
        return (anual ? data.plusYears(1) : data.plusMonths(1)).toInstant();
    }

    private void registrarEvento(PaymentGateway.EventoWebhook evento, String corpo, Long usuarioId) {
        EventoPagamento registro = new EventoPagamento();
        registro.setGateway(gateway.id());
        registro.setGatewayEventId(evento.id());
        registro.setTipo(evento.tipo());
        registro.setPayload(corpo != null && corpo.length() > 20000 ? corpo.substring(0, 20000) : corpo);
        registro.setUsuarioId(usuarioId);
        try {
            eventos.save(registro);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // corrida: outra requisicao gravou o mesmo evento primeiro
            log.info("Evento {} gravado em paralelo; ignorando duplicata.", evento.id());
        }
    }

    private record Referencia(Long usuarioId, String planoCodigo) {
    }

    /** Formato combinado com o checkout: {@code usuario:<id>:plano:<codigo>}. */
    private static Referencia referencia(String valor) {
        if (valor == null || !valor.startsWith("usuario:")) {
            return null;
        }
        String[] partes = valor.split(":");
        if (partes.length < 4 || !"plano".equals(partes[2])) {
            return null;
        }
        try {
            return new Referencia(Long.parseLong(partes[1]), partes[3]);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Cancela a renovação; o acesso continua até o fim do período já pago. */
    @Transactional
    public void cancelar(Long usuarioId) {
        Assinatura assinatura = vigente(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Nao existe assinatura para cancelar."));
        if (assinatura.getStatus() != StatusAssinatura.ATIVA
                && assinatura.getStatus() != StatusAssinatura.EM_ATRASO) {
            throw new IllegalArgumentException("A assinatura nao esta ativa.");
        }
        gateway.cancelarAssinatura(assinatura.getGatewaySubscriptionId());
        assinatura.setStatus(StatusAssinatura.CANCELADA);
        assinatura.setCancelaNoFim(true);
        assinaturas.save(assinatura);
    }
}
