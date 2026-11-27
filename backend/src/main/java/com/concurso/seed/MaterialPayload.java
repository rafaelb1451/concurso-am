package com.concurso.seed;

/**
 * Formato de {@code materiais.json}: array de objetos com concurso, slug, titulo, resumo,
 * categoria, fonte, conteudo e ordem.
 */
public record MaterialPayload(
        String concurso,
        String slug,
        String titulo,
        String resumo,
        String categoria,
        String fonte,
        String conteudo,
        Integer ordem
) {
}
