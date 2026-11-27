# Deploy do QB Concurso

Stack: **PostgreSQL 16** + **aplicação Spring Boot** (serve a API e o SPA buildado) + **Caddy**
como única porta de entrada (TLS automático, HTTP/3, cabeçalhos de segurança).

```
internet ──80/443──> Caddy ──8080──> app (Spring + React) ──5432──> db (PostgreSQL)
                                        └──> volume /dados (chave do tutor)
```

O `app` e o `db` **não publicam porta**: só o Caddy alcança a aplicação, pela rede interna do
Compose. Não existe basic auth no Caddy — o login é o do próprio sistema.

---

## 1. Primeiro deploy (VM nova)

Requisitos: Ubuntu 22.04/24.04 com Docker; Security List da OCI liberando 80 e 443.

```bash
# na VM, como root (ou com sudo)
DOMINIO=qbconcurso.com.br \
POSTGRES_PASSWORD="$(openssl rand -base64 24)" \
MP_ACCESS_TOKEN="APP_USR-..." \
MP_WEBHOOK_SECRET="..." \
SMTP_USERNAME="contato@qbconcurso.com.br" \
SMTP_PASSWORD="..." \
SMTP_FROM="contato@qbconcurso.com.br" \
GOOGLE_CLIENT_ID="...apps.googleusercontent.com" \
DEEPSEEK_API_KEY="sk-..." \
./scripts/deploy-fresh.sh
```

O script:

1. instala Docker e clona o repositório em `/root/concurso-am`;
2. **se já existir `.env`, preserva** (só regrava com `FORCE_ENV=1`);
3. exige `DOMINIO`, `POSTGRES_PASSWORD` e `MP_ACCESS_TOKEN`;
4. valida `SMTP_USERNAME` sem `SMTP_PASSWORD` (aborta);
5. grava o `.env` com `chmod 600`;
6. roda `docker compose up -d --build`.

No primeiro boot, espere no log:

```
Successfully applied 1 migration to schema "public"
Seed: 1004 questoes carregadas de seed-completo.json.
```

---

## 2. Atualizações (dia a dia)

**Use sempre o `deploy.sh`.** Ele foi feito para não repetir o incidente em que um redeploy
apagou `MP_ACCESS_TOKEN`/`SMTP_PASSWORD` e derrubou pagamento e cadastro.

```bash
cd /root/concurso-am
./scripts/deploy.sh
```

O que ele faz, em ordem:

| Etapa | Garantia |
|---|---|
| Pré-checagem do `.env` | aborta se `DOMINIO`, `POSTGRES_PASSWORD` ou `MP_ACCESS_TOKEN` estiverem vazios |
| Avisos | `MP_WEBHOOK_SECRET` vazio, `SMTP_PASSWORD` ausente, `CONCURSO_APP_URL` não-https |
| Backup do banco | `scripts/backup-postgres.sh` antes de trocar a imagem |
| Rollback | guarda a imagem atual como `qb-concurso:rollback` |
| Build | compila **antes** de recriar: o app antigo continua atendendo |
| Healthcheck | espera `healthy` por até 120 s |
| Falha | mostra os logs e volta a imagem anterior automaticamente |

> **Nunca** use `docker compose restart` para mudança de `.env`: `restart` não recarrega
> variáveis. Use `docker compose up -d --force-recreate app`.

---

## 3. Variáveis obrigatórias

Confira sem expor segredo:

```bash
awk -F= '/^(DOMINIO|POSTGRES_PASSWORD|MP_ACCESS_TOKEN|MP_WEBHOOK_SECRET|SMTP_USERNAME|SMTP_PASSWORD|CONCURSO_APP_URL)=/{printf "%-20s %s\n",$1,(length($2)>0?"preenchido":"VAZIO")}' .env
```

| Variável | Sem ela |
|---|---|
| `DOMINIO` | Caddy não emite certificado |
| `POSTGRES_PASSWORD` | app não conecta no banco (502 em tudo) |
| `MP_ACCESS_TOKEN` | checkout desabilitado: **ninguém compra** |
| `MP_WEBHOOK_SECRET` | webhook recusado: pagamento aprovado **não libera o PRO** |
| `SMTP_PASSWORD` (com `SMTP_USERNAME`) | cadastro falha no envio do e-mail (503) |
| `CONCURSO_APP_URL` (https) | Mercado Pago recusa `back_urls` |

