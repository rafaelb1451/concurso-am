package com.concurso.service;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Hash de senha com PBKDF2 (HMAC-SHA256) — sem dependencia externa.
 *
 * <p>Formato armazenado: {@code pbkdf2$<iteracoes>$<sal-base64>$<hash-base64>}. A comparacao usa
 * {@link MessageDigest#isEqual} para nao vazar informacao por tempo de resposta.</p>
 */
public final class SenhaHash {

    private static final int ITERACOES = 100_000;
    private static final int TAMANHO_SAL = 16;
    private static final int TAMANHO_HASH = 32;
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private SenhaHash() {
    }

    public static String gerar(String senha) {
        byte[] sal = new byte[TAMANHO_SAL];
        ALEATORIO.nextBytes(sal);
        byte[] hash = derivar(senha.toCharArray(), sal, ITERACOES);
        return "pbkdf2$" + ITERACOES + "$" + Base64.getEncoder().encodeToString(sal) + "$"
                + Base64.getEncoder().encodeToString(hash);
    }

    public static boolean confere(String senha, String armazenado) {
        if (senha == null || armazenado == null) {
            return false;
        }
        try {
            String[] partes = armazenado.split("\\$");
            if (partes.length != 4 || !"pbkdf2".equals(partes[0])) {
                return false;
            }
            int iteracoes = Integer.parseInt(partes[1]);
            byte[] sal = Base64.getDecoder().decode(partes[2]);
            byte[] esperado = Base64.getDecoder().decode(partes[3]);
            byte[] calculado = derivar(senha.toCharArray(), sal, iteracoes);
            return MessageDigest.isEqual(esperado, calculado);
        } catch (Exception e) {
            return false;
        }
    }

    private static byte[] derivar(char[] senha, byte[] sal, int iteracoes) {
        try {
            PBEKeySpec spec = new PBEKeySpec(senha, sal, iteracoes, TAMANHO_HASH * 8);
            SecretKeyFactory fabrica = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            return fabrica.generateSecret(spec).getEncoded();
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao derivar a senha", e);
        }
    }
}
