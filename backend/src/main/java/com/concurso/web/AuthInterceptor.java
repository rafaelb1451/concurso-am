package com.concurso.web;

import com.concurso.domain.Usuario;
import com.concurso.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Optional;

/**
 * Exige autenticacao em {@code /api/**}, exceto cadastro e login. Deixa no request os atributos
 * {@code usuarioId} e {@code admin} para os controllers.
 */
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATTR_USUARIO_ID = "usuarioId";
    public static final String ATTR_ADMIN = "admin";

    private final AuthService auth;

    public AuthInterceptor(AuthService auth) {
        this.auth = auth;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        String caminho = request.getServletPath();

        if ("/error".equals(caminho) || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        if (publico(caminho, request.getMethod())) {
            return true;
        }

        Optional<Usuario> usuario = auth.autenticar(extrairToken(request));
        if (usuario.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"message\":\"Não autenticado.\"}");
            return false;
        }

        request.setAttribute(ATTR_USUARIO_ID, usuario.get().getId());
        request.setAttribute(ATTR_ADMIN, usuario.get().isAdmin());
        return true;
    }

    private static boolean publico(String caminho, String metodo) {
        // pratica gratuita: sem conta, limitada no proprio controller
        if (caminho.startsWith("/api/publico") && ("POST".equalsIgnoreCase(metodo) || "GET".equalsIgnoreCase(metodo))) {
            return true;
        }
        // webhook do gateway: publico, protegido pelo token no header
        if ("POST".equalsIgnoreCase(metodo) && ("/api/webhooks/asaas".equals(caminho)
                || "/api/webhooks/mercadopago".equals(caminho)
                || "/api/webhooks/pagbank".equals(caminho))) {
            return true;
        }
        // catalogo de planos: publico para a pagina de precos
        if ("GET".equalsIgnoreCase(metodo) && "/api/planos".equals(caminho)) {
            return true;
        }
        // material de estudo: leitura publica; escrita continua sem rota
        if ("GET".equalsIgnoreCase(metodo)
                && ("/api/materiais".equals(caminho) || caminho.startsWith("/api/materiais/"))) {
            return true;
        }
        if (!"POST".equalsIgnoreCase(metodo)) {
            return false;
        }
        return "/api/google".equals(caminho)
                || "/api/cadastro".equals(caminho)
                || "/api/login".equals(caminho)
                || "/api/verificar-email".equals(caminho)
                || "/api/reenviar-verificacao".equals(caminho)
                || "/api/solicitar-reset".equals(caminho)
                || "/api/resetar-senha".equals(caminho)
                || "/api/usuario/confirmar-email".equals(caminho);
    }

    private static String extrairToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return header.substring(7).trim();
        }
        return null;
    }
}
