package com.concurso.web;

import com.concurso.service.DeepSeekService;
import com.concurso.service.RateLimiter;
import com.concurso.service.TutorCacheService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import com.concurso.service.AuthException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import com.concurso.service.AuthException;

import java.util.Map;

/** Tutor virtual (DeepSeek) e configuracao da chave. */
@RestController
@RequestMapping("/api")
public class TutorController {

    private static final String MODELO = "deepseek-chat";
    /** Teto de chamadas ao tutor por minuto — protege o saldo da conta. */
    private static final int CHAT_POR_MINUTO = 20;

    private final DeepSeekService tutor;
    private final TutorCacheService cache;
    private final RateLimiter limiter;

    public TutorController(DeepSeekService tutor, TutorCacheService cache, RateLimiter limiter) {
        this.tutor = tutor;
        this.cache = cache;
        this.limiter = limiter;
    }

    @GetMapping("/config/deepseek")
    public Dtos.ConfigStatus status() {
        return new Dtos.ConfigStatus(tutor.configurado(), MODELO);
    }

    /** Grava a chave no servidor (arquivo fora do controle de versao) ou aceita a de ambiente. */
    @PostMapping("/config/deepseek")
    public Dtos.ConfigStatus salvarChave(@Valid @RequestBody Dtos.ChaveRequest request,
            @RequestAttribute(value = AuthInterceptor.ATTR_ADMIN, required = false) Boolean admin) {
        if (!Boolean.TRUE.equals(admin)) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Apenas administradores podem alterar a chave.");
        }
        tutor.salvarChave(request.apiKey());
        return new Dtos.ConfigStatus(true, MODELO);
    }

    @PostMapping("/chat")
    public Dtos.ChatResposta conversar(@Valid @RequestBody Dtos.ChatRequest request,
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        limiter.exigir("chat:" + usuarioId, CHAT_POR_MINUTO);
        return new Dtos.ChatResposta(cache.conversar(usuarioId, request.mensagens(), request.contexto()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> erroDeValidacao(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .findFirst()
                .orElse("requisicao invalida");
        return ResponseEntity.badRequest().body(Map.of("message", msg));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> erroDeEntrada(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> erroDeEstado(IllegalStateException ex) {
        String msg = ex.getMessage() == null ? "" : ex.getMessage();
        if (msg.contains("nao configurada")) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Configure a chave da DeepSeek na aba Fixação antes de usar o tutor."));
        }
        if (msg.contains("Limite de uso")) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("message", msg));
        }
        // Detalhe do erro externo fica no log do servidor, nunca na resposta ao cliente.
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("message", "O tutor está indisponível agora. Tente novamente em instantes."));
    }
}
