package com.concurso.web;

import java.time.Instant;
import java.util.List;

/** DTOs de planos e assinatura. */
public final class DtosAssinatura {

    private DtosAssinatura() {
    }

    public record PlanoView(
            Long id,
            String codigo,
            String nome,
            int valorCentavos,
            String ciclo,
            int limiteDiarioQuestoes,
            boolean ilimitado,
            boolean pago
    ) {
    }

    public record CheckoutRequest(
            @jakarta.validation.constraints.NotBlank(message = "informe o plano")
            String plano,
            // dados exigidos pelo checkout do Asaas (o cartao e' digitado la', nunca aqui)
            @jakarta.validation.constraints.NotBlank(message = "informe o CPF/CNPJ")
            String cpfCnpj,
            @jakarta.validation.constraints.NotBlank(message = "informe o celular")
            String telefone,
            @jakarta.validation.constraints.NotBlank(message = "informe o CEP")
            String cep,
            @jakarta.validation.constraints.NotBlank(message = "informe o endereco")
            String endereco,
            @jakarta.validation.constraints.NotBlank(message = "informe o numero")
            String numero,
            @jakarta.validation.constraints.NotBlank(message = "informe o bairro")
            String bairro
    ) {
    }

    public record CheckoutView(String url) {
    }

    public record AssinaturaView(
            String status,
            PlanoView plano,
            Instant periodoFim,
            boolean cancelaNoFim,
            Instant carenciaFim,
            boolean liberaPro,
            boolean pagamentoConfigurado
    ) {
    }

    public record PlanoAtualView(
            PlanoView plano,
            int limiteDiarioQuestoes,
            boolean ilimitado,
            long respondidasHoje
    ) {
    }

    public static List<PlanoView> planos(List<com.concurso.domain.Plano> lista) {
        return lista.stream().map(DtosAssinatura::view).toList();
    }

    public static PlanoView view(com.concurso.domain.Plano p) {
        return new PlanoView(p.getId(), p.getCodigo(), p.getNome(), p.getValorCentavos(),
                p.getCiclo(), p.getLimiteDiarioQuestoes(), p.ilimitado(), p.pago());
    }
}
