# RHB Events

**Multi-event registration, FIFO waitlist queue, QR ticketing & on-site check-in — for internal RHB staff events.**

One Laravel application. It serves a JSON API **and** a compiled React single-page
app from the same origin. Staff browse a public catalogue, register through a
dynamic form, get a QR ticket, and are checked in on-site with a phone camera.
Admins run the whole lifecycle — create events, build registration forms, manage
a capacity-safe waiting list, and pull analytics.

---

## Highlights

- **Concurrency-safe registration** — capacity is enforced with row-level locks (`SELECT … FOR UPDATE`); no overbooking under load.
- **Automatic FIFO waitlist** — when a confirmed seat frees up (a cancellation, or capacity increased), the next person in the queue is promoted and issued a ticket automatically. Manual "promote" and per-person priority are available too.
- **Dynamic form builder** — per-event registration forms (text, select, radio, checkbox, …), reusable form templates, live on the public wizard.
- **QR tickets & check-in** — cryptographically-tokenised tickets, a mobile QR scanner console with duplicate detection and undo, plus a manual roster.
- **Timezone-correct scheduling** — every event carries its own IANA time zone; dates are entered and displayed in *that* zone, not the viewer's browser zone.
- **Per-event QR code** — one click generates a printable QR that deep-links to the public event page.
- **Location / map link** — paste a Google Maps link instead of a full address for off-site venues.
- **Admin actions** — cancel a registration (auto-promoting the queue), remove someone from the waitlist, approve/reject pending sign-ups.
- **Command-centre dashboards** — global and per-event analytics, CSV / PDF exports.
- **Immutable audit trail** — every state change is logged.
- **Role-based access** — super admin → event admin → organizer → registration officer → check-in staff → viewer, enforced in route middleware and mirrored in the UI.

---

## Tech stack

| Layer | Stack |
|---|---|
| Backend | PHP 8.3+, Laravel 13, Sanctum tokens, MySQL 8 |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| Tickets / QR | `simplesoftwareio/simple-qrcode` (backend), `qrcode` + `html5-qrcode` (frontend) |
| Reports | DOMPDF |
| Delivery | One Laravel app (API + built SPA). Docker Compose, or any PHP 8.3+ / MySQL host. |

The compiled frontend (`backend/public/`) and the PHP dependencies
(`backend/vendor/`) are **committed**, so the app runs from a bare clone with
**no Node.js and no Composer**. See [`stack.md`](stack.md) and [`prd.md`](prd.md)
for the full specification.

---

## Run it

### Option A — Docker (fastest)

```bash
docker compose up -d --build
```

Open **http://localhost:5173**.

| Service | URL | Notes |
|---|---|---|
| `events-backend` | http://localhost:5173 | Laravel API **+ the built React SPA** |
| `events-db` | `localhost:3306` | MySQL 8, persistent volume `events_db_data` |

```bash
docker compose logs -f     # tail logs
docker compose down         # stop
```

> After a **frontend** change: `cd frontend && npm run build` (outputs into
> `backend/public/`), then `docker compose up -d --build`.

### Option B — XAMPP / any plain PHP + MySQL host

Full walkthrough: [`install/INSTALL-XAMPP.md`](install/INSTALL-XAMPP.md).

1. **XAMPP with PHP 8.3+** (the common build ships 8.2 — get the 8.3.x one) and
   Git. Nothing else — no Node, no Composer.
2. Get the code and configure:
   ```bash
   git clone https://github.com/fadolladam/events.git
   cd events/backend
   cp .env.xampp .env        # Windows: copy .env.xampp .env
   ```
   `.env.xampp` is pre-filled for XAMPP's MySQL (`127.0.0.1:3306`, `root`, no
   password) and carries a fixed `APP_KEY` — no `key:generate` step.
3. In **phpMyAdmin** create a database named **`events`**, then load it:
   - **Import** `install/events.sql` (the 3 demo events + registrations), **or**
   - `php artisan migrate --seed` (schema + generic seed data)
