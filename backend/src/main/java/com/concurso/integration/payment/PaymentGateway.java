package com.concurso.integration.payment;

import java.time.Instant;

/**
 * Contrato de gateway de pagamento. A ideia é permitir trocar de provedor (Asaas, Pagar.me,
 * Stripe) sem tocar no serviço de assinatura.
 *
 * <p>Não existe dado de cartão na aplicação: o aluno paga na página hospedada do gateway e nós
 * só recebemos o resultado por webhook.</p>
 */
public interface PaymentGateway {

    /** Identificador curto gravado no banco ({@code asaas}). */
    String id();

    /** Credenciais presentes? Sem isso o checkout responde erro amigável. */
    boolean configurado();

    CheckoutCriado criarCheckout(DadosCheckout dados);

    /** Cancela a renovação no gateway. O acesso local continua até o fim do período pago. */
    void cancelarAssinatura(String gatewaySubscriptionId);

    /** Confere o token que o gateway manda no header do webhook. */
    boolean webhookValido(String tokenRecebido);

    /** Traduz o corpo do webhook para o nosso vocabulário. */
    EventoWebhook traduzir(String corpoBruto);

    record DadosCliente(
            String nome,
            String email,
            String cpfCnpj,
            String telefone,
            String cep,
            String endereco,
            String numero,
            String bairro
    ) {
    }

    record DadosCheckout(
            DadosCliente cliente,
            String codigoPlano,
            String nomePlano,
            int valorCentavos,
            String ciclo,
            String referenciaExterna,
            String urlSucesso,
            String urlCancelamento
    ) {
    }

    record CheckoutCriado(String id, String url) {
    }

    /**
     * @param id            id do evento no gateway (chave de idempotência)
     * @param tipo          tipo bruto do evento (ex.: {@code PAYMENT_RECEIVED})
     * @param assinaturaId  id da assinatura no gateway, quando houver
     * @param checkoutId    id do checkout no gateway, quando houver
     * @param referenciaExterna  valor que enviamos no checkout, para casar com o usuário
     * @param vencimento    vencimento da cobrança, quando houver
     * @param pago          true quando o evento representa pagamento confirmado
     */
    record EventoWebhook(
            String id,
            String tipo,
            String assinaturaId,
            String checkoutId,
            String referenciaExterna,
            Instant vencimento,
            boolean pago
    ) {
    }
}
