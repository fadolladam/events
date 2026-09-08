# RHB Events

**Multi-event registration, FIFO waitlist queue, QR ticketing & on-site check-in — for internal RHB staff events.**

A modular event-management platform: a Laravel REST API and a React single-page app, both fully containerised. Staff browse a public catalogue, register through a dynamic form, receive a QR ticket, and are checked in on-site with a phone camera. Admins run the whole lifecycle — create events, build registration forms, manage a capacity-safe waiting list, and pull analytics.

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
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, React Router — built into `backend/public/` and served by Laravel |
| Tickets / QR | `simplesoftwareio/simple-qrcode` (backend), `qrcode` + `html5-qrcode` (frontend) |
| Reports | DOMPDF |
| Delivery | One Laravel app (API + built SPA). Docker Compose, or any PHP 8.3+ / MySQL host (XAMPP). |

See [`stack.md`](stack.md) and [`prd.md`](prd.md) for the full specification.

---

## Quick start (Docker)

```bash
docker compose up -d --build
```

Open **http://localhost:8000** (also published on `:5173`). One app container
serves the API and the pre-built SPA together.

| Service | URL | Notes |
|---|---|---|
| `events-backend` | http://localhost:8000 (and `:5173`) | Laravel API **+ the built React SPA** |
| `events-db` | `localhost:3306` | MySQL 8, persistent volume `events_db_data` |

```bash
docker compose logs -f          # tail logs
docker compose down             # stop
```

> The SPA is committed pre-built under `backend/public/` and baked into the
> image. After a **frontend** change, rebuild it and rebuild the container:
> `cd frontend && npm run build` then `docker compose up -d --build`.

---

## Local setup (without Docker)

**Backend + SPA** (one server — the built SPA lives in `backend/public/`)

```bash
cd backend
composer install
cp .env.example .env             # or: cp .env.xampp .env   (MySQL, no key:generate)
php artisan key:generate         # skip if you used .env.xampp
php artisan migrate:fresh --seed
php artisan serve --port=8000    # http://localhost:8000 — API + SPA
```

**Working on the frontend** — Vite dev server with hot reload:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, proxies /api to :8000
npm run build        # when done: rebuilds into backend/public/
```

---

## Run on XAMPP (plain PHP + MySQL)

The app is one Laravel application — it serves the API **and** the pre-built
React SPA (committed under `backend/public/`), so **no Node.js is needed to run
it**. This is the same walkthrough as [`install/INSTALL-XAMPP.md`](install/INSTALL-XAMPP.md).

**1. Prerequisites**

| Tool | Notes |
|---|---|
| **XAMPP with PHP 8.3+** | The common XAMPP ships PHP 8.2 — download the **8.3.x** build. Confirm with `php -v` in XAMPP's *Shell*. |
| **Composer** | Not bundled with XAMPP — <https://getcomposer.org/download/>. |

XAMPP already includes the PHP extensions this app needs (`pdo_mysql`, `gd`,
`zip`, `mbstring`, `openssl`, `curl`, `bcmath`, `fileinfo`). If `php -m` is
missing `gd` or `zip`, enable them in `php.ini` and restart Apache.

**2. Get the code and install**

```bash
git clone https://github.com/fadolladam/events.git
cd events/backend
cp .env.xampp .env        # Windows:  copy .env.xampp .env
composer install
```

`.env.xampp` is pre-filled for XAMPP's MySQL (`127.0.0.1:3306`, user `root`,
empty password) and carries a fixed local `APP_KEY` — **there is no
`php artisan key:generate` step**. Edit `.env` only if your MySQL differs.

**3. Database**

Start **MySQL** in the XAMPP control panel. Open **phpMyAdmin**
(<http://localhost/phpmyadmin>) → **New** → create a database named **`events`**.
Then load the schema and demo data, either way:

- `php artisan migrate --seed`
- or in phpMyAdmin: select the `events` database → **Import** → choose
  `install/events.sql` → **Go**

**4. Run**

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Open **http://localhost:8000**. (`serve.sh` / `serve.bat` in the repo root do
steps 2 + 4 for you.)

Or serve through **XAMPP's Apache**: add a virtual host whose `DocumentRoot` is
the **`events/backend/public`** folder, enable `mod_rewrite`, and restart
Apache. Laravel's `public/.htaccess` handles routing.

**Notes**

- Log in with any seeded account below (password `password123`).
- **No `php artisan storage:link`** needed — uploaded images are served by a
  route in the app.
- **Frontend changes** need a one-off rebuild by someone with Node:
  `cd frontend && npm ci && npm run build` (outputs into `backend/public/`).
- **No MySQL at all:** set `DB_CONNECTION=sqlite` in `.env`,
  `touch database/database.sqlite`, then `php artisan migrate --seed`.

---

## Seeded logins

`php artisan migrate:fresh --seed` creates these accounts (all `@rhbgroup.com`):

| Role | Email | Password |
|---|---|---|
| Super Admin | `adam.fadhlullah@rhbgroup.com` | `password123` |
| Event Admin | `manager@rhbgroup.com` | `password123` |
| Event Organizer | `organizer@rhbgroup.com` | `password123` |
| Registration Officer | `registration@rhbgroup.com` | `password123` |
| Check-In Staff | `staff@rhbgroup.com` | `password123` |

> These are development seed credentials for a fresh `migrate:fresh --seed`. Change them before any non-local deployment.

---

## Project layout

```
events/
├── backend/                         Laravel API & service layer
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
│   ├── database/
│   │   ├── migrations/
│   │   ├── seeders/
│   │   └── backups/                 mysqldump snapshots + restore guide (dumps are git-ignored)
│   ├── routes/api.php
│   └── tests/Feature/               Capacity, waitlist, check-in
│
├── frontend/                        React / TypeScript / Tailwind SPA
│   └── src/
│       ├── modules/
│       │   ├── auth/                Admin login
│       │   ├── public/             Catalogue, category filter, event detail
│       │   ├── registration/       Step-by-step registration wizard
│       │   ├── participant/        Self-service portal (/my-registration/{token})
│       │   ├── ticket/             Public QR ticket pass (/ticket/{token})
│       │   ├── admin/              Global & per-event dashboards, creation wizard
│       │   ├── forms/              Visual form builder modal
│       │   ├── queue/              Live waitlist & FIFO queue console
│       │   ├── checkin/            Mobile QR scanner & manual lookup
│       │   ├── attendance/         Attendance roster
│       │   ├── reports/            Analytics, CSV / PDF triggers
│       │   └── audit/             Audit log viewer
│       ├── components/             Layouts & reusable UI primitives
│       └── services/api.ts         Typed API client & models
│
├── docker-compose.yml
├── prd.md                           Product requirements
└── stack.md                        Technology stack
```

---

## Tests

```bash
cd backend
php artisan test
```

Feature suite covers concurrency safety, waitlist FIFO promotion, permanent registration numbering, and QR check-in.

---

## Database backups

Full `mysqldump` snapshots and the exact dump/restore commands live in
[`backend/database/backups/`](backend/database/backups/). The `.sql` files
themselves are git-ignored — take a fresh one with:

```bash
docker compose exec -T events-db mysqldump -u root -proot_secret \
  --databases events --single-transaction --routines --triggers --events \
  --no-tablespaces --add-drop-database --column-statistics=0 \
  > backend/database/backups/events_backup_$(date +%Y%m%d_%H%M%S).sql
```
