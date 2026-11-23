package com.concurso.domain;

import java.util.List;

/** Concursos alvo. Conteudo comum pertence aos dois. */
public final class Concursos {

    public static final String PM_AM = "PM-AM";
    public static final String PC_AM = "PC-AM";

    public static final List<String> TODOS = List.of(PM_AM, PC_AM);

    private Concursos() {
    }

    public static boolean valido(String concurso) {
        return TODOS.contains(concurso);
    }
}
