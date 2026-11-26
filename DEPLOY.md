# Deploy do QB Concurso

Stack: **1 container de aplicação** (Spring Boot servindo o SPA buildado) + **Caddy** como porta de
entrada com HTTPS automático e senha. O banco H2 vive em volume Docker.

```
internet ──443──> Caddy (TLS + basic auth + headers) ──8080──> app (Spring + React) ──> volume /dados
```

O container da aplicação **não publica porta**: só o Caddy a alcança, pela rede interna do Compose.

---

## 1. Na máquina Oracle (VM Ampere, Ubuntu 22.04/24.04)

```bash
# Docker
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER   # saia e entre de novo na sessão

# firewall: só 22, 80 e 443 (o Security List da OCI também precisa liberar 80/443)
sudo ufw allow 22,80,443/tcp
sudo ufw enable
```

## 2. Código e configuração

```bash
git clone https://github.com/rafaelb1451/concurso-am.git
cd concurso-am

cp .env.example .env
nano .env
```

No `.env`:

- **`DOMINIO`** — se não tiver domínio, use o IP da VM nesta forma:
  `qb.203.0.113.10.sslip.io` (o `sslip.io` resolve para o IP e o Caddy emite certificado válido).
- **`QB_SENHA_HASH`** — gere com:
  ```bash
  docker run --rm caddy:2-alpine caddy hash-password --plaintext 'sua-senha-forte'
  ```
  Cole o resultado inteiro (começa com `$2b$`).
- **`DEEPSEEK_API_KEY`** — a chave atual (rotacione se desconfiar de exposição). É o caminho
  recomendado no servidor. A chave também pode ser colada na aba Fixação; nesse caso ela é gravada
  em `/dados/segredos/deepseek.key` (o root do container é read-only). A variável de ambiente tem
  precedência sobre o arquivo.
- **`RESEND_API_KEY`** — API key da conta Resend usada para verificação de e-mail, alteração de
  e-mail e recuperação de senha. Crie uma chave em `api.resend.com/api-keys`.
  **Enquanto estiver vazia, a comunicação por e-mail fica pausada**: o cadastro já nasce com a
  conta ativa (sem etapa de confirmação). Quando você tiver domínio e remetente validados, preencha
  esta variável e a verificação por e-mail volta automaticamente.
- **`RESEND_FROM_EMAIL`** — remetente aprovado pelo Resend, por exemplo
  `noreply@qbconcurso.com`. Configure e valide o domínio/DKIM no painel do Resend.
- **`CONCURSO_APP_URL`** — URL pública completa, por exemplo `https://SEU-DOMINIO`.

## 3. Subir

```bash
docker compose config          # confira a configuração resolvida
docker compose up -d --build
docker compose logs -f app     # acompanhe o primeiro boot
```

O Postgres sobe primeiro (o app espera o `pg_isready` responder). O Caddy só começa a aceitar
tráfego depois que o `HEALTHCHECK` da aplicação passa.

No primeiro boot o app **cria o schema no Postgres** e carrega **1.000+ questões** do seed
consolidado. Espere estas linhas:

```
HHH000412: Hibernate ORM core version ...
Seed: 1004 questoes carregadas de seed-completo.json.
```

### 3.1. Migração H2 → PostgreSQL (só na primeira vez)

O banco antigo (H2) está no volume Docker `dados` e **continua intacto** até você removê-lo — ele
serve de rollback. Para migrar:

```bash
# 1. confirme que o Postgres está de pé e o app subiu sem erro
docker compose ps                 # db e app devem estar healthy
docker compose logs app | tail -20

# 2. confira que o seed entrou
docker compose exec db psql -U qb -d qb -c "SELECT COUNT(*) FROM questions;"
#    esperado: 1004

# 3. guarde o backup do banco antigo (rollback)
docker run --rm -v concurso-am_dados:/dados -v $PWD:/bkp alpine tar czf /bkp/h2-antigo.tgz -C /dados .
```

