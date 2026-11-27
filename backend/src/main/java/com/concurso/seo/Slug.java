package com.concurso.seo;

import java.text.Normalizer;
import java.util.Locale;

/** Gera slugs estaveis para URLs publicas (sem acento, minusculo, hifen). */
final class Slug {

    private Slug() {
    }

    static String de(String texto) {
        if (texto == null || texto.isBlank()) {
            return "";
        }
        String semAcento = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        return semAcento.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
    }
}