Valores com `$`, `#` ou espaço precisam de aspas simples no `.env`. Senhas de
`openssl rand -base64 24` não têm `$` e são seguras para o Compose.

---

## 4. Verificação pós-deploy

```bash
docker compose ps                                  # db, app e caddy "healthy"
curl -fsS https://qbconcurso.com.br/api/publico/materias >/dev/null && echo API-OK
curl -fsS https://qbconcurso.com.br/robots.txt | head -3
curl -fsS https://qbconcurso.com.br/sitemap.xml | grep -c "<loc>"
docker compose logs --tail=60 app | grep -iE "smtp|mercado|started"
```

Fluxo funcional mínimo:

1. criar uma conta (não pode retornar 502);
2. entrar e abrir **Planos** (o botão de assinatura precisa estar habilitado);
3. iniciar checkout e confirmar que a página do Mercado Pago abre;
4. após pagar, o webhook precisa aparecer no log como `PROCESSADO` e o plano virar PRO.

---

## 5. Rollback

```bash
cd /root/concurso-am
docker tag qb-concurso:rollback qb-concurso:latest
docker compose up -d app
docker compose logs --tail=80 app
```

Rollback de código sem imagem anterior:

```bash
git log --oneline -5
git checkout <commit-bom>
docker compose up -d --build
```

---

## 6. Banco de dados

Schema versionado por Flyway (`backend/src/main/resources/db/migration/`), com
`ddl-auto=validate` no perfil de produção. O seed só roda com a tabela vazia.

```bash
docker compose exec db psql -U qb -d qb -c "SELECT COUNT(*) FROM questions;"
docker compose exec db psql -U qb -d qb -c "SELECT version, success FROM flyway_schema_history;"

./scripts/backup-postgres.sh          # dump em backups/
docker compose exec -T db pg_restore  # ver cabeçalho do script para restaurar
```

Não troque `POSTGRES_PASSWORD` em um volume existente: o Postgres mantém a senha antiga e o
app passa a receber `password authentication failed` (o container entra em crash loop e o
Caddy responde 502 em tudo). Se precisar trocar, faça via `ALTER USER` dentro do banco.

---

## 7. Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| **502 em todas as rotas** | app unhealthy / crash loop / banco fora | `docker compose ps`, `docker compose logs --tail=100 app`, `docker compose logs db`; se for pós-deploy, rollback |
| **Cadastro retorna 502/503** | SMTP sem senha ou credencial inválida | conferir `SMTP_USERNAME`/`SMTP_PASSWORD`; log mostra `Falha ao enviar e-mail por SMTP` |
| **"Pagamento indisponível"** | `MP_ACCESS_TOKEN` vazio | preencher e `docker compose up -d --force-recreate app` |
| **Checkout abre mas não libera PRO** | `MP_WEBHOOK_SECRET` errado/ausente | conferir log `Webhook do Mercado Pago`; reconfigurar a assinatura secreta no painel do MP |
| **Página quebrada ao cancelar pagamento** | `back_urls` antigo (`/assinatura/cancelado` → 404) | atualizar para um commit com `/?assinatura=cancelado` |
| **Site lento/OOM** | VM pequena para build + JVM | `free -m`, `docker stats`; limitar `JAVA_TOOL_OPTIONS` ou fazer build fora da VM |

---

## 8. Segurança aplicada

| Item | Como |
|---|---|
| Porta de entrada | Caddy com TLS automático (sem basic auth) |
| Backend exposto? | **não** — sem `ports:` no serviço `app` |
| Segredos | `.env` com `chmod 600`, nunca na imagem nem no repositório |
| Containers | usuário não-root, root FS read-only, `cap_drop: ALL`, `no-new-privileges` |
| Cabeçalhos | CSP, HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` |
| Webhook | HMAC `x-signature` obrigatório (fail closed) |
| Contas | PBKDF2, bloqueio após 5 tentativas, token de sessão hasheado |
| LGPD | exportação JSON e exclusão permanente pelo usuário |

## 9. Limitações conhecidas

- Build (Maven + npm) roda **na própria VM**: em instância de 1 GB pode falhar por memória.
  Nesse caso, faça o build em outra máquina e publique a imagem em um registry.
- Sem CI/CD: o deploy é `git pull` + `docker compose build` na VM.
- Backup é manual (ou agendado no cron); não há PITR.
