#!/usr/bin/env bash
# Deploy do zero numa VM Ubuntu 24.04 (executado como root via Run Command da OCI).
# Lê a configuração de variáveis de ambiente; o .env é gerado aqui.
set -euo pipefail

DOMINIO="${DOMINIO:?}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:?}"
MP_ACCESS_TOKEN="${MP_ACCESS_TOKEN:?defina MP_ACCESS_TOKEN (sem ele o checkout fica desabilitado)}"
MP_WEBHOOK_SECRET="${MP_WEBHOOK_SECRET:-}"
SMTP_HOST="${SMTP_HOST:-smtp.suite.uol}"
SMTP_USERNAME="${SMTP_USERNAME:-}"
SMTP_PASSWORD="${SMTP_PASSWORD:-}"
SMTP_FROM="${SMTP_FROM:-}"
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"
DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-}"

if [ -n "${SMTP_USERNAME:-}" ] && [ -z "${SMTP_PASSWORD:-}" ]; then
  echo "ERRO: SMTP_USERNAME definido sem SMTP_PASSWORD; o cadastro falharia no envio." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 git curl

systemctl enable --now docker

cd /root
if [ ! -d concurso-am ]; then
  git clone https://github.com/rafaelb1451/concurso-am.git concurso-am
fi
cd concurso-am
git fetch -q origin && git checkout -q main && git pull -q --ff-only || true

# Nunca sobrescreve o .env sem guardar o anterior: foi assim que os segredos
# (MP_ACCESS_TOKEN / SMTP_PASSWORD) sumiram num redeploy.
if [ -f .env ]; then
  cp .env ".env.bak.$(date +%Y%m%d%H%M%S)"
fi

cat > .env <<ENV
DOMINIO=${DOMINIO}
POSTGRES_DB=qb
POSTGRES_USER=qb
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
DB_POOL_SIZE=12
DDL_AUTO=validate
FLYWAY_ENABLED=true
MP_ACCESS_TOKEN=${MP_ACCESS_TOKEN}
MP_WEBHOOK_SECRET=${MP_WEBHOOK_SECRET}
MP_WEBHOOK_TOKEN=
MP_NOTIFICATION_URL=https://${DOMINIO}/api/webhooks/mercadopago
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
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
ASAAS_API_KEY=
ASAAS_BASE_URL=https://api-sandbox.asaas.com/v3
ASAAS_WEBHOOK_TOKEN=
ENV

docker compose up -d --build
echo "=== DEPLOY CONCLUIDO ==="
docker compose ps
