# RHB Events — Comprehensive Project Documentation

_Generated 2026-09-09 · branch `security/admin-rbac-and-branding`_

Multi-event registration platform for internal RHB staff events: a public event
catalogue, a dynamic per-event registration form, a concurrency-safe seat/waitlist
engine, QR tickets, on-site QR check-in, and admin command-centre dashboards with
CSV/PDF exports and an immutable audit trail.

---

## 1. What it is

One **Laravel 13** application that serves a **JSON API** *and* a compiled
**React 19 SPA** from the same origin. There is no separate frontend server in
production — Vite builds into `backend/public/` and a catch-all route hands the
SPA to every non-API path.

Primary user journeys:

| Actor | Journey |
|---|---|
| Staff member (public) | Browse catalogue → open event → fill dynamic form → get registration number + QR ticket (or a queue position) → look up / cancel later |
| Waitlisted staff | Auto-promoted FIFO when a seat frees; ticket issued automatically |
| Registration officer | Approve/reject pending sign-ups, cancel registrations, manage the queue, set per-person priority |
| Check-in staff | Scan QR at the door (duplicate detection + undo), or manual roster search |
| Event organizer / admin | Create events, build forms, configure capacity/approval/duplicate rules, pull analytics & exports |
| Super admin / event admin | User management, audit log, event deletion |

---

## 2. Tech stack

| Layer | Stack |
|---|---|
| Backend | PHP 8.3+, Laravel 13.17+, Sanctum (SPA session cookie + bearer tokens), MySQL 8 (SQLite supported) |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7 |
| QR | `simplesoftwareio/simple-qrcode` (backend) · `qrcode` + `html5-qrcode` (frontend) |
| PDF | `barryvdh/laravel-dompdf` |
| Auth | Laravel Sanctum — SPA uses the session cookie + CSRF; other API clients use `Authorization: Bearer`. See `SECURITY.md` |
| Dev tooling | Pint, PHPUnit 12, Pail; oxlint (frontend) |
| Delivery | Single Laravel app. Docker Compose, XAMPP, or any PHP 8.3+/MySQL host |

`backend/public/` (built SPA) **and** `backend/vendor/` (Composer deps, `--no-dev`)
are **committed**, so the app runs from a bare clone with **no Node and no
Composer**.

> Note: root `stack.md` (Blade / Apache / Laravel Excel) is a stale early sketch
> and does **not** describe the built system — it is a bearer-token REST API + SPA.

---

## 3. Architecture

```
Browser
  │
  ├─ GET /                 ─┐
  ├─ GET /events/:slug      │  catch-all web route → backend/public/index.html (React SPA)
  ├─ GET /admin/*          ─┘
  │
  ├─ /api/*                → routes/api.php  (JSON, Sanctum auth, RoleMiddleware)
  │
  └─ /storage/*            → route-served uploaded images (no symlink needed)
```

- **No source volume mounts** in Docker — a frontend or backend change needs an
  image rebuild (`npm run build` then `docker compose up -d --build`).
- Backend is organised into **decoupled domain modules** under
  `app/Modules/<Domain>/` — each a `Controller` + `Service` (+ middleware where
  relevant). Eloquent models stay in `app/Models/`.
- Frontend is organised into **feature modules** under `src/modules/<feature>/`.

### Repository layout

