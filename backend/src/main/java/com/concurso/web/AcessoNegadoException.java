package com.concurso.web;

/** Acesso negado (403): acao restrita ao administrador. */
public class AcessoNegadoException extends RuntimeException {

    public AcessoNegadoException(String message) {
        super(message);
    }
}
