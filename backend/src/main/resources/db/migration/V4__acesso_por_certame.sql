-- =============================================================================
-- V4 — acesso por plano e certame
--
-- * planos ganha o limite de certames e a configuracao do Tutor de IA;
-- * assinatura_certames guarda os certames contratados em cada assinatura;
-- * acessos_auditoria registra negacoes/permissoes relevantes de acesso;
-- * tutor_uso conta as perguntas diarias ao Tutor (incremento atomico);
-- * grandfathering: assinaturas que ja liberavam acesso herdam todos os certames
--   existentes para que a virada nao bloqueie ninguem.
-- =============================================================================

ALTER TABLE planos ADD COLUMN certames_maximos INT NOT NULL DEFAULT 0;
ALTER TABLE planos ADD COLUMN tutor_ia BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE planos ADD COLUMN cota_tutor_diaria INT NOT NULL DEFAULT 0;

-- Planos antigos passam a usar o novo vocabulario comercial.
UPDATE planos SET codigo = 'BASICO' WHERE codigo = 'PRO_MENSAL';
UPDATE planos SET codigo = 'PLUS' WHERE codigo = 'PRO_ANUAL';

-- As colunas nascem com default 0/false; os planos renomeados precisam dos novos limites.
-- O preco/ciclo existentes sao preservados (quem ja assinava nao muda de valor aqui).
UPDATE planos SET certames_maximos = 1, tutor_ia = false, cota_tutor_diaria = 0
 WHERE codigo = 'BASICO';
UPDATE planos SET certames_maximos = 3, tutor_ia = true, cota_tutor_diaria = 50
 WHERE codigo = 'PLUS';
UPDATE planos SET certames_maximos = 0, tutor_ia = false, cota_tutor_diaria = 0
 WHERE codigo = 'FREE';

-- Rotulo comercial novo; o preco/ciclo de quem ja assinava nao e' alterado aqui.
UPDATE planos SET nome = 'Básico' WHERE codigo = 'BASICO' AND nome = 'PRO mensal';
UPDATE planos SET nome = 'Plus' WHERE codigo = 'PLUS' AND nome = 'PRO anual';

CREATE TABLE assinatura_certames (
    assinatura_id BIGINT NOT NULL REFERENCES assinaturas(id) ON DELETE CASCADE,
    concurso VARCHAR(20) NOT NULL,
    PRIMARY KEY (assinatura_id, concurso)
);

CREATE TABLE acessos_auditoria (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT,
    ip VARCHAR(64),
    recurso VARCHAR(120),
    concurso VARCHAR(20),
    permitido BOOLEAN NOT NULL,
    motivo VARCHAR(120),
    criada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tutor_uso (
    usuario_id BIGINT NOT NULL,
    dia DATE NOT NULL,
    usado INT NOT NULL DEFAULT 0,
    PRIMARY KEY (usuario_id, dia)
);

CREATE INDEX idx_assinatura_certames_concurso ON assinatura_certames (concurso);
CREATE INDEX idx_acessos_auditoria_usuario ON acessos_auditoria (usuario_id, criada_em);
CREATE INDEX idx_acessos_auditoria_recurso ON acessos_auditoria (recurso, criada_em);

-- Grandfathering: toda assinatura que ja liberava acesso (ATIVA, EM_ATRASO ou
-- CANCELADA dentro do periodo pago) recebe todos os certames que existem hoje.
-- O admin ajusta caso a caso depois; sem isso a nova regra bloquearia o acesso
-- de quem ja pagava.
INSERT INTO assinatura_certames (assinatura_id, concurso)
SELECT a.id, qc.concurso
FROM assinaturas a
CROSS JOIN (
    SELECT DISTINCT concurso
    FROM question_concursos
    WHERE concurso IS NOT NULL AND TRIM(concurso) <> ''
) qc
WHERE a.status IN ('ATIVA', 'EM_ATRASO', 'CANCELADA')
ON CONFLICT DO NOTHING;
