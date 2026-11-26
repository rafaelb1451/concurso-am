package com.concurso.service;

import com.concurso.domain.Assinatura;
import com.concurso.domain.EventoPagamento;
import com.concurso.domain.Plano;
import com.concurso.domain.StatusAssinatura;
import com.concurso.integration.payment.PaymentGateway;
import com.concurso.repo.AssinaturaRepository;
import com.concurso.repo.EventoPagamentoRepository;
import com.concurso.repo.PlanoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regras do webhook de pagamento: token obrigatório, idempotência e transições de estado.
 *
 * <p>O gateway é substituído por um dublê: o que está sob teste é a decisão de negócio, não a
 * chamada HTTP.</p>
 */
@ExtendWith(MockitoExtension.class)
class AssinaturaServiceTest {

    @Mock private PlanoRepository planos;
    @Mock private AssinaturaRepository assinaturas;
    @Mock private EventoPagamentoRepository eventos;

    private GatewayFake gateway;
    private AssinaturaService service;

    @BeforeEach
    void setUp() {
        gateway = new GatewayFake();
        service = new AssinaturaService(gateway, planos, assinaturas, eventos, "https://qb.test");
        Plano mensal = new Plano();
        mensal.setCodigo(Plano.PRO_MENSAL);
        mensal.setNome("PRO mensal");
        mensal.setCiclo("MENSAL");
        mensal.setLimiteDiarioQuestoes(-1);
        lenient().when(planos.findById(1L)).thenReturn(Optional.of(mensal));
    }

    private Assinatura assinaturaAtiva() {
        Assinatura a = new Assinatura();
        a.setUsuarioId(7L);
        a.setPlanoId(1L);
        a.setGateway("fake");
        a.setGatewaySubscriptionId("sub_1");
        a.setStatus(StatusAssinatura.ATIVA);
        a.setPeriodoFim(Instant.now().plusSeconds(3600));
        return a;
    }

