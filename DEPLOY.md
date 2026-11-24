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

## 3. Subir

```bash
docker compose config          # confira a configuração resolvida
docker compose up -d --build
docker compose logs -f app     # acompanhe o primeiro boot
```

O Caddy só começa a aceitar tráfego depois que o `HEALTHCHECK` da aplicação passa.

No primeiro boot o app carrega **1.000+ questões** do seed consolidado. Espere a linha:

```
Seed: 1004 questoes carregadas de seed-completo.json.
```

## 4. Verificar

```bash
curl -u rafael:SUA-SENHA https://SEU-DOMINIO/api/concursos
docker compose ps          # app deve estar "healthy"
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
| Container | usuário não-root, root FS read-only, `cap_drop: ALL` |
| Dados | volume Docker, fora da imagem |

## Limitações conhecidas

- **H2 em arquivo**: adequado a um usuário. Se um dia virar multiusuário, migrar para PostgreSQL
  (o `pom.xml` já traz o driver).
- **`ddl-auto: update`**: sem migração versionada. Como o banco é reproduzível pelos lotes, o risco
  é baixo — mas não é o ideal para evolução de schema.
- **Sem backup automático**: agende o backup acima no cron se quiser garantia.
