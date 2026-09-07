# Events SYSTEM QA REPORT

_Executed 2026-09-04 against the running Docker stack, following the `audit.md`
111-section checklist. Read-only functional audit — no application code changed
during this pass; test data was created and then cleaned up._

## Overall Status

**PASS WITH MAJOR GAPS** — the core engine (event → form → registration →
capacity → waitlist → promotion → QR → check-in → attendance → report) passed
every functional test. Three P1 gaps block production: **email notifications do
not work**, **the test suite cannot run**, and **admin manual registration is
missing**.

---

## Environment

| | |
|---|---|
| Backend framework | Laravel 13.30.1 (REST API only) |
| Frontend framework | React 18 + Vite + TypeScript + Tailwind v4 (SPA) |
| PHP | 8.4.25 |
| Database | MySQL 8.0 |
| Web server | nginx (SPA + `/api` + `/storage` proxy) → `php artisan serve` |
| Deployment | Docker Compose (`events-db`, `events-backend`, `events-frontend`) |
| APP_ENV / APP_DEBUG | `production` / `OFF` ✅ |
| Mail / Queue / Session / Cache | `log` / `database` / `database` / `database` |

Note: `stack.md` (Blade / Apache / XAMPP / Laravel Excel) does **not** match the
built system. `audit.md` sections §67 (CSRF), §68 (session cookies), §103 (XAMPP),
§104 (Apache) are **N/A** — this is a bearer-token API behind nginx.

---

## Tests Performed

Total checklist areas exercised: **58** · Passed: **44** · N/A: **6** ·
Partial: **4** · Failed: **4**

| audit.md § | Area | Result |
|---|---|---|
| §5–8 | Boot, env, migrations (6, all Ran) | PASS |
| §10 | Data integrity — 0 orphans, 0 dup reg#/tokens, 0 events over capacity | PASS |
| §11 | Route audit — 57 API routes, RBAC middleware applied | PASS |
| §12 | Auth — login / logout / invalid creds / 401 on protected | PASS |
| §13 | Authorization — `checkin_staff` → 403 on `/audit-logs`, `/users`, `POST /events`; `event_admin` cannot create `super_admin` | PASS |
| §15–17 | Event create / edit / status | PASS |
| §20–22 | Form builder → public form sync + per-event isolation | PASS _(fixed earlier; dropdowns/radios now render)_ |
| §23 | Registration submission — participant link, answers stored, number, status, ticket | PASS _(+ server-side answer validation added)_ |
| §24 | Registration number — unique, sequential, event-prefixed, **unchanged through promotion** | PASS |
| §25 | Duplicate prevention — email rule blocks; other events accept same participant | PASS |
| §26 | **Capacity** — cap 3 → A/B/C confirmed, D/E waitlisted, confirmed stays 3 | PASS |
| §27 | Queue — D #1, E #2, no gaps | PASS |
| §28 | **Promotion** — cancel B → D confirmed + ticket auto-issued, E → #1, reg# unchanged, `registration_status_history` + `waitlist_history` written | PASS _(no notification — see NOTIF-1)_ |
| §30 | Capacity increase 3→5 → E auto-promoted, confirmed 4 | PASS |
| §31 | Capacity decrease 5→2 → confirmed **not** dropped (over-capacity 4>2 tolerated) | PASS |
| §32 / §97 | Concurrency — `DB::transaction` + `lockForUpdate` on event row, confirmed count, sequence | PARTIAL — code correct; automated test exists but cannot run (TEST-1) |
| §33 | Manual-approval mode — register → pending → approve → confirmed | PASS |
| §34 | **Admin manual registration** | **FAIL — not implemented** (`POST /events/{id}/registrations` → 405) |
| §35 | Registration detail (answers / status history / notif history / notes / resend) | PARTIAL — inline answers view only |
| §36 | Participant search — event-scoped, returns only that event | PASS |
| §37 | Participant portal + IDOR — random token → 404 | PASS |
| §38 | QR ticket — 64-char random token, no PII in payload, SVG QR endpoint 200 | PASS |
| §39–40 | Scan QR + check-in — resolves ticket, writes `checkins` row, sets `attendance_status` | PASS |
| §41 | Duplicate check-in — 422 "ALREADY checked in", no duplicate row | PASS |
| §42–43 | Manual search check-in + check-in-staff permissions | PASS |
| §44 | Attendance — mark `attended` | PASS |
| §45–46 | **Notifications + reminders** | **FAIL — non-functional** (see NOTIF-1) |
| §47 | Reports — analytics totals match DB | PASS — but metric bug RPT-1 |
| §48 | CSV export — 200, UTF-8, correct rows | PASS — but missing answer columns (EXP-1) |
| §49 | Excel / XLSX export | **N/A — not implemented** (CSV only) |
| §50 | PDF export — valid 1-page PDF, DomPDF | PASS |
| §61 | Audit log — all QA actions logged with before/after + IP | PASS |
| §62 | Route security — 401 / 403 on unauthorised | PASS |
| §63 | IDOR — random registration token & guessed ticket code → 404 | PASS |
| §64 | Input validation — empty body / end<start / capacity 0 → 422 | PASS |
| §65 | XSS — `<script>` in name stored verbatim, JSON-encoded on return, React escapes on render; no server-side HTML rendering of user fields | PASS |
| §66 | SQL injection — `' OR '1'='1` in search → 0 rows (Eloquent bindings) | PASS |
| §67 | CSRF | N/A (bearer-token API) |
| §68 | Session security | N/A (no session/cookies for API) |
| §69 | Rate limiting — login 429s after 8 attempts; register/lookup/upload throttled | PASS |
| §70 | Error handling — unknown route → 404, unknown event → clean JSON 404, no stack trace | PASS |
| §71 | Browser console — catalog / detail / dashboard load with **no console errors** | PASS |
| §74 | N+1 — list endpoints eager-load; per-row `getQueuePosition()` + per-event counters are N+1 | PARTIAL (N1-1) |
| §76 | DB indexes — event_id, participant_id, status, registered_at, email, phone, slug/token unique | PASS |
| §80–81 | Empty states / null values — analytics + CSV on 0-registration event → 200, no crash | PASS |
| §92–93 | Frontend build — `tsc -b && vite build` clean, prod bundle served | PASS |
| §94 | Automated test coverage | **FAIL to run** (TEST-1) |
| §54–55 | File upload (event cover) — mime + 5 MB validation, 401/403 gating, served via proxy | PASS _(added this session)_ |
| §103–104 | XAMPP / Apache | N/A (Docker / nginx) |

