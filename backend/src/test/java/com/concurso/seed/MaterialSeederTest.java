package com.concurso.seed;

import com.concurso.domain.MaterialEstudo;
import com.concurso.repo.MaterialEstudoRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.test.util.ReflectionTestUtils;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * O seed de material roda a cada boot. Se ele duplicasse por slug, o banco cresceria a cada
 * deploy; se nao atualizasse, corrigir um texto exigiria SQL manual.
 */
@DataJpaTest
class MaterialSeederTest {

    @Autowired
    private MaterialEstudoRepository materiais;

    @Test
    void carregaPorSlugEAtualizaSemDuplicar() throws Exception {
        MaterialSeeder seeder = seeder("classpath:materiais-teste.json");

        seeder.run(null);
        assertEquals(2, materiais.count());

        MaterialEstudo existente = materiais.findBySlug("lei-5194-1966").orElseThrow();
        Long idOriginal = existente.getId();
        assertEquals("LEI", existente.getCategoria().name());
        assertFalse(existente.getConteudo().isBlank());

        // simula um texto desatualizado no banco: o seed deve repor o conteudo do arquivo
        existente.setTitulo("Titulo alterado");
        existente.setResumo("Resumo alterado");
        materiais.saveAndFlush(existente);

        seeder.run(null);

        assertEquals(2, materiais.count(), "reiniciar o app nao pode duplicar material");
        MaterialEstudo depois = materiais.findBySlug("lei-5194-1966").orElseThrow();
        assertEquals(idOriginal, depois.getId());
        assertEquals("Lei nº 5.194/1966", depois.getTitulo());
        assertEquals("Regula o exercício das profissões de engenheiro, arquiteto e agrônomo.",
                depois.getResumo());
        assertTrue(depois.getConteudo().contains("Art. 1º"));
        assertNotNull(depois.getAtualizadoEm());
    }

    @Test
    void arquivoAusenteNaoQuebraOBoot() throws Exception {
        MaterialSeeder seeder = seeder("classpath:materiais-que-nao-existe.json");

        seeder.run(null);

        assertEquals(0, materiais.count());
    }

    private MaterialSeeder seeder(String arquivo) {
        MaterialSeeder seeder = new MaterialSeeder(materiais, new ObjectMapper(),
                new DefaultResourceLoader());
        ReflectionTestUtils.setField(seeder, "arquivoMateriais", arquivo);
        return seeder;
    }
}
