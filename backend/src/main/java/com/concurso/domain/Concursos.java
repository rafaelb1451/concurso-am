package com.concurso.domain;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Concursos alvo.
 *
 * <p>{@link #TODOS} continua sendo o conjunto de conteudos comum aos certames historicos (as
 * questoes sem marcacao no JSON valem para os dois). Novos certames, como {@code CREA-AM}, entram
 * pela whitelist dinamica: o codigo e' validado por regex e normalizado antes de ir para o banco,
 * em vez de existir uma lista fixa que exigiria deploy a cada concurso novo.</p>
 */
public final class Concursos {

    public static final String PM_AM = "PM-AM";
    public static final String PC_AM = "PC-AM";
    public static final String CREA_AM = "CREA-AM";

    /** Concursos que recebem o conteudo comum quando o JSON nao marca nenhum. */
    public static final List<String> TODOS = List.of(PM_AM, PC_AM);

    /** Certames oficialmente suportados hoje (rotulos conhecidos). A validacao aceita outros. */
    public static final List<String> CONHECIDOS = List.of(PM_AM, PC_AM, CREA_AM);

    /** Codigo de certame: 2 a 10 caracteres alfanumericos, com um sufixo opcional. */
    private static final Pattern CODIGO = Pattern.compile("^[A-Z0-9]{2,10}(-[A-Z0-9]{2,10})?$");

    /** Tamanho maximo do codigo armazenado em {@code question_concursos.concurso}. */
    public static final int TAMANHO_MAXIMO = 20;

    private Concursos() {
    }

    /**
     * Valida um codigo de concurso ja normalizado (maiusculo, sem espacos). Aceita qualquer codigo
     * que respeite o formato, o que permite importar novos certames sem alterar o codigo.
     */
    public static boolean valido(String concurso) {
        if (concurso == null || concurso.isBlank()) {
            return false;
        }
        String codigo = concurso.trim();
        return codigo.length() <= TAMANHO_MAXIMO && CODIGO.matcher(codigo).matches();
    }

    /** Normaliza para maiusculo sem espacos (" crea-am " vira "CREA-AM"). Branco vira nulo. */
    public static String normalizar(String concurso) {
        if (concurso == null) {
            return null;
        }
        String codigo = concurso.trim().toUpperCase(Locale.ROOT);
        return codigo.isEmpty() ? null : codigo;
    }
}
