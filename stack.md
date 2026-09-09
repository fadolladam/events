# Technology stack

> Reflects the codebase as of the Tier 4 completion (2026-09-09). The original
> pre-build sketch (Blade / Apache / Laravel Excel / Laravel Mail) is no longer
> accurate — see the notes at the bottom.

## Frontend

- **React 19** + **TypeScript** (single-page app, no Blade)
- **Vite 8** build → output committed to `backend/public/` and served by the
  Laravel catch-all route
- **Tailwind CSS 4** (`@tailwindcss/vite`)
- **React Router 7** (`react-router-dom`)
- **axios** API client — session-cookie auth (`withCredentials` + `withXSRFToken`),
  no bearer token in the browser
- **lucide-react** icons, **clsx** / **tailwind-merge** class helpers
- **html5-qrcode** (camera scan console) + **qrcode** (render), **canvas-confetti**
- Lint: **oxlint**

## Backend

- **PHP 8.3+**, **Laravel 13**
- **Laravel Sanctum 4** — stateful SPA session cookies + bearer tokens for
  non-browser clients
- **Eloquent ORM**
- Two-layer authorization: `RoleMiddleware` (`role:` alias) + `EventScopeMiddleware`
  (`event.scope` alias)
- **barryvdh/laravel-dompdf** — PDF report export
- **simplesoftwareio/simple-qrcode** — ticket QR generation
- CSV export: native PHP (`fputcsv` streamed) — *not* Laravel Excel
- Split log channels: `security` / `audit` / `performance` (see `config/logging.php`)
- **Laravel Tinker**, **Laravel Pail** (log tail)

## Database

- **MySQL 8** (production / Docker) · **SQLite** in-memory for the test suite
- Session + cache + queue drivers: `database`

## Authentication & email

- Laravel auth guards via Sanctum (see Backend)
- **Email / notifications: not implemented (out of scope).** `NotificationService`
  and the `notification_templates` / `notification_logs` tables exist but are
  dormant — no `Mail`, no scheduler, no queued jobs.

## Tooling & quality

- **Pint** — code style (CI-enforced, `pint --test`)
- **PHPUnit 12** + **Mockery** + **fakerphp/faker** — 152 feature tests
- **nunomaduro/collision** — CLI error rendering
- **GitHub Actions** (`.github/workflows/ci.yml`) — backend tests + Pint,
  frontend lint + build + SPA-publish check

## Runtime / deployment

- **Single Laravel app** serves the API and the built SPA (no separate frontend
  service). `/storage` is a route, not a symlink.
- **Docker Compose** (`docker-compose.yml` + `.env.docker.example`) — app + MySQL,
  MySQL bound to loopback, `APP_KEY` required
- **XAMPP** (`install/` kit) for local single-machine installs
- Also runs on any PHP 8.3+ / MySQL 8 host (VPS, cPanel) with `backend/public` as
  the only web-accessible directory — see `DEPLOYMENT.md`

## What changed from the original sketch

| Original | Now |
|---|---|
| Laravel Blade + HTML views | React 19 SPA (Vite build into `backend/public`) |
| Apache only | Nginx or Apache; Docker; XAMPP for local |
| Laravel Excel | Native streamed CSV + DOMPDF for PDF |
| Laravel Mail | Notifications out of scope — no mail layer |
| Laravel QR package (unspecified) | `simplesoftwareio/simple-qrcode` (backend) + `html5-qrcode` (scanner) |
