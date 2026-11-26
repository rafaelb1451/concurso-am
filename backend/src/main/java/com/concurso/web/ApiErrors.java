package com.concurso.web;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Respostas de erro padronizadas e sem detalhe interno.
 *
 * <p>O corpo de uma requisicao malformada nao deve devolver o formato do framework nem caminho de
 * classe: o cliente recebe uma mensagem curta, o detalhe fica no log.</p>
 */
@RestControllerAdvice
public class ApiErrors {

    /** Erros de autenticacao/assinatura carregam o proprio status. */
    @ExceptionHandler(com.concurso.service.AuthException.class)
    public ResponseEntity<Map<String, String>> erroDeAuth(com.concurso.service.AuthException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of("message", ex.getMessage()));
    }

    /** Regra de negocio violada (entrada invalida). */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> erroDeRegra(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> corpoInvalido(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(Map.of("message", "Corpo da requisição inválido ou fora do formato esperado."));
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> metodoNaoSuportado(Exception ex) {
        return ResponseEntity.status(405).body(Map.of("message", "Método não suportado."));
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, String>> tipoNaoSuportado(Exception ex) {
        return ResponseEntity.status(415)
                .body(Map.of("message", "Envie o corpo como application/json."));
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<Map<String, String>> naoEncontrado(Exception ex) {
        return ResponseEntity.status(404).body(Map.of("message", "Recurso não encontrado."));
    }

    @ExceptionHandler(AcessoNegadoException.class)
    public ResponseEntity<Map<String, String>> acessoNegado(AcessoNegadoException ex) {
        return ResponseEntity.status(403).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> limiteOuEstado(IllegalStateException ex) {
        if (ex.getMessage() != null && ex.getMessage().contains("Limite de uso")) {
            return ResponseEntity.status(429).body(Map.of("message", ex.getMessage()));
        }
        return ResponseEntity.status(502)
                .body(Map.of("message", "Operação temporariamente indisponível."));
    }
}