```
events/
├── backend/                         Laravel app — API + the built SPA
│   ├── app/
│   │   ├── Models/                  20 Eloquent models
│   │   └── Modules/
│   │       ├── Auth/               AuthController, AuthService, RoleMiddleware
│   │       ├── Events/             Event CRUD + lifecycle, categories, templates
│   │       ├── Forms/              Dynamic form builder + reusable form templates
│   │       ├── Registration/       Concurrency-safe registration + duplicate rules
│   │       ├── Waitlist/           FIFO queue + auto-promotion engine
│   │       ├── Tickets/            QR ticket issuance
│   │       ├── CheckIn/            QR scan, duplicate detection, undo, manual search
│   │       ├── Attendance/         Presence / no-show tracking
│   │       ├── Dashboard/          Global + per-event command-centre aggregates
│   │       ├── Reports/            Stats + CSV / PDF exports
│   │       ├── Notifications/      Templates + dispatch logs  (⚠ not wired — see §11)
│   │       ├── Media/              Device image upload
│   │       └── Audit/              Immutable audit logger
│   ├── database/{migrations,seeders,backups}
│   ├── public/                      Front controller + committed built SPA
│   ├── vendor/                      Committed Composer deps (--no-dev)
│   └── routes/api.php · tests/Feature/
│
├── frontend/                        React / TS / Tailwind SPA (source)
│   └── src/
│       ├── App.tsx                  route table
│       ├── routes/                  paths.ts (URL SSOT), guards.tsx, publicRoutes.tsx
│       ├── services/                api.ts (axios client + types + ROLE_TIERS), auth.tsx
│       ├── components/              AdminLayout, BrandMark, ImageUploadField, TimezoneSelect, …
│       └── modules/                 auth · public · registration · participant · ticket ·
│                                    admin (+ dashboard/) · forms · queue · checkin ·
│                                    attendance · reports · audit
│
├── install/                         .env.xampp · events.sql · INSTALL-XAMPP.md
├── docker-compose.yml · serve.sh · serve.bat
├── prd.md · stack.md · TODO-MASTER.md · DEPLOYMENT.md · TESTING.md
│                                    SECURITY.md · RBAC-MATRIX.md
└── docs/archive/                    superseded point-in-time reports (audit, QA, gap)
```

Approx size: backend `app/` ≈ 5.0k LOC PHP · frontend `src/` ≈ 9.5k LOC TS/TSX.

---

## 4. Data model

UUID primary keys on `events`, `participants`, `registrations`, `tickets`,
`checkins` (and their children). Auto-increment elsewhere.

### Core tables

| Table | Purpose | Key columns |
|---|---|---|
| `users` | Staff accounts | `role`, `organization_id`, `phone`, `status` |
| `organizations` | Tenant / brand | `name`, `slug`, `timezone`, `settings` (json) |
| `event_categories` | Catalogue taxonomy | `name`, `slug`, `color`, `icon`, `is_active` |
| `events` | The event | see below |
| `event_staff` | Per-event role grants | `event_id`, `user_id`, `role` (owner/manager/organizer/registration_officer/checkin_staff/viewer) |
| `event_templates` | Reusable event blueprints | `structure` (json) |
| `registration_forms` | One dynamic form per event | `event_id` (unique), `is_active` |
| `form_fields` | Form field definitions | `field_key`, `type`, `is_required`, `is_hidden`, `field_order`, `options` (json), `validation_rules` (json), `conditional_logic` (json) |
| `form_templates` | Reusable registration-form presets (6 seeded built-ins) | added 2026-09-07 |
| `participants` | Person identity (deduped by email) | `email`, `phone`, `employee_id`, `department`, `organization`, `metadata` (json) |
| `registrations` | Event participation | see below |
| `registration_answers` | Dynamic form answers | `field_key`, `field_label`, `value_text`, `value_json` |
| `registration_status_history` | Every status transition | `from_status`, `to_status`, `changed_by_user_id`, `reason` |
| `waitlist_history` | Queue events | `action` (joined_queue / promoted / position_shifted / priority_updated / cancelled), `previous_position`, `new_position` |
| `tickets` | QR ticket | `ticket_code`, `secure_token`, `qr_payload` (URL/token only — no PII), `status` (active/used/revoked) |
| `checkins` | Check-in events | `checkin_type` (qr_scan / manual_search), `gate`, `checked_in_by_user_id`, `checked_in_at` |
| `attendance` | Presence roster | `status` (not_checked_in / checked_in / attended / no_show) |
| `notification_templates` | Per-event or global (`event_id` null) message templates | `trigger_event`, `subject`, `body_template` |
| `notification_logs` | Dispatch log | `recipient_email`, `trigger_event`, `status` (sent/queued/failed), `error_message` |
| `audit_logs` | Immutable | `action`, `entity_type`, `entity_id`, `event_id`, `previous_value` (json), `new_value` (json), `ip_address` |

Hot-path indexes added in `2026_09_07_000001_add_dashboard_indexes.php` and
`2026_09_09_000002_add_query_hotpath_indexes.php`. The unused `system_settings`
KV table was dropped in `2026_09_09_000003_drop_unused_system_settings_table.php`
— organisation-level configuration lives on the `organizations` row.

### `events` — notable columns

