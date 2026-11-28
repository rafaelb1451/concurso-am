# Runbook operacional — QB Concurso

Procedimentos de emergência e auditoria para o controle de acesso por plano/certame
(`docs/access-control.md`) e para a LGPD (`docs/lgpd.md`).

---

## 1. Destravar um usuário com bloqueio indevido de certame

Sintoma: o aluno paga (ou foi concedido manualmente), mas recebe **403** ao consultar um certame
que deveria ver. O backend audita a negativa em `acessos_auditoria` com o motivo
`certame fora do plano`.

### 1.1 Diagnosticar

```sql
-- Quem é o usuário?
SELECT id, email, nome FROM usuarios WHERE email = 'aluno@exemplo.com';

-- Qual assinatura está ativa e quais certames estão vinculados a ela?
SELECT a.id, a.usuario_id, p.codigo, a.status, a.periodo_fim, a.libera_pro
FROM assinaturas a
JOIN planos p ON p.id = a.plano_id
WHERE a.usuario_id = <ID_DO_USUARIO>
ORDER BY a.criada_em DESC;

SELECT assinatura_id, concurso
FROM assinatura_certames
WHERE assinatura_id = <ID_DA_ASSINATURA>
ORDER BY concurso;

-- O que o backend registrou de negativa?
SELECT criada_em, recurso, concurso, permitido, motivo, ip
FROM acessos_auditoria
WHERE usuario_id = <ID_DO_USUARIO>
ORDER BY criada_em DESC;
```

> Importante: assinaturas pagas **sem** linhas em `assinatura_certames` caem no *fallback legado* e
> enxergam **todos** os certames (grandfathering). Se o aluno vê tudo, é esse o caso — não é um bug;
> é a migração da V4 preservando o acesso antigo até o admin ajustar.

### 1.2 Corrigir pelo painel (caminho recomendado)

O admin pode conceder/revogar assinaturas pelo painel (roteiro `Admin`):

- `POST /api/admin/assinaturas/conceder` — corpo `{ "email": "aluno@exemplo.com", "plano": "BASICO", "dias": 30 }`.
- `POST /api/admin/assinaturas/revogar` — corpo `{ "email": "aluno@exemplo.com" }`.

Toda concessão/revogação fica gravada em `eventos_pagamento` (gateway `manual`) para auditoria.

### 1.3 Ajustar certames manualmente (SQL)

Quando for preciso fixar os certames de uma assinatura específica (a concessão manual não define
certames; o admin "ajusta" depois):

```sql
BEGIN;

-- Remove a escolha atual da assinatura ativa.
DELETE FROM assinatura_certames WHERE assinatura_id = <ID_DA_ASSINATURA>;

-- Insere os certames corretos (Básico = 1; Plus = até 3).
INSERT INTO assinatura_certames (assinatura_id, concurso) VALUES
  (<ID_DA_ASSINATURA>, 'PM-AM');

COMMIT;
```

O acesso passa a valer na próxima requisição (o `AcessoService.certamesDe` lê a tabela a cada
consulta). Não é necessário reiniciar o app.

---

## 2. Desligar a feature flag de escopo em emergência

A regra de escopo por certame é controlada por `concurso.acesso.escopo-por-certame`
(env `ACESSO_ESCOPO_POR_CERTAME`, default `true`).

Para reverter **imediatamente** ao comportamento antigo (sem escopo — todo conteúdo visível,
como antes da V4) sem novo build:

1. No servidor, edite o `.env` (ou o ambiente do container):

   ```bash
   # comportamento antigo (sem escopo por certame)
   ACESSO_ESCOPO_POR_CERTAME=false
   ```

2. Reimplante **recriando** o container (não use `docker compose restart`, que não recarrega env):

   ```bash
   cd /root/concurso-am
   docker compose up -d app
   ```

3. Confirme:

   ```bash
   docker compose logs --tail=40 app
   # ou valide uma rota:
   curl -fsS https://$(grep -E '^DOMINIO=' .env | cut -d= -f2-)/api/planos >/dev/null && echo OK
   ```

Quando a emergência passar, volte `ACESSO_ESCOPO_POR_CERTAME=true` e reimplante da mesma forma.

> O gating do **Tutor de IA** não passa por essa flag: ele continua derivado do plano
> (`tutor_ia` + `cota_tutor_diaria`). Desligar o escopo **não** libera o Tutor para o Básico.

---

## 3. Reverter um deploy

`scripts/deploy.sh` já guarda a imagem anterior como `qb-concurso:rollback` **antes** do build e,
se o healthcheck falhar (~120s), ele mesmo restaura a imagem anterior e sobe o app de volta.

### 3.1 Rollback automático (já embutido no deploy)

Se o deploy falhar no healthcheck, o script imprime `ERRO: app não ficou healthy` e executa:

```bash
docker tag qb-concurso:rollback qb-concurso:latest
docker compose up -d app
```

Apenas acompanhe o log do deploy.

### 3.2 Rollback manual

```bash
cd /root/concurso-am
docker tag qb-concurso:rollback qb-concurso:latest
docker compose up -d app
docker compose logs --tail=80 app
```

Confirme o healthcheck:

```bash
docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q app)"
```

---

## 4. Auditoria de acessos (`acessos_auditoria`)

A tabela registra permissões e negativas relevantes (certame fora do plano, tutor bloqueado/cota,
troca de certames). Ela **não** guarda conteúdo sensível — apenas quem, de onde, o recurso e o motivo.

```sql
-- Negativas de certame nas últimas 24h
SELECT criada_em, usuario_id, concurso, motivo, ip
FROM acessos_auditoria
WHERE recurso = 'certame' AND permitido = false
  AND criada_em >= now() - interval '24 hours'
ORDER BY criada_em DESC;

-- Tutor bloqueado (plano sem tutor ou cota) nas últimas 24h
SELECT criada_em, usuario_id, motivo, ip
FROM acessos_auditoria
WHERE recurso = 'tutor' AND permitido = false
  AND criada_em >= now() - interval '24 hours'
ORDER BY criada_em DESC;

-- Troca de certames de um usuário (permitida uma vez por ciclo)
SELECT criada_em, concurso, permitido, motivo
FROM acessos_auditoria
WHERE usuario_id = <ID_DO_USUARIO> AND recurso = 'troca-certames'
ORDER BY criada_em DESC;

-- Volume por recurso (para dimensionar bloqueios indevidos)
SELECT recurso, permitido, count(*)
FROM acessos_auditoria
WHERE criada_em >= now() - interval '7 days'
GROUP BY recurso, permitido
ORDER BY recurso, permitido;
```

> Lembrete LGPD: a exclusão da conta (`DELETE /api/conta`) apaga também a trilha de auditoria do
> usuário (`acessos_auditoria.deleteByUsuarioId`). Veja `docs/lgpd.md`.
