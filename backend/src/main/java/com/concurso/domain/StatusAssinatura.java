package com.concurso.domain;

/** Status da assinatura local. Espelha os eventos do gateway, com o nosso vocabulário. */
public enum StatusAssinatura {

    /** Checkout criado, pagamento ainda não confirmado. Não libera acesso PRO. */
    PENDENTE,

    /** Pagamento confirmado: acesso liberado. */
    ATIVA,

    /** Renovação falhou (cartão recusado). Acesso continua durante a carência. */
    EM_ATRASO,

    /** Cancelada pelo aluno. Continua valendo até o fim do período já pago. */
    CANCELADA,

    /** Período pago terminou (ou carência esgotou). Volta ao FREE. */
    EXPIRADA;

    /** Libera o conteúdo PRO? {@code PENDENTE} e {@code EXPIRADA} não liberam. */
    public boolean liberaPro() {
        return this == ATIVA || this == EM_ATRASO || this == CANCELADA;
    }
}
