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
            int certamesMaximos,
            boolean tutorIa,
            int cotaTutorDiaria,
            int limiteDiarioQuestoes,
            boolean ilimitado,
            boolean pago
    ) {
    }

    public record CheckoutRequest(
            @jakarta.validation.constraints.NotBlank(message = "informe o plano")
            String plano,
            @jakarta.validation.constraints.NotEmpty(message = "escolha ao menos 1 certame")
            List<String> certames,
            // Opcionais: o Mercado Pago so' precisa do e-mail da conta. Mantidos para o
            // AsaasGateway (implementacao alternativa), que exige os dados do cliente.
            String cpfCnpj,
            String telefone,
            String cep,
            String endereco,
            String numero,
            String bairro
    ) {
    }

    public record CertamesRequest(
            @jakarta.validation.constraints.NotEmpty(message = "escolha ao menos 1 certame")
            List<String> certames
    ) {
    }

    public record CheckoutView(String url) {
    }

    public record TutorUsoView(int usado, int cota) {
    }

    public record AssinaturaView(
            String status,
            PlanoView plano,
            Instant periodoFim,
            boolean cancelaNoFim,
            Instant carenciaFim,
            boolean liberaPro,
            boolean pagamentoConfigurado,
            List<String> certames,
            boolean tutorIa,
            TutorUsoView tutorUso,
            boolean podeTrocarCertame
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
                p.getCiclo(), p.getCertamesMaximos(), p.isTutorIa(), p.getCotaTutorDiaria(),
                p.getLimiteDiarioQuestoes(), p.ilimitado(), p.pago());
    }

    public static TutorUsoView tutorUso(com.concurso.domain.Plano plano, int usado) {
        int cota = plano.getCotaTutorDiaria();
        return new TutorUsoView(usado, cota);
    }
}
