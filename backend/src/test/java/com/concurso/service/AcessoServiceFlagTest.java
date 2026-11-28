package com.concurso.service;

import com.concurso.repo.AcessoAuditoriaRepository;
import com.concurso.repo.AssinaturaCertameRepository;
import com.concurso.repo.AttemptRepository;
import com.concurso.repo.QuestionRepository;
import com.concurso.repo.TutorUsoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * Feature flag {@code concurso.acesso.escopo-por-certame}: desligada, a regra de escopo por
 * certame é revertida para o comportamento antigo (escopo vazio) sem tocar no banco.
 */
@ExtendWith(MockitoExtension.class)
class AcessoServiceFlagTest {

    @Mock private AssinaturaService assinaturas;
    @Mock private AttemptRepository attempts;
    @Mock private AssinaturaCertameRepository certames;
    @Mock private TutorUsoRepository tutorUso;
    @Mock private AcessoAuditoriaRepository auditorias;
    @Mock private AuditoriaService auditoria;
    @Mock private QuestionRepository questions;

    @Test
    void flagDesligadaDevolveEscopoVazioSemConsultarOBanco() {
        AcessoService acesso = new AcessoService(assinaturas, attempts, certames, tutorUso,
                auditorias, auditoria, questions, false);

        assertTrue(acesso.certamesDe(1L).isEmpty(),
                "com a flag desligada o escopo precisa ser vazio (comportamento antigo)");

        // O atalho da flag não deve consultar assinatura, certames nem questões.
        verifyNoInteractions(assinaturas, certames, questions);
    }
}