- **Type / visibility / status**: `event_type` (physical/virtual/hybrid),
  `visibility` (public/private/invitation_only/internal_only/hidden_link),
  `status` (draft → upcoming → registration_open → full → registration_closed →
  ongoing → completed → cancelled → archived). Status is largely **derived** at
  read time via `Event::calculateDynamicStatus()` from dates + capacity.
- **Scheduling**: `start_at`, `end_at`, `timezone` (IANA — dates are entered and
  displayed in the *event's* zone, not the browser's),
  `registration_open_at` / `registration_close_at`.
- **Capacity / queue**: `capacity`, `waitlist_enabled`, `waitlist_capacity`
  (null = unlimited), `approval_mode` (automatic/manual), `allow_cancellation`,
  `cancellation_deadline`, `duplicate_rule` (email/phone/employee_id/none).
- **Location**: `venue_name`, address fields, `latitude`/`longitude`, `map_url`
  (paste a Google Maps link instead of a full address), `meeting_url`.
- **Branding / terms**: `primary_color`, `secondary_color`,
  `terms_and_conditions`, `cover_image_url`, `banner_image_url`, `attachments`
  (json array of `{label, url}`).

### `registrations` — notable columns

- `registration_number` (unique, human-facing: `EVT-{event_code}-{YYYY}-{000001}`),
  `registration_sequence` (per-event, gap-free, allocated under lock).
- `status`: pending / confirmed / waitlisted / approved / rejected / cancelled.
- `attendance_status`: not_checked_in / checked_in / attended / no_show.
- `waitlist_priority` (higher = promoted sooner), `queue_position_cache`.
- `secure_access_token` (48-char random — the unauthenticated lookup/cancel key).
- Lifecycle timestamps: `registered_at`, `confirmed_at`, `waitlisted_at`,
  `promoted_at`, `approved_at`, `rejected_at`, `cancelled_at`, `checked_in_at`.

---

## 5. Domain logic

### Concurrency-safe registration (`RegistrationService::register`)

Runs entirely inside `DB::transaction` with row-level locks:

1. `Event … lockForUpdate()` — serialise all registrations for the event.
2. Reject if dynamic status is draft / registration_closed / completed /
   cancelled / archived.
3. **Server-side form validation** — required + option-membership checked against
   the live `form_fields` schema (the frontend `required` attributes are not
   trusted).
4. **Duplicate detection** per `duplicate_rule` (email / phone / employee_id),
   ignoring cancelled + rejected rows.
5. Find-or-create `participant` by email (updates name/phone/employee_id/dept).
6. **Sequence allocation** — `MAX(registration_sequence) … lockForUpdate() + 1`.
7. **Capacity decision** under lock — `COUNT(status='confirmed') … lockForUpdate()`:
   - `approval_mode = manual` → `pending`.
   - confirmed < capacity → `confirmed`, issue ticket.
   - else if `waitlist_enabled` and waitlist not full → `waitlisted`.
   - else → `ValidationException` ("fully booked").
8. Persist registration + dynamic answers + initial
   `registration_status_history` (+ `waitlist_history` `joined_queue`).
9. Issue QR ticket if confirmed. Write `audit_logs` `registration_created`.

Covered by `tests/Feature/CapacityConcurrencyTest.php` (no overbooking under
parallel load) — but see §12, the suite currently can't run against the committed
`--no-dev` vendor.

### FIFO waitlist promotion (`WaitlistService::promoteWaitlistedParticipants`)

Triggered automatically when a **confirmed** registration is cancelled, and
available on demand (`POST /events/{id}/waitlist/promote`). Also fires implicitly
on capacity increase.

- Locks the event row, recomputes `availableSeats = capacity − confirmedCount`.
- Selects waitlisted rows ordered by `waitlist_priority DESC, waitlisted_at ASC,
  registration_sequence ASC`, `LIMIT availableSeats`, `lockForUpdate()`.
- Each promoted row → `status=confirmed`, `promoted_at`, status history +
  `waitlist_history` `promoted`, **QR ticket issued**, `audit_logs`
  `participant_promoted`.
- `registration_number` **never changes** through promotion.

`WaitlistService::updatePriority` sets per-person priority with history + audit.

### Cancellation (`RegistrationService::cancelRegistration`)

Locks the row, sets `cancelled`, writes history; if the old status was
`confirmed`, immediately calls the promotion engine. Available to the participant
(`POST /public/registration/{token}/cancel`) and to staff
(`POST /registrations/{id}/cancel`).

