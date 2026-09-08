# Database backups

Full `mysqldump` snapshots of the `events` MySQL database (the one the
`events-db` container serves). Dump files (`*.sql`, `*.sql.gz`) are
**git-ignored** — this folder is tracked only so the location is stable.

## Make a new backup

```bash
TS=$(date +%Y%m%d_%H%M%S)
docker compose exec -T events-db mysqldump -u root -proot_secret \
  --databases events \
  --single-transaction --routines --triggers --events \
  --no-tablespaces --add-drop-database --column-statistics=0 \
  > backend/database/backups/events_backup_${TS}.sql
```

`--databases events` makes the dump self-contained: it carries
`CREATE DATABASE` / `USE events`, so a restore rebuilds the schema and
data from nothing. `--add-drop-database` means a restore first drops the
existing `events` database — it is a full replace, not a merge.

## Restore a backup

```bash
docker compose exec -T events-db mysql -u root -proot_secret \
  < backend/database/backups/events_backup_YYYYMMDD_HHMMSS.sql
```

(Optionally `docker compose restart events-backend` afterwards.)

## Snapshots

| File | Taken | Contents |
|------|-------|----------|
| `events_backup_20260908_132308.sql` | 2026-09-08 13:23 (+07) | 30 tables · 3 events (Badminton, Blood Donation, Angkor Wat) · 82 registrations · 5 users. All events on `Asia/Phnom_Penh`, organizer "MARCOM & HR". |
