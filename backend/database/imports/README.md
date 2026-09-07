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
- Confirmed rows get a QR ticket automatically.
- `--source` sets `registrations.source` (default `import`).
- **Never commit a filled-in file** — this folder's `.gitignore` keeps only the
  template and this README.

### Extra recognised columns (all optional)

| Column | Effect |
|---|---|
| `staff_id` / `employee_id` | stored on the participant as `employee_id` |
| `department`, `country`, `organization` | stored on the participant |
| `registered_at` | back-dates the registration (and its confirmed/waitlisted timestamp). Any parseable date, e.g. `26 Jun 2026 01:55:14 PM` |
| `queue` | row order only — ignored as data |

If a row has **no `email`**, a placeholder `<code>-<queue>@<code>.import` is
generated (unique per row), so people with a missing or duplicated `staff_id`
still import cleanly. Choice values are matched loosely — e.g. t-shirt `2XL`
maps to `XXL`; a checkbox (`waiver`) counts as accepted unless the cell says
`no`/`false`/`0`.

Use `--dry-run` first — it reports duplicate keys, unknown option values, and
missing required fields without writing anything.

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
