package com.concurso.web;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ParametrosTest {

    @Test
    void valorEmBrancoSignificaTodos() {
        assertNull(Parametros.concurso("   "));
        assertNull(Parametros.banca(""));
        assertNull(Parametros.banca("TODAS"));
        assertNull(Parametros.banca("todas"));
        assertNull(Parametros.materia(null));
    }

    @Test
    void normalizaConcursoEValidaFormato() {
        assertEquals("CREA-AM", Parametros.concurso(" crea-am "));
        assertEquals("PM-AM", Parametros.concurso("pm-am"));
        assertThrows(IllegalArgumentException.class, () -> Parametros.concurso("CREA AM"));
        assertThrows(IllegalArgumentException.class, () -> Parametros.concurso("A"));
    }

    @Test
    void truncaNoTamanhoMaximo() {
        assertEquals(40, Parametros.banca("F".repeat(80)).length());
        assertEquals(120, Parametros.materia("M".repeat(300)).length());
        assertEquals(120, Parametros.assunto("A".repeat(300)).length());
    }

    @Test
    void rejeitaCaracteresDeControle() {
        assertThrows(IllegalArgumentException.class, () -> Parametros.banca("FGV\u0000"));
        assertThrows(IllegalArgumentException.class, () -> Parametros.materia("Direito\nPenal"));
    }
}