4. Run — either:
   - `php artisan serve` → **http://localhost:8000**, or
   - point an Apache **vhost** `DocumentRoot` at `events/backend/public`
     (`mod_rewrite` on).

   (`serve.sh` / `serve.bat` in the repo root do steps 2 + 4.)

Notes: no `php artisan storage:link` needed (images are served by a route). For
no MySQL at all, set `DB_CONNECTION=sqlite`, `touch database/database.sqlite`,
then `php artisan migrate --seed`.

### Option C — Develop locally

```bash
cd backend
composer install                 # dev tools: phpunit, pint, …
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --port=8000    # API + SPA at http://localhost:8000
```

Frontend with hot reload (separate terminal):

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies /api to :8000
npm run build    # when done — rebuilds into backend/public/
```

---

## Logins

Both `install/events.sql` and `php artisan migrate --seed` create the same five
accounts (all `@rhbgroup.com`, password **`password123`**):

| Role | Email |
|---|---|
| Super Admin | `adam.fadhlullah@rhbgroup.com` |
| Event Admin | `manager@rhbgroup.com` |
| Event Organizer | `organizer@rhbgroup.com` |
| Registration Officer | `registration@rhbgroup.com` |
| Check-In Staff | `staff@rhbgroup.com` |

`install/events.sql` also carries the three demo events (Badminton, Blood
Donation, Angkor Wat marathon) with their registrations; `migrate --seed`
generates its own generic demo data instead. Change the passwords before any
non-local deployment.

---

## Project layout

```
events/
├── backend/                         Laravel app — API + the built SPA (public/)
│   ├── app/
│   │   ├── Models/                  Eloquent models (Event, Registration, Ticket, Checkin, …)
│   │   └── Modules/                 Decoupled domain modules
│   │       ├── Auth/                Sanctum auth + RoleMiddleware
│   │       ├── Events/              Event CRUD, status lifecycle, categories, templates
│   │       ├── Forms/               Dynamic form builder & templates
│   │       ├── Registration/        Concurrency-safe registration
│   │       ├── Waitlist/            FIFO queue & promotion engine
│   │       ├── Tickets/             QR ticket generation
│   │       ├── CheckIn/             QR camera check-in, duplicate detection, undo
│   │       ├── Attendance/          Presence & no-show tracking
│   │       ├── Notifications/       Templates & dispatch logs
│   │       ├── Reports/             Analytics, CSV & PDF exports
│   │       └── Audit/               Immutable audit logger
│   ├── database/{migrations,seeders,backups}
│   ├── public/                      Laravel front controller + the built SPA (committed)
│   ├── vendor/                      Composer deps (committed, --no-dev)
│   └── routes/api.php · tests/Feature/
│
├── frontend/                        React / TypeScript / Tailwind SPA (source)
│   └── src/modules/                 auth · public · registration · participant ·
│                                    ticket · admin · forms · queue · checkin ·
│                                    attendance · reports · audit
│
├── install/                         .env.xampp · events.sql · INSTALL-XAMPP.md
├── serve.sh · serve.bat             one-command local start
├── docker-compose.yml
└── prd.md · stack.md                product + tech spec
```

---

## Tests

```bash
cd backend
composer install      # if you cloned the --no-dev vendor
php artisan test
```

Covers concurrency safety, waitlist FIFO promotion, permanent registration
numbering, and QR check-in.

---

## Database backups

`mysqldump` snapshots and dump/restore commands live in
[`backend/database/backups/`](backend/database/backups/) (the `.sql` files are
git-ignored). Quick dump from the Docker stack:

```bash
docker compose exec -T events-db mysqldump -u root -proot_secret \
  --databases events --single-transaction --routines --triggers --events \
  --no-tablespaces --add-drop-database --column-statistics=0 \
  > backend/database/backups/events_backup_$(date +%Y%m%d_%H%M%S).sql
```
