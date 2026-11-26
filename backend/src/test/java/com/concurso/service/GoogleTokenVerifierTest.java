package com.concurso.service;

import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Testes da validacao do ID token do Google.
 *
 * <p>Usa um par de chaves RSA local no lugar do JWKS do Google: assim cada regra de rejeicao
 * (audience, issuer, expiracao, e-mail nao verificado, assinatura) e' exercitada de verdade,
 * sem depender da rede.</p>
 */
class GoogleTokenVerifierTest {

    private static final String CLIENT_ID = "50431372828-teste.apps.googleusercontent.com";

    private RSAKey chave;
    private RSAKey outraChave;
    private GoogleTokenVerifier verifier;

    @BeforeEach
    void preparar() throws Exception {
        chave = new RSAKeyGenerator(2048).keyID("chave-de-teste").generate();
        outraChave = new RSAKeyGenerator(2048).keyID("outra-chave").generate();
        verifier = new GoogleTokenVerifier(CLIENT_ID, () -> new JWKSet(chave.toPublicJWK()));
    }

    private String token(String emissor, List<String> audiencia, String email,
                         boolean emailVerificado, Instant expira, RSAKey assinante) throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("1234567890")
                .issuer(emissor)
                .audience(audiencia)
                .claim("email", email)
                .claim("email_verified", emailVerificado)
                .claim("name", "Rafael Teste")
                .issueTime(Date.from(Instant.now()))
                .expirationTime(Date.from(expira))
                .build();
        SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.RS256)
                        .keyID(assinante.getKeyID())
                        .type(JOSEObjectType.JWT)
                        .build(),
                claims);
        jwt.sign(new RSASSASigner(assinante));
        return jwt.serialize();
    }

    private String tokenValido() throws Exception {
        return token("https://accounts.google.com", List.of(CLIENT_ID),
                "rafael@gmail.com", true, Instant.now().plusSeconds(600), chave);
    }

    @Test
    @DisplayName("aceita token valido e extrai sub, e-mail e nome")
    void aceitaTokenValido() throws Exception {
        GoogleTokenVerifier.ContaGoogle conta = verifier.verificar(tokenValido());

        assertThat(conta.subject()).isEqualTo("1234567890");
        assertThat(conta.email()).isEqualTo("rafael@gmail.com");
        assertThat(conta.nome()).isEqualTo("Rafael Teste");
        assertThat(conta.emailVerificado()).isTrue();
    }

    @Test
    @DisplayName("rejeita token emitido para outro Client ID")
    void rejeitaAudienceDiferente() throws Exception {
        String t = token("https://accounts.google.com", List.of("outro-cliente"),
                "rafael@gmail.com", true, Instant.now().plusSeconds(600), chave);

        assertThatThrownBy(() -> verifier.verificar(t))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("outra aplicacao")
                .extracting(e -> ((AuthException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("rejeita emissor que nao e' o Google")
    void rejeitaEmissorDesconhecido() throws Exception {
        String t = token("https://malicioso.example", List.of(CLIENT_ID),
                "rafael@gmail.com", true, Instant.now().plusSeconds(600), chave);

        assertThatThrownBy(() -> verifier.verificar(t))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Emissor");
    }

    @Test
    @DisplayName("rejeita token expirado")
    void rejeitaTokenExpirado() throws Exception {
        String t = token("accounts.google.com", List.of(CLIENT_ID),
                "rafael@gmail.com", true, Instant.now().minusSeconds(600), chave);

        assertThatThrownBy(() -> verifier.verificar(t))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("expirada");
    }

    @Test
    @DisplayName("rejeita e-mail nao verificado pelo Google")
    void rejeitaEmailNaoVerificado() throws Exception {
        String t = token("accounts.google.com", List.of(CLIENT_ID),
                "rafael@gmail.com", false, Instant.now().plusSeconds(600), chave);

        assertThatThrownBy(() -> verifier.verificar(t))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("nao esta verificado");
    }

    @Test
    @DisplayName("rejeita assinatura feita com outra chave (mesmo kid anunciado)")
    void rejeitaAssinaturaForjada() throws Exception {
        // mesma identificacao de chave do Google, mas chave privada diferente:
        // a busca encontra o kid, e a verificacao da assinatura e' que precisa falhar
        RSAKey forjada = new RSAKeyGenerator(2048).keyID(chave.getKeyID()).generate();
        String t = token("accounts.google.com", List.of(CLIENT_ID),
                "rafael@gmail.com", true, Instant.now().plusSeconds(600), forjada);

        assertThatThrownBy(() -> verifier.verificar(t))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Assinatura")
                .extracting(e -> ((AuthException) e).getStatus())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("rejeita credencial vazia ou lixo")
    void rejeitaCredencialInvalida() {
        assertThatThrownBy(() -> verifier.verificar(""))
                .isInstanceOf(AuthException.class);
        assertThatThrownBy(() -> verifier.verificar("nao-e-um-jwt"))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("invalida");
    }

    @Test
    @DisplayName("sem Client ID configurado responde 503")
    void semClientIdResponde503() {
        GoogleTokenVerifier semConfig = new GoogleTokenVerifier("", () -> new JWKSet(chave.toPublicJWK()));

        assertThat(semConfig.configurado()).isFalse();
        assertThatThrownBy(() -> semConfig.verificar("qualquer"))
                .isInstanceOf(AuthException.class)
                .extracting(e -> ((AuthException) e).getStatus())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }
}
