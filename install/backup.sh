#!/usr/bin/env bash
# Encrypted daily database backup with retention. Cron-friendly.
#
#   0 2 * * *  /srv/rhb-events/install/backup.sh >> /var/log/rhb-events-backup.log 2>&1
#
# Env (override as needed):
#   BACKUP_DIR      where dumps land            (default: ./backend/database/backups)
#   RETENTION_DAYS  delete encrypted dumps older than this (default: 14)
#   GPG_RECIPIENT   gpg key id/email for asymmetric encryption
#   BACKUP_PASSPHRASE   fallback symmetric passphrase if no GPG_RECIPIENT
#   DB_* / compose   how to reach MySQL — see the two modes below
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backend/database/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TS="$(date +%Y%m%d_%H%M%S)"
RAW="$BACKUP_DIR/events_backup_${TS}.sql"
ENC="$RAW.gpg"

mkdir -p "$BACKUP_DIR"

dump() {
  # Mode 1: Docker Compose stack (default).
  if [ "${BACKUP_MODE:-docker}" = "docker" ]; then
    docker compose -f "$ROOT/docker-compose.yml" exec -T events-db \
      mysqldump -u root -p"${DB_ROOT_PASSWORD:-root_secret}" \
      --databases "${DB_DATABASE:-events}" \
      --single-transaction --routines --triggers --events \
      --no-tablespaces --add-drop-database --column-statistics=0
  else
    # Mode 2: direct MySQL (bare metal). Needs DB_HOST/DB_USERNAME/DB_PASSWORD.
    mysqldump -h "${DB_HOST:-127.0.0.1}" -u "${DB_USERNAME:?}" -p"${DB_PASSWORD:?}" \
      --databases "${DB_DATABASE:-events}" \
      --single-transaction --routines --triggers --events --no-tablespaces --add-drop-database
  fi
}

echo "[$(date -Iseconds)] dumping -> $RAW"
dump > "$RAW"

echo "[$(date -Iseconds)] encrypting -> $ENC"
if [ -n "${GPG_RECIPIENT:-}" ]; then
  gpg --batch --yes --encrypt --recipient "$GPG_RECIPIENT" --output "$ENC" "$RAW"
elif [ -n "${BACKUP_PASSPHRASE:-}" ]; then
  gpg --batch --yes --symmetric --cipher-algo AES256 \
      --passphrase "$BACKUP_PASSPHRASE" --output "$ENC" "$RAW"
else
  echo "!! No GPG_RECIPIENT or BACKUP_PASSPHRASE set — refusing to keep a plaintext backup." >&2
  rm -f "$RAW"
  exit 1
fi
rm -f "$RAW"   # never keep the plaintext

echo "[$(date -Iseconds)] pruning encrypted dumps older than ${RETENTION_DAYS}d"
find "$BACKUP_DIR" -name 'events_backup_*.sql.gpg' -type f -mtime "+${RETENTION_DAYS}" -print -delete

echo "[$(date -Iseconds)] done: $(basename "$ENC") ($(du -h "$ENC" | cut -f1))"
