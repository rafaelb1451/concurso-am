package com.concurso.service;

import com.concurso.domain.MaterialEstudo;
import com.concurso.repo.QuestionRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

/** Parse do conteudo em ramos do mapa mental: secoes, limite de itens e limite de ramos. */
class MapaMentalTest {

    private final MaterialPdfService service = new MaterialPdfService(mock(QuestionRepository.class));

    @Test
    void parseiaSecoesNoFormatoTituloNegrito() {
        MaterialEstudo material = material("""
                **Objeto.** A lei define o salário mínimo profissional. É remuneração mínima obrigatória. Qualquer fonte pagadora.

                **Classificação das atividades.** As tarefas são classificadas em: (a) 6 horas diárias; (b) mais de 6 horas diárias.
                """);

        MaterialPdfService.MapaMental mapa = service.mapa(material);

        assertEquals("Lei de teste", mapa.tema());
        assertEquals(2, mapa.ramos().size());
        assertEquals("Objeto", mapa.ramos().get(0).titulo());
        assertEquals(3, mapa.ramos().get(0).itens().size());
        assertEquals("Classificação das atividades", mapa.ramos().get(1).titulo());
        assertFalse(mapa.ramos().get(1).itens().isEmpty());
    }

    @Test
    void cadaRamoTemNoMaximoQuatroItensCurtos() {
        MaterialEstudo material = material("""
                **Muitos itens.** Primeira frase do texto. Segunda frase do texto. Terceira frase do texto. Quarta frase do texto. Quinta frase do texto. Sexta frase do texto.
                """);

        MaterialPdfService.MapaMental mapa = service.mapa(material);

        assertEquals(1, mapa.ramos().size());
        assertEquals(4, mapa.ramos().get(0).itens().size());
        for (String item : mapa.ramos().get(0).itens()) {
            assertTrue(item.length() <= 143, "item deveria ser cortado em ~140 caracteres: " + item.length());
        }
    }

    @Test
    void materialComMaisDeOitoSecoesTemNoMaximoOitoRamos() {
        StringBuilder conteudo = new StringBuilder();
        for (int i = 1; i <= 10; i++) {
            if (i > 1) {
                conteudo.append("\n\n");
            }
            conteudo.append("**Ramo ").append(i).append(".** Texto do ramo ").append(i).append('.');
        }
        MaterialEstudo material = material(conteudo.toString());

        MaterialPdfService.MapaMental mapa = service.mapa(material);

        assertEquals(8, mapa.ramos().size());
        assertEquals("Ramo 1", mapa.ramos().get(0).titulo());
        assertEquals("Ramo 8", mapa.ramos().get(7).titulo());
    }

    @Test
    void conteudoSemMarcadoresAindaGeraRamo() {
        MaterialEstudo material = material("Art. 1º O exercício das profissões depende de registro. O registro é obrigatório.");

        MaterialPdfService.MapaMental mapa = service.mapa(material);

        assertEquals(1, mapa.ramos().size());
        assertFalse(mapa.ramos().get(0).titulo().isBlank());
    }

    private static MaterialEstudo material(String conteudo) {
        MaterialEstudo material = new MaterialEstudo();
        material.setTitulo("Lei de teste");
        material.setConteudo(conteudo);
        return material;
    }
}
