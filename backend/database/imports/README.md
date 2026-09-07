# Bulk registration import

Import a CSV of participants into an event's registration form.

```
docker compose exec events-backend \
  php artisan registrations:import angkor-wat-half-marathon-2026 database/imports/angkor-wat-half-marathon-2026.csv

# check first, write nothing:
docker compose exec events-backend \
  php artisan registrations:import angkor-wat-half-marathon-2026 database/imports/angkor-wat-half-marathon-2026.csv --dry-run
```

- First argument: the event **slug** (or UUID).
- Rows fill **confirmed** seats up to the event capacity; extra rows go on the
  **waitlist in file order**. For Angkor Wat (capacity 79): put your 79 confirmed
  runners first, then the 3 waitlisted ones — they become waitlist #1, #2, #3.
- Duplicate emails are rejected (the event's duplicate rule is `email`).
- Confirmed rows get a QR ticket automatically.
- `registered_at` is set to the import time (the importer can't backdate it).
- `--source` sets `registrations.source` (default `import`).

## Columns for `angkor-wat-half-marathon-2026`

| Column | Required | Allowed values |
|---|---|---|
| `full_name` | yes | free text |
| `email` | yes | unique per event |
| `phone` | yes | free text |
| `emergency_contact_name` | yes | free text |
| `emergency_contact_phone` | yes | free text |
| `race_distance` | yes | `3KM Fun Run` · `5KM` · `10KM` · `21KM Half Marathon` (exact match) |
| `tshirt_size` | yes | `XS` · `S` · `M` · `L` · `XL` · `XXL` · `3XL` |
| `medical_conditions` | no | free text — leave blank if none |
| `waiver` | yes | any of `Yes` / `Y` / `1` / `I accept` — or omit the column entirely (assumed accepted) |

Header row is case-insensitive. Wrap any value containing a comma in double quotes.
