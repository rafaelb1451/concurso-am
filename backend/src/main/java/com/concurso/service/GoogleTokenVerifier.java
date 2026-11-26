package com.concurso.service;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.function.Supplier;

/**
 * Valida o ID token do Google (fluxo "Sign in with Google" / Google Identity Services).
 *
 * <p>Nao usamos client secret: o frontend recebe o ID token direto do Google e o envia ao backend,
 * que confere <b>assinatura</b> (chaves publicas do Google), <b>issuer</b>, <b>audience</b>
 * (o nosso Client ID), <b>expiracao</b> e <b>email_verified</b>. Token invalido nao vira sessao.</p>
 *
 * <p>As chaves publicas sao buscadas em {@code https://www.googleapis.com/oauth2/v3/certs} e
 * mantidas em cache; se chegar um {@code kid} desconhecido, a busca e' refeita uma vez (rotacao).</p>
 */
@Component
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);

    private static final String JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
    private static final List<String> EMISSORES = List.of("accounts.google.com", "https://accounts.google.com");
    /** Tolerancia de relogio entre a nossa maquina e o Google. */
    private static final Duration FOLGA_RELOGIO = Duration.ofSeconds(120);
    private static final Duration VALIDADE_CACHE = Duration.ofHours(6);

    private final String clientId;
    private final Supplier<JWKSet> fonteChaves;

    @org.springframework.beans.factory.annotation.Autowired
    public GoogleTokenVerifier(@Value("${concurso.google.client-id:}") String clientId) {
        this(clientId, GoogleTokenVerifier::buscarChaves);
    }

    /** Construtor para teste: permite injetar um conjunto de chaves local. */
    public GoogleTokenVerifier(String clientId, Supplier<JWKSet> fonteChaves) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.fonteChaves = fonteChaves;
    }

    public boolean configurado() {
        return !clientId.isEmpty();
    }

    /** Dados confiaveis extraidos do ID token. */
    public record ContaGoogle(String subject, String email, String nome, boolean emailVerificado) {
    }

    /**
     * @throws AuthException 401 quando o token nao passa em qualquer verificacao
     */
    public ContaGoogle verificar(String idToken) {
        if (!configurado()) {
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Login com Google nao esta configurado no servidor.");
        }
        if (idToken == null || idToken.isBlank()) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Credencial do Google ausente.");
        }

        SignedJWT jwt;
        try {
            jwt = SignedJWT.parse(idToken);
        } catch (Exception e) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Credencial do Google invalida.");
        }

        if (!JWSAlgorithm.RS256.equals(jwt.getHeader().getAlgorithm())) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Algoritmo de assinatura nao aceito.");
        }

        verificarAssinatura(jwt);

        JWTClaimsSet claims;
        try {
            claims = jwt.getJWTClaimsSet();
        } catch (Exception e) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Credencial do Google invalida.");
        }

        // issuer
        if (!EMISSORES.contains(claims.getIssuer())) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Emissor do token nao e' o Google.");
        }
        // audience: o token precisa ter sido emitido para a NOSSA aplicacao
        if (claims.getAudience() == null || !claims.getAudience().contains(clientId)) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Token emitido para outra aplicacao.");
        }
        // expiracao
        Date expira = claims.getExpirationTime();
        if (expira == null || expira.toInstant().plus(FOLGA_RELOGIO).isBefore(Instant.now())) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Credencial do Google expirada.");
        }
        // emissao no futuro (relogio/forja)
        Date emitido = claims.getIssueTime();
        if (emitido != null && emitido.toInstant().minus(FOLGA_RELOGIO).isAfter(Instant.now())) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Credencial do Google invalida.");
        }

        String subject = claims.getSubject();
        String email;
        Boolean verificado;
        String nome;
        try {
            email = claims.getStringClaim("email");
            verificado = claims.getBooleanClaim("email_verified");
            nome = claims.getStringClaim("name");
        } catch (java.text.ParseException e) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Credencial do Google malformada.");
        }

        if (subject == null || subject.isBlank()) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Credencial sem identificador do Google.");
        }
        if (email == null || email.isBlank()) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Credencial sem e-mail.");
        }
        if (!Boolean.TRUE.equals(verificado)) {
            throw new AuthException(HttpStatus.FORBIDDEN,
                    "O e-mail da conta Google nao esta verificado.");
        }

        return new ContaGoogle(subject, email.trim().toLowerCase(), nome, true);
    }

    private void verificarAssinatura(SignedJWT jwt) {
        JWKSet chaves = chaves();
        JWK chave = chaves.getKeyByKeyId(jwt.getHeader().getKeyID());
        if (chave == null) {
            // pode ser rotacao de chave do Google: recarrega uma vez
            chaves = recarregar();
            chave = chaves.getKeyByKeyId(jwt.getHeader().getKeyID());
        }
        if (!(chave instanceof RSAKey rsa)) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Chave de assinatura desconhecida.");
        }
        try {
            JWSVerifier verifier = new RSASSAVerifier(rsa.toRSAPublicKey());
            if (!jwt.verify(verifier)) {
                throw new AuthException(HttpStatus.UNAUTHORIZED, "Assinatura do Google invalida.");
            }
        } catch (AuthException e) {
            throw e;
        } catch (Exception e) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Assinatura do Google invalida.");
        }
    }

    // ---------------------------------------------------------------- cache das chaves

    private volatile JWKSet cache;
    private volatile Instant cacheEm = Instant.EPOCH;

    private JWKSet chaves() {
        if (cache == null || cacheEm.plus(VALIDADE_CACHE).isBefore(Instant.now())) {
            return recarregar();
        }
        return cache;
    }

    private synchronized JWKSet recarregar() {
        try {
            JWKSet novo = fonteChaves.get();
            if (novo == null || novo.getKeys().isEmpty()) {
                throw new IllegalStateException("conjunto de chaves vazio");
            }
            cache = novo;
            cacheEm = Instant.now();
            return novo;
        } catch (Exception e) {
            log.warn("Nao consegui obter as chaves publicas do Google", e);
            if (cache != null) {
                // usa o cache antigo em vez de derrubar o login
                return cache;
            }
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Login com Google indisponivel no momento.");
        }
    }

    /** Busca o JWKS oficial do Google. */
    static JWKSet buscarChaves() {
        try {
            HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
            HttpRequest req = HttpRequest.newBuilder(URI.create(JWKS_URL))
                    .timeout(Duration.ofSeconds(8))
                    .GET()
                    .build();
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() != 200) {
                throw new IllegalStateException("Google respondeu " + resp.statusCode());
            }
            return JWKSet.parse(resp.body());
        } catch (Exception e) {
            throw new IllegalStateException("falha ao buscar chaves do Google", e);
        }
    }
}
