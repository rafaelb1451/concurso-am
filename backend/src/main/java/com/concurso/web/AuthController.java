package com.concurso.web;

import com.concurso.service.AuthService;
import com.concurso.service.DadosPessoaisService;
import com.concurso.service.RateLimiter;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Cadastro, login, logout e dados do usuario autenticado. */
@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService auth;
    private final DadosPessoaisService dados;
    private final RateLimiter limiter;
    private final com.concurso.service.GoogleTokenVerifier google;

    public AuthController(AuthService auth, DadosPessoaisService dados, RateLimiter limiter,
                          com.concurso.service.GoogleTokenVerifier google) {
        this.auth = auth;
        this.dados = dados;
        this.limiter = limiter;
        this.google = google;
    }

    @PostMapping("/cadastro")
    @ResponseStatus(HttpStatus.CREATED)
    public Dtos.AuthView cadastrar(@Valid @RequestBody Dtos.CadastroRequest request,
                                   jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("cadastro:" + ClienteIp.de(requisicao), 5);
        return auth.cadastrar(request.nome(), request.email(), request.senha(),
                request.aceitouTermos(), request.aceitouPrivacidade());
    }

    /** Login ou cadastro via Google: recebe o ID token do Google e devolve a sessao. */
    @PostMapping("/google")
    public Dtos.AuthView google(@Valid @RequestBody Dtos.GoogleRequest request,
                                jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("google:" + ClienteIp.de(requisicao), 20);
        return auth.entrarComGoogle(google.verificar(request.credential()));
    }

    @PostMapping("/login")
    public Dtos.AuthView login(@Valid @RequestBody Dtos.LoginRequest request,
                               jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("login:" + ClienteIp.de(requisicao), 10);
        return auth.login(request.email(), request.senha());
    }

    @PostMapping("/verificar-email")
    public Map<String, Object> verificarEmail(@Valid @RequestBody Dtos.VerificarEmailRequest request,
                                               jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("verificar-email:" + ClienteIp.de(requisicao), 10);
        auth.verificarEmail(request.token());
        return Map.of("ok", true);
    }

    @PostMapping("/reenviar-verificacao")
    public Map<String, Object> reenviarVerificacao(
            @RequestBody Dtos.SolicitarResetRequest request,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("reenviar-verificacao:" + ClienteIp.de(requisicao), 3);
        auth.reenviarVerificacao(request.email());
        return Map.of("ok", true);
    }

    @PostMapping("/solicitar-reset")
    public Map<String, Object> solicitarReset(
            @Valid @RequestBody Dtos.SolicitarResetRequest request,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("solicitar-reset:" + ClienteIp.de(requisicao), 5);
        auth.solicitarReset(request.email());
        return Map.of("ok", true);
    }

    @PostMapping("/resetar-senha")
    public Map<String, Object> resetarSenha(@Valid @RequestBody Dtos.ResetSenhaRequest request,
                                              jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("resetar-senha:" + ClienteIp.de(requisicao), 5);
        auth.resetarSenha(request.token(), request.novaSenha());
        return Map.of("ok", true);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        auth.logout(extrairToken(authorization));
        return Map.of("ok", true);
    }

    @GetMapping("/usuario")
    public Dtos.UsuarioView usuario(@RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return auth.porId(usuarioId);
    }

    @PostMapping("/usuario/alterar-email")
    public Map<String, Object> alterarEmail(
            @Valid @RequestBody Dtos.AlterarEmailRequest request,
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        limiter.exigir("alterar-email:" + usuarioId, 5);
        auth.solicitarAlteracaoEmail(usuarioId, request.senha(), request.credential(), request.novoEmail());
        return Map.of("ok", true);
    }

    @PostMapping("/usuario/confirmar-email")
    public Map<String, Object> confirmarAlteracaoEmail(
            @Valid @RequestBody Dtos.VerificarEmailRequest request,
            jakarta.servlet.http.HttpServletRequest requisicao) {
        limiter.exigir("confirmar-email:" + ClienteIp.de(requisicao), 10);
        auth.confirmarAlteracaoEmail(request.token());
        return Map.of("ok", true);
    }

    @GetMapping("/usuario/dados")
    public Map<String, Object> dados(@RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId) {
        return dados.exportar(usuarioId);
    }

    @PostMapping("/usuario/excluir")
    public Map<String, Object> excluir(
            @Valid @RequestBody Dtos.ConfirmarSenhaRequest request,
            @RequestAttribute(AuthInterceptor.ATTR_USUARIO_ID) Long usuarioId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        limiter.exigir("excluir-conta:" + usuarioId, 3);
        auth.excluirConta(usuarioId, request.senha(), request.credential());
        auth.logout(extrairToken(authorization));
        return Map.of("ok", true);
    }

    private static String extrairToken(String authorization) {
        if (authorization != null && authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return authorization.substring(7).trim();
        }
        return null;
    }

    @ExceptionHandler(com.concurso.service.AuthException.class)
    public ResponseEntity<Map<String, String>> erroDeAutenticacao(com.concurso.service.AuthException ex) {
        return ResponseEntity.status(ex.getStatus()).body(Map.of("message", ex.getMessage()));
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
}
