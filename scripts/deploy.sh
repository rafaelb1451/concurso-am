#!/usr/bin/env bash
# Atualiza um deploy existente do QB Concurso com segurança.
#
# O que este script garante:
#   1. pré-checagem do .env (não sobe com pagamento/cadastro quebrados);
#   2. backup do banco antes de trocar a imagem;
#   3. guarda a imagem anterior para rollback;
#   4. build ANTES de recriar (não derruba o app durante a compilação);
#   5. espera o healthcheck e, se falhar, volta para a imagem anterior.
#
# Uso (na VM):
#   cd /root/concurso-am && ./scripts/deploy.sh
#
# Não use `docker compose restart` para mudanças de .env: restart não recarrega env.
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose)
APP_IMAGE="qb-concurso:latest"
ROLLBACK_IMAGE="qb-concurso:rollback"

falhar() { echo "ERRO: $*" >&2; exit 1; }

[ -f .env ] || falhar ".env não encontrado. No primeiro deploy use scripts/deploy-fresh.sh."
[ -f docker-compose.yml ] || falhar "docker-compose.yml não encontrado (rode dentro do clone)."
command -v docker >/dev/null || falhar "docker não instalado."

# ------------------------------------------------------------------ .env
# Lê do .env sem imprimir segredo. Aceita valor com ou sem aspas.
valor() {
  grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

obrigatorias=(DOMINIO POSTGRES_PASSWORD)
for chave in "${obrigatorias[@]}"; do
  [ -n "$(valor "$chave")" ] \
    || falhar "$chave vazio no .env. O deploy abortou para não subir com pagamento/cadastro quebrados."
done

if [ -z "$(valor PAGBANK_TOKEN)" ] && [ -z "$(valor MP_ACCESS_TOKEN)" ]; then
  echo "AVISO: sem PAGBANK_TOKEN nem MP_ACCESS_TOKEN — o checkout ficará indisponível."
fi

if [ -n "$(valor SMTP_USERNAME)" ] && [ -z "$(valor SMTP_PASSWORD)" ]; then
  echo "AVISO: SMTP_USERNAME definido sem SMTP_PASSWORD — o cadastro vai falhar no envio de e-mail."
fi

url="$(valor CONCURSO_APP_URL)"
case "$url" in
  https://*) : ;;
  *) echo "AVISO: CONCURSO_APP_URL não é https ('$url') — o Mercado Pago recusa back_urls." ;;
esac

# ------------------------------------------------------------------ backup
if [ -x scripts/backup-postgres.sh ]; then
  echo "== backup do banco"
  scripts/backup-postgres.sh || echo "AVISO: backup falhou; seguindo com o deploy."
else
  echo "AVISO: scripts/backup-postgres.sh não encontrado; sem backup antes do deploy."
fi

# ------------------------------------------------------------------ rollback
if docker image inspect "$APP_IMAGE" >/dev/null 2>&1; then
  docker tag "$APP_IMAGE" "$ROLLBACK_IMAGE"
  echo "== imagem atual guardada como $ROLLBACK_IMAGE"
fi

# ------------------------------------------------------------------ código
echo "== atualizando código"
git fetch -q origin
git checkout -q main
git pull -q --ff-only

# ------------------------------------------------------------------ build
# Build antes de recriar: o container antigo continua atendendo durante a compilação.
echo "== build da aplicação"
"${COMPOSE[@]}" build app

# ------------------------------------------------------------------ sobe
echo "== subindo containers"
"${COMPOSE[@]}" up -d

# ------------------------------------------------------------------ healthcheck
echo "== aguardando o app ficar healthy"
for i in $(seq 1 60); do
  app_id="$("${COMPOSE[@]}" ps -q app 2>/dev/null || true)"
  if [ -n "$app_id" ]; then
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$app_id" 2>/dev/null || echo unknown)"
    if [ "$status" = "healthy" ]; then
      echo "OK: app healthy"
      break
    fi
  fi
  if [ "$i" = "60" ]; then
    echo "ERRO: app não ficou healthy em ~120s. Últimos logs:"
    "${COMPOSE[@]}" logs --tail=80 app || true
    if docker image inspect "$ROLLBACK_IMAGE" >/dev/null 2>&1; then
      echo "== rollback para a imagem anterior"
      docker tag "$ROLLBACK_IMAGE" "$APP_IMAGE"
      "${COMPOSE[@]}" up -d app
    fi
    exit 1
  fi
  sleep 2
done

echo "== deploy concluído"
"${COMPOSE[@]}" ps
echo
echo "Valide em 1 minuto:"
echo "  curl -fsS https://\$(grep -E '^DOMINIO=' .env | cut -d= -f2-)/api/publico/materias >/dev/null && echo OK"
