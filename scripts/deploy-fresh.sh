#!/usr/bin/env bash
# Deploy do zero numa VM Ubuntu 24.04 (executado como root via Run Command da OCI).
#
# Regra de ouro: NUNCA sobrescreve um .env existente. Se o .env já existe, ele é
# preservado e o script só atualiza código e containers. Para regravar de propósito:
#   FORCE_ENV=1 ./scripts/deploy-fresh.sh
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 git curl

systemctl enable --now docker

cd /root
if [ ! -d concurso-am ]; then
  git clone https://github.com/rafaelb1451/concurso-am.git concurso-am
fi
cd concurso-am
git fetch -q origin
git checkout -q main
git pull -q --ff-only

if [ -f .env ] && [ "${FORCE_ENV:-0}" != "1" ]; then
  echo "== .env existente preservado (use FORCE_ENV=1 para regravar)"
else
  DOMINIO="${DOMINIO:?defina DOMINIO}"
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?defina POSTGRES_PASSWORD}"
  ASAAS_API_KEY="${ASAAS_API_KEY:?defina ASAAS_API_KEY (sem ela o checkout fica desabilitado)}"
  ASAAS_BASE_URL="${ASAAS_BASE_URL:-https://api.asaas.com/v3}"
  ASAAS_WEBHOOK_TOKEN="${ASAAS_WEBHOOK_TOKEN:-}"
  SMTP_HOST="${SMTP_HOST:-smtp.suite.uol}"
  SMTP_USERNAME="${SMTP_USERNAME:-}"
  SMTP_PASSWORD="${SMTP_PASSWORD:-}"
  SMTP_FROM="${SMTP_FROM:-}"
  GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
  DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-}"
  SEO_BASE_URL="${SEO_BASE_URL:-https://${DOMINIO}}"

  if [ -n "$SMTP_USERNAME" ] && [ -z "$SMTP_PASSWORD" ]; then
    echo "ERRO: SMTP_USERNAME definido sem SMTP_PASSWORD; o cadastro falharia no envio." >&2
    exit 1
  fi

  if [ -f .env ]; then
    cp .env ".env.bak.$(date +%Y%m%d%H%M%S)"
    echo "== .env anterior guardado em .env.bak.*"
  fi

  cat > .env <<ENV
DOMINIO=${DOMINIO}
POSTGRES_DB=qb
POSTGRES_USER=qb
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DB_POOL_SIZE=12
DDL_AUTO=validate
FLYWAY_ENABLED=true
ASAAS_API_KEY=${ASAAS_API_KEY}
ASAAS_BASE_URL=${ASAAS_BASE_URL}
ASAAS_WEBHOOK_TOKEN=${ASAAS_WEBHOOK_TOKEN}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=587
SMTP_USERNAME=${SMTP_USERNAME}
SMTP_PASSWORD=${SMTP_PASSWORD}
SMTP_FROM=${SMTP_FROM}
SMTP_STARTTLS=true
SMTP_SSL=false
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
CONCURSO_APP_URL=https://${DOMINIO}
SEO_BASE_URL=${SEO_BASE_URL}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
ASAAS_API_KEY=
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=
ENV
  chmod 600 .env
fi

docker compose up -d --build
echo "=== DEPLOY CONCLUIDO ==="
docker compose ps

echo
echo "Valide:"
echo "  curl -fsS https://\$(grep -E '^DOMINIO=' .env | cut -d= -f2-)/api/publico/materias >/dev/null && echo OK"
echo "  docker compose logs --tail=40 app | grep -iE 'smtp|mercado|started'"