---

## Problems Found

### P0 — Critical
_None._

### P1 — High

**NOTIF-1 — Email notification system is non-functional**
- **Module:** Notifications (`app/Modules/Notifications/`)
- **Problem:** No participant ever receives any email — registration confirmation,
  waitlist promotion, cancellation, reminder, event change. `audit.md` §45/§46 all fail.
- **Root cause:** `NotificationService::send()` is implemented (template lookup +
  variable interpolation) but **never called from anywhere** (`grep` finds zero
  call sites). It also only writes a `notification_logs` row + `Log::info` — it
  **never calls `Mail::`**. There are no `Mailable` classes, `MAIL_MAILER=log`,
  no queue worker container, and no scheduler (`bootstrap/app.php` has no
  `->withSchedule`). Seeder creates **0** `notification_templates`.
- **Evidence:** `notification_logs` table = 0 rows after a full
  register → promote → cancel → check-in flow.
- **Files:** `NotificationService.php`; register/promote/cancel/approve services;
  `bootstrap/app.php`; `docker-compose.yml` (no worker); `database/seeders`.

**TEST-1 — Test suite cannot execute**
- **Module:** Build / QA
- **Problem:** `php artisan test` → _"Command 'test' is not defined."_
- **Root cause:** `backend/Dockerfile` runs `composer install --no-dev`, so
  phpunit / `nunomaduro/collision` are absent from the image.
  `tests/Feature/{CapacityConcurrency,WaitlistPromotion,CheckIn}Test.php` exist
  but have never run here. No CI pipeline.
- **Files:** `backend/Dockerfile`, `.github/` (absent).

**MANREG-1 — No admin manual registration** (PRD §38 / audit §34)
- **Module:** Registration
- **Problem:** Admins cannot add a walk-in / phone / on-behalf registrant.
  `POST /events/{id}/registrations` → 405.
- **Root cause:** Route + controller method never built. `RegistrationService::register()`
  already contains all the business logic — only an authenticated wrapper endpoint
  is missing.

### P2 — Medium

**RPT-1 — Attendance rate excludes `attended` / `no_show`**
- `ReportService.php:22,56,71` count only `attendance_status = 'checked_in'`.
  Once a participant is reconciled to `attended` (or `no_show`) they drop out of
  `checked_in` and `attendance_rate` → the rate is understated (went to **0%** in
  testing after one attendee was marked `attended`). `no_show` is never surfaced
  in the rate. Per-event list uses the immutable `checkins` table (line 36) — the
  two sources disagree.