> **Dados do usuário não são migrados** — decisão consciente: existia um único usuário (você) e o
> histórico de respostas é descartável. O que importa (as 1.004 questões e comentários) vem do seed.

### 3.2. Trocar o schema para Flyway (Etapa B, depois de validar o boot)

Com o Postgres rodando e o schema criado pelo Hibernate, o baseline é gerado **do banco real** (nada
de escrever DDL à mão):

```bash
# 1. baseline a partir do schema vivo
docker compose exec db pg_dump -U qb -d qb --schema-only --no-owner --no-privileges > backend/src/main/resources/db/migration/V1__schema_inicial.sql

# 2. revise o arquivo (não deve conter CREATE DATABASE nem ALTER OWNER)
head -40 backend/src/main/resources/db/migration/V1__schema_inicial.sql

# 3. vire as chaves no .env
#    DDL_AUTO=validate
#    FLYWAY_ENABLED=true

# 4. rebuild e suba
docker compose up -d --build
docker compose logs app | grep -i flyway     # deve mostrar "Successfully validated"
```

Se o boot falhar em `validate`, o Hibernate aponta exatamente qual coluna/tabela diverge — o que é
desejável: falha cedo, com mensagem clara, em vez de drift silencioso.

## 4. Verificar

```bash
curl -u rafael:SUA-SENHA https://SEU-DOMINIO/api/concursos
docker compose ps          # db, app e caddy devem estar "healthy"
```

Abra `https://SEU-DOMINIO` no navegador: o Caddy pede usuário e senha, e aí entra o app.

---

## Operação

| Ação | Comando |
|---|---|
| Logs da aplicação | `docker compose logs -f app` |
| Logs de acesso/erro do proxy | `docker compose logs -f caddy` |
| Reiniciar | `docker compose restart app` |
| Atualizar código | `git pull && docker compose up -d --build` |
| Backup do banco (app parado) | `docker compose stop app && docker run --rm -v concurso-am_dados:/dados -v $PWD:/bkp alpine tar czf /bkp/dados.tgz -C /dados . && docker compose start app` |
| Restaurar | inverso do backup, com o app parado |

O nome do volume (`concurso-am_dados`) vem do diretório do clone. Confira com
`docker volume ls` antes do backup. Pare o app durante a cópia para o H2 não estar no meio de uma
escrita.

**Recuperar o banco do zero**: o conteúdo é reproduzível a partir dos lotes do repositório —
apague o volume (`docker compose down -v`) e suba de novo; o seed recarrega tudo.

## Segurança aplicada

| Item | Como |
|---|---|
| Porta de entrada | basic auth no Caddy (bcrypt) |
| HTTPS | certificado automático do Caddy |
| Backend exposto? | **não** — sem `ports:` no serviço `app` |
| Chave da DeepSeek | variável de ambiente; nunca na imagem nem no repo |
| Cabeçalhos | CSP, HSTS, `nosniff`, `Referrer-Policy`, `X-Frame-Options` |
| Limite de custo | `/api/chat` limitado a 20 chamadas/min e 20 mensagens por requisição |
| Contas | senha PBKDF2, bloqueio após 5 tentativas, tokens SHA-256; sessão guarda só o hash |
| Comunicação | Resend por API; links com validade de 2 horas — pausada enquanto `RESEND_API_KEY` estiver vazia (conta ativa sem verificação) |
| LGPD | exportação JSON e exclusão permanente dos dados pelo usuário |
| Container | usuário não-root, root FS read-only, `cap_drop: ALL` |
| Dados | volume Docker, fora da imagem |

## Limitações conhecidas

- **H2 em arquivo**: adequado ao volume atual; o sistema já separa dados por usuário. Quando o
  crescimento exigir mais concorrência, migrar para PostgreSQL (o `pom.xml` já traz o driver).
- **`ddl-auto: update`**: sem migração versionada. Como o banco é reproduzível pelos lotes, o risco
  é baixo — mas não é o ideal para evolução de schema.
- **Sem backup automático**: agende o backup acima no cron se quiser garantia.
