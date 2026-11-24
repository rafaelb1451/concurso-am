package com.concurso.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DeepSeekServiceTest {

    @TempDir
    private Path temp;

    @Test
    void gravaAChaveNoCaminhoConfigurado() throws Exception {
        Path arquivo = temp.resolve("segredos/deepseek.key");
        DeepSeekService service = new DeepSeekService(new ObjectMapper(), arquivo.toString());

        service.salvarChave("  sk-teste-123  ");

        assertEquals("sk-teste-123", Files.readString(arquivo, StandardCharsets.UTF_8));
        assertTrue(service.configurado());
    }

    @Test
    void rejeitaChaveVaziaSemCriarArquivo() {
        Path arquivo = temp.resolve("deepseek.key");
        DeepSeekService service = new DeepSeekService(new ObjectMapper(), arquivo.toString());

        assertThrows(IllegalArgumentException.class, () -> service.salvarChave("   "));
        assertTrue(Files.notExists(arquivo));
    }
}
