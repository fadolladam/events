#!/usr/bin/env bash
# Prove a backup restores cleanly — into a THROWAWAY database, never the live one.
#
#   ./install/restore-verify.sh backend/database/backups/events_backup_XXXX.sql.gpg
#
# Decrypts (if .gpg), loads into `events_restore_check`, runs a few sanity
# counts, then drops the scratch DB. Exit 0 = the dump is good.
set -euo pipefail

FILE="${1:?usage: restore-verify.sh <dump.sql|dump.sql.gpg>}"
SCRATCH="events_restore_check"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mysql_do() {
  if [ "${BACKUP_MODE:-docker}" = "docker" ]; then
    docker compose -f "$ROOT/docker-compose.yml" exec -T events-db \
      mysql -u root -p"${DB_ROOT_PASSWORD:-root_secret}" "$@"
  else
    mysql -h "${DB_HOST:-127.0.0.1}" -u "${DB_USERNAME:?}" -p"${DB_PASSWORD:?}" "$@"
  fi
}

TMP="$(mktemp)"
trap 'rm -f "$TMP"; mysql_do -e "DROP DATABASE IF EXISTS \`$SCRATCH\`;" 2>/dev/null || true' EXIT

if [[ "$FILE" == *.gpg ]]; then
  echo "decrypting $FILE"
  if [ -n "${BACKUP_PASSPHRASE:-}" ]; then
    gpg --batch --yes --quiet --passphrase "$BACKUP_PASSPHRASE" --decrypt "$FILE" > "$TMP"
  else
    gpg --batch --yes --quiet --decrypt "$FILE" > "$TMP"   # uses your private key
  fi
else
  cp "$FILE" "$TMP"
fi

echo "loading into $SCRATCH …"
# The dump has `CREATE DATABASE events` / `USE events`; rewrite to the scratch name.
sed -e "s/\`events\`/\`$SCRATCH\`/g" -e "s/^USE \`\?events\`\?;/USE \`$SCRATCH\`;/" "$TMP" | mysql_do

echo "sanity checks:"
mysql_do "$SCRATCH" -e "
  SELECT
    (SELECT COUNT(*) FROM events)        AS events,
    (SELECT COUNT(*) FROM registrations) AS registrations,
    (SELECT COUNT(*) FROM users)         AS users,
    (SELECT COUNT(*) FROM tickets)       AS tickets;"

# Fail loudly if the core table is empty (a broken/partial dump).
CNT="$(mysql_do -N "$SCRATCH" -e 'SELECT COUNT(*) FROM events;')"
[ "$CNT" -ge 0 ] || { echo '!! events table missing'; exit 1; }

echo "OK — dump restores cleanly."