    @Test
    @DisplayName("webhook com token invalido e' rejeitado com 401")
    void rejeitaTokenInvalido() {
        gateway.tokenValido = false;

        assertThatThrownBy(() -> service.processarWebhook("token-errado", "{}"))
                .isInstanceOf(AuthException.class)
                .extracting(e -> ((AuthException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        verify(eventos, never()).save(any());
    }

    @Test
    @DisplayName("evento duplicado nao aplica efeito de novo")
    void eventoDuplicadoNaoReprocessa() {
        when(eventos.findByGatewayAndGatewayEventId("fake", "evt-1"))
                .thenReturn(Optional.of(new EventoPagamento()));

        AssinaturaService.ResultadoWebhook resultado = service.processarWebhook("ok", "{}");

        assertThat(resultado).isEqualTo(AssinaturaService.ResultadoWebhook.DUPLICADO);
        verify(assinaturas, never()).save(any());
    }

    @Test
    @DisplayName("pagamento confirmado ativa a assinatura e libera o PRO")
    void pagamentoConfirmadoAtiva() {
        Assinatura assinatura = assinaturaAtiva();
        assinatura.setStatus(StatusAssinatura.PENDENTE);
        when(eventos.findByGatewayAndGatewayEventId("fake", "evt-1")).thenReturn(Optional.empty());
        when(assinaturas.findByGatewayAndGatewaySubscriptionId("fake", "sub_1"))
                .thenReturn(Optional.of(assinatura));
        gateway.tipo = "PAYMENT_CONFIRMED";
        gateway.pago = true;

        AssinaturaService.ResultadoWebhook resultado = service.processarWebhook("ok", "{}");

        assertThat(resultado).isEqualTo(AssinaturaService.ResultadoWebhook.PROCESSADO);
        assertThat(assinatura.getStatus()).isEqualTo(StatusAssinatura.ATIVA);
        assertThat(assinatura.getPeriodoFim()).isAfter(Instant.now());
        assertThat(assinatura.liberaPro()).isTrue();
        verify(assinaturas).save(assinatura);
        verify(eventos).save(any());
    }

    @Test
    @DisplayName("falha de pagamento entra em EM_ATRASO com carencia")
    void falhaDePagamentoDaCarencia() {
        Assinatura assinatura = assinaturaAtiva();
        gateway.eventId = "evt-2";
        when(eventos.findByGatewayAndGatewayEventId("fake", "evt-2")).thenReturn(Optional.empty());
        when(assinaturas.findByGatewayAndGatewaySubscriptionId("fake", "sub_1"))
                .thenReturn(Optional.of(assinatura));
        gateway.tipo = "PAYMENT_OVERDUE";
        gateway.pago = false;

        service.processarWebhook("ok", "{}");

        assertThat(assinatura.getStatus()).isEqualTo(StatusAssinatura.EM_ATRASO);
        assertThat(assinatura.getCarenciaFim()).isNotNull();
        // durante a carencia o acesso continua
        assertThat(assinatura.liberaPro()).isTrue();
    }

    @Test
    @DisplayName("evento de assinatura inexistente e' ignorado, mas fica registrado")
    void eventoDesconhecidoEhIgnorado() {
        gateway.eventId = "evt-3";
        when(eventos.findByGatewayAndGatewayEventId("fake", "evt-3")).thenReturn(Optional.empty());
        gateway.assinaturaId = "sub-desconhecida";
        gateway.referencia = "";
        gateway.tipo = "PAYMENT_CONFIRMED";
        gateway.pago = true;

        AssinaturaService.ResultadoWebhook resultado = service.processarWebhook("ok", "{}");

        assertThat(resultado).isEqualTo(AssinaturaService.ResultadoWebhook.IGNORADO);
        verify(assinaturas, never()).save(any());
        verify(eventos).save(any());
    }

    @Test
    @DisplayName("cancelamento mantem o acesso ate o fim do periodo pago")
    void cancelamentoRespeitaPeriodoPago() {
        Assinatura assinatura = assinaturaAtiva();
        when(assinaturas.findFirstByUsuarioIdOrderByCriadaEmDesc(7L)).thenReturn(Optional.of(assinatura));

        service.cancelar(7L);

        assertThat(assinatura.getStatus()).isEqualTo(StatusAssinatura.CANCELADA);
        assertThat(assinatura.isCancelaNoFim()).isTrue();
        // o periodo pago ainda nao terminou: continua valendo
        assertThat(assinatura.liberaPro()).isTrue();
        assertThat(gateway.cancelamentoPedido).isTrue();
    }

    @Test
    @DisplayName("assinatura pendente nao libera PRO")
    void pendenteNaoLibera() {
        Assinatura assinatura = assinaturaAtiva();
        assinatura.setStatus(StatusAssinatura.PENDENTE);
        assertThat(assinatura.liberaPro()).isFalse();
    }

    @Test
    @DisplayName("assinatura expirada nao libera PRO")
    void expiradaNaoLibera() {
        Assinatura assinatura = assinaturaAtiva();
        assinatura.setPeriodoFim(Instant.now().minusSeconds(60));
        assertThat(assinatura.liberaPro()).isFalse();
    }

    @Test
    @DisplayName("iniciar checkout devolve a url hospedada do gateway")
    void checkoutDevolveUrl() {
        gateway.url = "https://sandbox.asaas.com/checkout/abc";
        when(assinaturas.findFirstByUsuarioIdOrderByCriadaEmDesc(7L)).thenReturn(Optional.empty());

        String url = service.iniciarCheckout(7L, 1L, new PaymentGateway.DadosCliente(
                "Aluno", "aluno@teste.com", "24971563792", "11987654321",
                "01001000", "Rua Teste", "100", "Centro"));

        assertThat(url).isEqualTo("https://sandbox.asaas.com/checkout/abc");
        verify(assinaturas).save(any(Assinatura.class));
    }

    /** Dublê do gateway: permite forçar respostas sem rede. */
    private static final class GatewayFake implements PaymentGateway {

        boolean tokenValido = true;
        boolean cancelamentoPedido = false;
        String tipo = "PAYMENT_CONFIRMED";
        boolean pago = true;
        String assinaturaId = "sub_1";
        String referencia = "usuario:7:plano:PRO_MENSAL";
        String url = "https://pagamento.test/abc";
        String eventId = "evt-1";

        @Override
        public String id() {
            return "fake";
        }

        @Override
        public boolean configurado() {
            return true;
        }

        @Override
        public CheckoutCriado criarCheckout(DadosCheckout dados) {
            return new CheckoutCriado("checkout_1", url);
        }

        @Override
        public void cancelarAssinatura(String gatewaySubscriptionId) {
            cancelamentoPedido = true;
        }

        @Override
        public boolean webhookValido(String tokenRecebido) {
            return tokenValido;
        }

        @Override
        public EventoWebhook traduzir(String corpoBruto) {
            return new EventoWebhook(eventId, tipo, assinaturaId,
                    "checkout_1", referencia, Instant.now(), pago);
        }
    }
}