**EXP-1 — CSV export omits dynamic form answers**
- `ReportService::exportCsv` writes only reg#/name/email/phone/status/attendance/
  queue/dates. Blood type, department, jersey size, etc. are not exported.

**REGDET-1 — No full registration-detail view** (PRD §37)
- Only the inline row-expand added this session (answers + participant extras).
  Missing: status-history timeline, notification history, editable notes,
  resend-ticket, per-registration audit.

**AUTHZ-1 — No per-event authorization** (audit §13/§63)
- Any `event_admin` / `event_organizer` can manage **any** event. `event_staff`
  table is populated by the seeder and `User::canManageEvent()` exists, but
  nothing calls it and no route scopes by event ownership.

### P3 — Low

| ID | Item |
|---|---|
| N1-1 | N+1 queries on event list (per-event confirmed/waitlist/checkin counts) and registration list (`getQueuePosition()` per row). Cache the counters or batch. |
| SEC-3 | Login page prints working demo credentials (`superadmin@rhbgroup.com` / `password123`) — gate behind `VITE_SHOW_DEMO_LOGINS` / `import.meta.env.DEV`. |
| UX-1 | `alert()` / `confirm()` used for errors & confirmations in `EventDetailManage`, `EventsManagement`, `FormBuilderModal`, `QrScannerConsole`. |
| DOC-1 | `stack.md` describes a different architecture — rewrite or archive. |
| DATA-1 | Test registrations `Val Test1..3` left on **BD26** from an earlier validation session; user may want to remove them. |
| RPT-2 | `capacity_utilization` can exceed 100% after a capacity decrease (correct math, but the admin UI should show an over-capacity warning — PRD §21). |

---

## Database Changes

None during this QA pass. Migrations unchanged (6, all `Ran`). No indexes added
(the schema migration already indexes the hot columns). QA test events
(`QATEST`, `QAMAN`, `QAEMPTY*`) and `@qa.test` participants were created and then
hard-deleted; post-cleanup orphan scan = 0.

---

## Files Modified

None (read-only audit). Prior fixes on branch `security/admin-rbac-and-branding`:
`862aace` RBAC + branding + form fix · `7a053ca` answer validation + admin answer
view · `76281cf` cross-browser `<select>` · `49543ca` device image upload.

---

## Security Findings

- All P0/P1 auth issues from the earlier review are **fixed on this branch**:
  route-level RBAC, `/auth/register` locked to `participant`, admin-only
  `POST /users`, rate limiting, CORS allowlist, token expiry (480 min).
- IDOR: PASS — tokens are `Str::random(48/64)`, random probes → 404.
- XSS / SQLi: PASS — Eloquent bindings, no server-side HTML rendering of user
  input, React escapes on render.
- Still open: **AUTHZ-1** (per-event authorization), **SEC-3** (demo creds on
  login page), token in `localStorage` (accepted risk for an internal tool).

---

## Remaining Issues

| Severity | ID | Summary |
|---|---|---|
| P1 | NOTIF-1 | Email notifications never sent (no call sites, no Mailables, no worker/scheduler) |
| P1 | TEST-1 | Test suite can't run (`--no-dev` image, no CI) |
| P1 | MANREG-1 | No admin manual registration endpoint/UI |
| P2 | RPT-1 | Attendance rate excludes `attended`/`no_show` |
| P2 | EXP-1 | CSV export missing dynamic answer columns |
| P2 | REGDET-1 | No full registration-detail view |
| P2 | AUTHZ-1 | No per-event authorization |
| P3 | N1-1, SEC-3, UX-1, DOC-1, DATA-1, RPT-2 | see table above |

---

## Final Recommendation

**NOT READY FOR PRODUCTION.**

The registration / capacity / waitlist / promotion / QR / check-in / attendance
core is well-built and passed every functional and concurrency-logic test, with
no data-integrity, IDOR, XSS or SQL-injection issues. However:

1. **Email notifications do not work at all** (P1) — and the PRD's registration,
   waitlist and reminder flows depend on them.
2. **No runnable tests / CI** (P1) — no regression safety net.
3. **Manual registration is missing** (P1) — a required admin capability.

Close NOTIF-1, TEST-1 and MANREG-1, fix the P2 reporting/export/authorization
gaps, then re-run this checklist end-to-end.
