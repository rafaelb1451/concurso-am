package com.concurso.web;

import com.concurso.service.DeepSeekService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Tutor virtual (DeepSeek) e configuracao da chave. */
@RestController
@RequestMapping("/api")
public class TutorController {

    private static final String MODELO = "deepseek-chat";

    private final DeepSeekService tutor;

    public TutorController(DeepSeekService tutor) {
        this.tutor = tutor;
    }

    @GetMapping("/config/deepseek")
    public Dtos.ConfigStatus status() {
        return new Dtos.ConfigStatus(tutor.configurado(), MODELO);
    }

    /** Grava a chave no servidor (arquivo fora do controle de versao). */
    @PostMapping("/config/deepseek")
    public Dtos.ConfigStatus salvarChave(@RequestBody Dtos.ChaveRequest request) {
        tutor.salvarChave(request.apiKey());
        return new Dtos.ConfigStatus(true, MODELO);
    }

    @PostMapping("/chat")
    public Dtos.ChatResposta conversar(@RequestBody Dtos.ChatRequest request) {
        if (request.mensagens() == null || request.mensagens().isEmpty()) {
            throw new IllegalArgumentException("Envie ao menos uma mensagem");
        }
        return new Dtos.ChatResposta(tutor.conversar(request.mensagens(), request.contexto()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> erroDeEntrada(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> erroDeEstado(IllegalStateException ex) {
        String msg = ex.getMessage() == null ? "Erro no tutor" : ex.getMessage();
        if (msg.contains("nao configurada")) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Configure a chave da DeepSeek na aba Fixação antes de usar o tutor."));
        }
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("message", msg));
    }
}
