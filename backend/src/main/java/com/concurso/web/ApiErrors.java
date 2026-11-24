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
}