### Tickets & check-in

- `TicketService::issueTicket` — `ticket_code`, `secure_token`, `qr_payload`
  (a URL / opaque token, **no PII**), status `active`.
- Public ticket page + QR image: `GET /public/ticket/{token}` and `…/qr`.
- Check-in (`CheckInService`): `scan` validates a token, `process` records a
  `checkins` row + flips `attendance_status`, **duplicate detection** on repeat
  scans, `undo` reverses the last check-in (`checkin_reversed` audit),
  `search` + `recent` back the manual roster.

### Audit trail (`AuditService::log`)

Static helper writing an immutable `audit_logs` row (user, action, entity,
event, before/after JSON, IP). Called from every state-changing service.
Exposed read-only at `GET /audit-logs` (governance tier).

### Dashboards (`DashboardService`)

`GET /dashboard/overview` returns one grouped payload: KPI grid, status
breakdown, action-required list, active events, capacity utilisation, waitlist
overview, pending approvals, today's operations, attendance performance,
registration trend, recent registrations/activity, notification health, event
readiness. Rendered by ~18 SVG widgets under `src/modules/admin/dashboard/`.

---

## 6. API surface (`backend/routes/api.php`)

Base path `/api`. Auth = Sanctum session cookie (first-party SPA) **or**
`Authorization: Bearer <token>` (other clients); both via `auth:sanctum`.
`RoleMiddleware` (`role:` alias) lets **`super_admin`** through unconditionally;
`EventScopeMiddleware` (`event.scope`) confines non-org-wide roles to their
assigned events.

### Public (no auth)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | throttle 10/min |
| POST | `/auth/register` | throttle 5/min — **locked to `participant` role** |
| GET | `/public/events` | published catalogue |
| GET | `/public/events/{slug}` | public event detail |
| GET | `/public/categories` | |
| POST | `/public/events/{eventId}/register` | throttle 15/min |
| POST | `/public/registration/lookup` | throttle 10/min |
| GET | `/public/registration/{token}` | by `secure_access_token` |
| POST | `/public/registration/{token}/cancel` | throttle 10/min |
| GET | `/public/ticket/{token}` · `/public/ticket/{token}/qr` | ticket + QR image |

### Authenticated — any account (incl. participant)

`GET /auth/me` · `POST /auth/logout`

### Role tiers (applied as nested middleware groups)

| Constant | Roles (besides `super_admin`) |
|---|---|
| `ROLE_STAFF` | event_admin, event_organizer, registration_officer, checkin_staff, viewer |
| `ROLE_EVENT_MANAGER` | event_admin, event_organizer |
| `ROLE_REGISTRATION` | event_admin, event_organizer, registration_officer |
| `ROLE_CHECKIN` | event_admin, event_organizer, registration_officer, checkin_staff |
| `ROLE_ADMIN` | event_admin |

**`ROLE_STAFF` (read-only console)** — `GET /dashboard/stats`,
`GET /dashboard/overview`, `GET /events/{id}/analytics`, `GET /events`,
`GET /events/{id}`, `GET /categories`, `GET /templates`,
`GET /events/{id}/form`, `GET /forms/templates`, `GET /forms/templates/{id}`.

**`ROLE_EVENT_MANAGER` (authoring)** — `POST/PUT /events`,
`POST /events/{id}/duplicate`, `PATCH /events/{id}/status`, `POST /categories`,
`POST /templates`, `POST /media/upload` (throttle 30/min),
`PUT /events/{id}/form`, form-template `POST/PUT/DELETE`,
`GET /events/{id}/export/{csv,pdf}`, notification templates + logs
`GET/POST`.

**`ROLE_REGISTRATION` (queue decisions)** —
`GET /events/{id}/registrations`, `GET /registrations/{id}`,
`POST /registrations/{id}/{approve,reject,cancel}`,
`GET /events/{id}/waitlist`, `GET /events/{id}/waitlist/history`,
`POST /events/{id}/waitlist/promote`, `PATCH /waitlist/{id}/priority`.

**`ROLE_CHECKIN` (on-site)** — `POST /events/{id}/checkin/scan`,
`POST /events/{id}/checkin`, `POST /events/{id}/checkin/undo`,
`GET /events/{id}/checkin/search`, `GET /events/{id}/checkin/recent`,
`GET /events/{id}/attendance`, `POST /events/{id}/attendance/mark`.

