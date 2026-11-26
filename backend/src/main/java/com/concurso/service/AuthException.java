package com.concurso.service;

import org.springframework.http.HttpStatus;

/**
 * Falha de autenticacao que carrega o status HTTP correto.
 *
 * <p>Sem isto, login invalido, e-mail nao verificado e conta bloqueada sairiam todos como 400
 * (erro de formulario), escondendo do cliente a diferenca entre "credencial errada" (401),
 * "falta verificar o e-mail" (403) e "tentativas demais" (429).</p>
 */
public class AuthException extends RuntimeException {

    private final HttpStatus status;

    public AuthException(HttpStatus status, String mensagem) {
        super(mensagem);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }

    public static AuthException credenciaisInvalidas() {
        return new AuthException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos.");
    }

    public static AuthException emailNaoVerificado() {
        return new AuthException(HttpStatus.FORBIDDEN, "Confirme seu e-mail antes de entrar.");
    }

    public static AuthException contaBloqueada() {
        return new AuthException(HttpStatus.TOO_MANY_REQUESTS,
                "Conta temporariamente bloqueada. Tente novamente mais tarde.");
    }
}
