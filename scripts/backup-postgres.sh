#!/usr/bin/env bash
# Backup compactado (formato custom do pg_dump) do banco da aplicação.
#
# Uso: ./scripts/backup-postgres.sh
# Cron sugerido (diário às 03:10): 10 3 * * * /home/ubuntu/concurso-am/scripts/backup-postgres.sh >> /home/ubuntu/backups/backup.log 2>&1
#
# Restaurar num banco vazio:
#   docker compose exec -T db createdb -U qb qb_restore
#   docker compose exec -T db pg_restore -U qb -d qb_restore --no-owner < backups/qb-AAAAmmdd-HHMMSS.dump
set -euo pipefail

cd "$(dirname "$0")/.."

DIR="${BACKUP_DIR:-$HOME/backups/qb}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
USUARIO="${POSTGRES_USER:-qb}"
BANCO="${POSTGRES_DB:-qb}"
STAMP="$(date +%Y%m%d-%H%M%S)"
ARQUIVO="$DIR/qb-$STAMP.dump"

mkdir -p "$DIR"

docker compose exec -T db pg_dump -U "$USUARIO" -d "$BANCO" -Fc > "$ARQUIVO"

TAMANHO="$(du -h "$ARQUIVO" | cut -f1)"
echo "$(date '+%F %T') backup ok: $ARQUIVO ($TAMANHO)"

# retenção: apaga dumps mais antigos que N dias
find "$DIR" -name 'qb-*.dump' -type f -mtime "+$RETENTION_DAYS" -delete
