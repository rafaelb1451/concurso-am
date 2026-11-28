# Controle de acesso por plano e certame — QB Concurso

## Decisão de produto
- **FREE**: limite diário de questões (20/dia), sem escopo por certame, **sem Tutor de IA**.
- **BASICO**: **1 certame** contratado, sem Tutor de IA. Preço padrão R$ 29,90/mês (parametrizável).
- **PLUS**: **até 3 certames**, Tutor de IA liberado (cota diária parametrizável). Preço padrão R$ 49,90/mês.
- Tutoria de IA: **somente PLUS** (bloqueio 403 no backend).
- Conteúdo (questões, materiais, simulados) filtrado **sempre** pelos certames contratados.
- FREE não é escopado (serve de amostra), mas continua limitado por questões/dia.

## Modelo de dados
- `planos`: + `certames_maximos INT NOT NULL DEFAULT 0`, `tutor_ia BOOLEAN NOT NULL DEFAULT false`, `cota_tutor_diaria INT NOT NULL DEFAULT 0` (-1 = ilimitado).
- `assinatura_certames` (nova): `assinatura_id BIGINT`, `concurso VARCHAR(20)`, UNIQUE(assinatura_id, concurso).
- `acessos_auditoria` (nova): `id`, `usuario_id`, `ip`, `recurso`, `concurso`, `permitido BOOLEAN`, `motivo VARCHAR(120)`, `criada_em TIMESTAMPTZ`.
- Migração Flyway `V4__acesso_por_certame.sql`: adiciona colunas, cria tabelas, e **migra** os planos antigos:
  - `PRO_MENSAL` → `BASICO`, `PRO_ANUAL` → `PLUS` (UPDATE plans SET codigo).
  - Assinaturas herdam os certames do plano? Não: para assinaturas existentes, inserir todos os certames atuais (grandfathering) e depois o admin ajusta.

## Contrato de API
- `GET /api/planos` → `[{codigo, nome, valorCentavos, ciclo, certamesMaximos, tutorIa, cotaTutorDiaria, limiteDiarioQuestoes}]`.
- `GET /api/assinatura` → `{plano:{...}, status, periodoFim, certames:[...], tutorIa:bool, tutorUso:{usado,cota}, podeTrocarCertame:bool}`.
- `POST /api/assinatura/checkout` → body `{plano:"BASICO"|"PLUS", certames:["PM-AM",...]}`; valida quantidade ≤ certamesMaximos e códigos válidos.
- `PUT /api/assinatura/certames` → `{certames:[...]}`; 1 troca por ciclo (auditada).
- `GET /api/questoes` → já filtrado server-side pelos certames do plano (INTERSEÇÃO com o `concurso` pedido).
- `GET /api/materiais` → idem.
- `GET /api/concursos` → filtrado pelo escopo do plano. Com `?catalogo=true`, devolve todos os certames (mesmo os não contratados) para a seleção no checkout/troca; continua autenticado e não expõe conteúdo.
- `POST /api/chat` → 403 se plano sem Tutor (BASICO/FREE) ou cota excedida.
- `GET /api/uso-tutor` → `{usado, cota}`.

## Regra central
`AcessoService` expõe:
- `Set<String> certamesDe(Long usuarioId)` — vazio = sem escopo (FREE).
- `void exigirEscopo(Long usuarioId, Set<String> pedidos)` — 403 se algum pedido estiver fora.
- `boolean podeTutor(Long usuarioId)` — plano.tutorIa && cota.
- `void auditar(usuarioId, ip, recurso, concurso, permitido, motivo)`.

Toda consulta de conteúdo aplica: se `certamesDe` não vazio → `WHERE concurso IN (...)`.
Nunca confiar no frontend: validação no servidor.

## Frontend
- Tela Planos: comparação Básico × Plus (nº certames, tutor, questões).
- Seleção de certame(s) no checkout (busca, prévia, limite do plano).
- Badges do plano atual; bloqueio visual (lock + CTA "Conheça oPlus").
- Painel do usuário: plano, certames, uso do Tutor.

## Rollout
- Feature flag `concurso.acesso.escopo-por-certame` (default true após homologação).
- Canário: liberar para 5% → 100% (flag por usuário).