**`ROLE_ADMIN` (governance)** — `DELETE /events/{id}`, `GET /audit-logs`,
`GET /users`, `POST /users` (an event_admin **cannot** mint a `super_admin`).

~57 API routes total.

---

## 7. Roles & access control

Seven roles: `super_admin` → `event_admin` → `event_organizer` →
`registration_officer` → `checkin_staff` → `viewer` → `participant`
(participant is public-registration only).

- **Backend** — enforced in route middleware tiers (above) via
  `App\Modules\Auth\RoleMiddleware`.
- **Frontend** — mirrored in `src/services/api.ts` as `ROLE_TIERS`
  (`staff`, `eventManager`, `registration`, `checkin`, `governance`) with a
  `hasRole(role, allowed)` helper; `RequireAuth` / `RequireRole` route guards
  and nav/action gating in the UI. The mirror is intentionally kept in sync
  with `routes/api.php`.
- Auth is the **Sanctum session cookie** (HttpOnly) — no token in
  `localStorage`; only the non-secret user profile is cached there
  (`rhb_events_user`) and re-validated via `GET /auth/me` on boot. A 401
  interceptor clears the cache and bounces to `/login?next=…`.
- Per-event role grants in `event_staff` are enforced by `EventScopeMiddleware`
  (non-org-wide roles only reach their assigned events).

---

## 8. Frontend

- **Routing** (`src/App.tsx`): public routes (`/`, `/events/:slug`,
  `/events/:slug/register`, `/lookup`, `/ticket/:token`, `/login`) +
  auth-gated `/admin/*` inside `<AdminLayout>` with tabbed event console
  (`/admin/events/:slug/:tab` where tab ∈ overview, registrations, queue,
  checkin, attendance, reports). `/admin/audit` is governance-only.
- **URL single source of truth**: `src/routes/paths.ts` — import helpers, never
  hand-write path strings.
- **API layer**: `src/services/api.ts` — a single axios instance (`baseURL
  /api`, `withCredentials`), `ensureCsrf()` / `apiLogin()` / `apiLogout()` /
  `fetchMe()` helpers, a 401 interceptor; all TypeScript types live here too.
- **Auth context**: `src/services/auth.tsx` (`useAuth`, `setSession`,
  `loading`) — primes the CSRF cookie and calls `/auth/me` on boot.
- **Feature modules** under `src/modules/`: `auth`, `public` (catalogue +
  detail), `registration` (multi-step wizard rendering the dynamic form),
  `participant` (my-registration), `ticket`, `admin` (events management, event
  console tabs, wizard/settings/QR modals, global dashboard + `dashboard/`
  widgets), `forms` (form builder modal + form-templates manager), `queue`
  (waitlist), `checkin` (QR scanner console), `attendance` (roster), `reports`,
  `audit`.
- Timezone helpers in `src/utils/tz.ts`; event media resolution in
  `src/lib/eventMedia.ts`.
- Build: `npm run build` → `prebuild` wipes `../backend/public/assets`, then
  `tsc -b && vite build` emits into `backend/public/`.

---

## 9. Running the project

### A — Docker (fastest)

```bash
docker compose up -d --build      # → http://localhost:5173
docker compose logs -f
docker compose down
```

`events-backend` (Laravel API + built SPA) on `:5173` → container `:8000`;
`events-db` MySQL 8 on `:3306`, volume `events_db_data`; uploaded images persist
in `events_backend_uploads`. **After a frontend change**: `cd frontend &&
npm run build`, then `docker compose up -d --build` (no source mounts).

### B — XAMPP / any plain PHP 8.3+ + MySQL

Full walkthrough: `install/INSTALL-XAMPP.md`. No Node, no Composer (vendor is
committed).

```bash
git clone https://github.com/fadolladam/events.git
cd events/backend
cp .env.xampp .env          # pre-filled for 127.0.0.1:3306 root / no pass, fixed APP_KEY
```

Create a DB named **`events`** in phpMyAdmin, then either **import**
`install/events.sql` (3 demo events + registrations) or run
`php artisan migrate --seed` (schema + generic seed data). Serve with
`php artisan serve` (→ `:8000`) or an Apache vhost `DocumentRoot` →
`events/backend/public` with `mod_rewrite`. `serve.sh` / `serve.bat` do the env
copy + serve. No `storage:link` needed (images are route-served). SQLite works:
`DB_CONNECTION=sqlite`, `touch database/database.sqlite`, `migrate --seed`.

