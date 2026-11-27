package com.concurso.web;

import com.concurso.domain.Concursos;

/**
 * Normalizacao dos parametros de filtro que chegam por query string.
 *
 * <p>Regras da secao 5 do plano de produto: truncar/normalizar (banca ate 40, concurso ate 20,
 * materia/assunto ate 120) e rejeitar caracteres de controle. Os valores sao sempre ligados como
 * parametro nas queries nativas — nao ha concatenacao de SQL.</p>
 */
public final class Parametros {

    public static final int MAX_BANCA = 40;
    public static final int MAX_CONCURSO = 20;
    public static final int MAX_MATERIA = 120;
    public static final int MAX_ASSUNTO = 120;
    public static final int MAX_SLUG = 160;

    private Parametros() {
    }

    /**
     * Apara, rejeita caracteres de controle e trunca no tamanho maximo. Valor em branco vira nulo,
     * que significa "todas" para todos os filtros.
     */
    public static String texto(String valor, String campo, int maximo) {
        if (valor == null) {
            return null;
        }
        String limpo = valor.strip();
        if (limpo.isEmpty()) {
            return null;
        }
        for (int i = 0; i < limpo.length(); i++) {
            if (Character.isISOControl(limpo.charAt(i))) {
                throw new IllegalArgumentException(campo + " contém caracteres inválidos.");
            }
        }
        if (limpo.length() > maximo) {
            limpo = limpo.substring(0, maximo).strip();
        }
        return limpo.isEmpty() ? null : limpo;
    }

    /** Concurso: maiusculo, formato validado (aceita novos codigos como CREA-AM). */
    public static String concurso(String valor) {
        String codigo = Concursos.normalizar(texto(valor, "concurso", MAX_CONCURSO));
        if (codigo != null && !Concursos.valido(codigo)) {
            throw new IllegalArgumentException(
                    "concurso inválido: use um código como PM-AM, PC-AM ou CREA-AM.");
        }
        return codigo;
    }

    /** Banca: apara e trunca; "TODAS" e branco significam sem filtro (case-insensitive). */
    public static String banca(String valor) {
        String banca = texto(valor, "banca", MAX_BANCA);
        if (banca != null && "TODAS".equalsIgnoreCase(banca)) {
            return null;
        }
        return banca;
    }

    public static String materia(String valor) {
        return texto(valor, "materia", MAX_MATERIA);
    }

    public static String assunto(String valor) {
        return texto(valor, "assunto", MAX_ASSUNTO);
    }

    /** Slug do material: sem barras (nao e' caminho) e sem caracteres de controle. */
    public static String slug(String valor) {
        String slug = texto(valor, "slug", MAX_SLUG);
        if (slug == null) {
            throw new IllegalArgumentException("slug inválido.");
        }
        if (slug.indexOf('/') >= 0 || slug.indexOf('\\') >= 0) {
            throw new IllegalArgumentException("slug inválido.");
        }
        return slug;
    }
}
