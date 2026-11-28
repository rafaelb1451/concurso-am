package com.concurso.integration.payment;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

/**
 * Seleciona o gateway de pagamento ativo: PagBank se o token estiver configurado;
 * caso contrário cai para o Mercado Pago (legado) e depois Asaas.
 *
 * <p>Assim o deploy pode ir para produção antes de o token do PagBank existir,
 * sem quebrar o checkout.</p>
 */
@Configuration
public class GatewayConfig {

    @Bean
    @Primary
    PaymentGateway gateway(PagBankGateway pagbank, MercadoPagoGateway mercadoPago, AsaasGateway asaas) {
        if (pagbank.configurado()) {
            return pagbank;
        }
        if (mercadoPago.configurado()) {
            return mercadoPago;
        }
        return asaas;
    }
}