### C — Local dev with hot reload

```bash
cd backend
composer install                  # restores dev tools (phpunit, pint, …)
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve --port=8000

cd ../frontend
npm install
npm run dev                       # http://localhost:5173, proxies /api → :8000
npm run build                     # when done — rebuilds into backend/public/
```

---

## 10. Seed data & logins

Both `install/events.sql` and `php artisan migrate --seed` create the same five
accounts — password **`password123`** (change before any non-local deploy):

| Role | Email |
|---|---|
| Super Admin | `adam.fadhlullah@rhbgroup.com` |
| Event Admin | `manager@rhbgroup.com` |
| Event Organizer | `organizer@rhbgroup.com` |
| Registration Officer | `registration@rhbgroup.com` |
| Check-In Staff | `staff@rhbgroup.com` |

`install/events.sql` also carries three demo events (Badminton, Blood Donation,
Angkor Wat marathon) with registrations; `migrate --seed` instead generates its
own generic demo data (Blood Donation Drive, Corporate Townhall, Client Dinner,
…) plus 6 built-in `form_templates`.

---

## 11. Tests

```bash
cd backend
composer install     # needed — the committed vendor is --no-dev, no phpunit
php artisan test
```

`tests/Feature/`:

| File | Covers |
|---|---|
| `CapacityConcurrencyTest.php` | No overbooking under parallel registration; sequence gap-free |
| `WaitlistPromotionTest.php` | FIFO promotion on cancel, ticket auto-issue, reg# unchanged, history rows |
| `CheckInTest.php` | QR check-in, duplicate detection, undo |
| `ExampleTest.php` (Unit + Feature) | Laravel skeleton stubs |

---

## 12. Status & known gaps

From the 2026-09-04 QA pass (`docs/archive/qa-report.md`, `docs/archive/audit.md`
111-section checklist) — **"PASS WITH MAJOR GAPS"**. The core engine (event →
form → registration → capacity → waitlist → promotion → QR → check-in →
attendance → report) passed every functional test. Most of the gaps below have
since been closed — see `TODO-MASTER.md` for the current state. Original list:

| ID | Severity | Gap |
|---|---|---|
| **NOTIF-1** | P1 | **Email notifications do not fire.** `NotificationService` exists but is **instantiated nowhere**; `notification_templates` / `notification_logs` are managed via API but never dispatched. No `Mail::` send anywhere. |
| **TEST-1** | P1 | Suite can't run against the committed `--no-dev` vendor — needs `composer install` first. |
| **MANREG-1** | P1 | No admin **manual registration** — `POST /events/{id}/registrations` is not implemented (405). Public wizard is the only intake path. |
| §31 | Accepted | Capacity **decrease** below confirmed count does not drop confirmed registrations (over-capacity tolerated by design). |
| — | P2 | Assorted analytics/export polish; global search, new dashboard pages, and the wider 57-section dashboard spec are deferred (iteration 1 shipped 2026-09-07). |

Not production-ready until NOTIF-1 + MANREG-1 land and the suite runs green in CI.

---

## 13. Branch & history context

- Working branch: **`security/admin-rbac-and-branding`** (ahead of `origin/main`,
  clean tree). Repo: `github.com/fadolladam/events`.
- Recent themes: RBAC hardening (role middleware tiers, locked public register to
  participant, throttling, CORS + token expiry); **EventNex → RHB "Events"
  rebrand** (every `eventnex` occurrence removed repo-wide 2026-09-07, incl. the
  migration renamed `create_eventnex_tables` → `create_events_tables`);
  collapse to a **single Laravel app** serving the built SPA (dropped the
  `events-frontend` container, symlink-free `/storage` route, XAMPP install kit);
  committed `vendor/` so the app runs with no Composer; Docker publishes one port
  (`5173`).
- Reference docs in repo root: `prd.md` (full product spec, ~58 KB), `stack.md`
  (technology stack), `TODO-MASTER.md` (consolidated backlog + progress log),
  `DEPLOYMENT.md`, `TESTING.md`, `SECURITY.md`, `RBAC-MATRIX.md`. Superseded
  point-in-time reports (`audit.md`, `qa-report.md`, `GAP-REPORT*.md`,
  `debug.md`) live in `docs/archive/`.
