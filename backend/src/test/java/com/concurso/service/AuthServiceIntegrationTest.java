package com.concurso.service;

import com.concurso.domain.Usuario;
import com.concurso.repo.SessaoRepository;
import com.concurso.repo.UsuarioRepository;
import com.concurso.web.Dtos;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Valida a persistencia real do bloqueio de login e do hash de sessao, contra H2 em memoria.
 * O contador de falhas precisa sobreviver ao lancamento da excecao de senha invalida — o bug
 * anterior fazia o rollback desfazer o incremento.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:auth-integration;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "concurso.seed.arquivo=questoes.json"
})
class AuthServiceIntegrationTest {

    @Autowired
    private AuthService auth;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private SessaoRepository sessoes;

    private Usuario criarUsuarioVerificado(String email) {
        Usuario usuario = new Usuario();
        usuario.setNome("Aluno");
        usuario.setEmail(email);
        usuario.setSenhaHash(SenhaHash.gerar("Test123456"));
        usuario.setEmailVerificado(true);
        return usuarios.save(usuario);
    }

    @Test
    void bloqueiaContaAposCincoFalhasDeFormaPersistente() {
        criarUsuarioVerificado("aluno@qb.test");

        for (int i = 0; i < 5; i++) {
            assertThrows(AuthException.class,
                    () -> auth.login("aluno@qb.test", "Errada123"));
        }

        Usuario persistido = usuarios.findByEmail("aluno@qb.test").orElseThrow();
        assertEquals(5, persistido.getTentativasFalhas(), "o contador deve persistir as 5 falhas");
        assertNotNull(persistido.getBloqueadoAte(), "a conta deve estar bloqueada");

        AuthException bloqueio = assertThrows(AuthException.class,
                () -> auth.login("aluno@qb.test", "Test123456"));
        assertTrue(bloqueio.getMessage().contains("bloqueada"));
    }

    @Test
    void loginBemSucedidoZeraOContador() {
        Usuario usuario = criarUsuarioVerificado("aluno-ok@qb.test");
        usuario.setTentativasFalhas(3);
        usuarios.save(usuario);

        Dtos.AuthView authView = auth.login("aluno-ok@qb.test", "Test123456");

        assertNotNull(authView.token());
        Usuario persistido = usuarios.findByEmail("aluno-ok@qb.test").orElseThrow();
        assertEquals(0, persistido.getTentativasFalhas());
    }

    @Test
    void sessaoGuardaApenasHashDoToken() {
        criarUsuarioVerificado("aluno-hash@qb.test");

        Dtos.AuthView authView = auth.login("aluno-hash@qb.test", "Test123456");
        String tokenBruto = authView.token();
        assertNotNull(tokenBruto);

        // O token em claro nunca deve ser a chave persistida na tabela de sessoes.
        assertTrue(sessoes.findById(tokenBruto).isEmpty(),
                "o token em claro nao pode ficar armazenado");
    }
}
