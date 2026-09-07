# Implementation Status — RHB Events Platform

_Audit date: 2026-09-04. Compares the codebase against `prd.md` (95 sections) and
`stack.md`. Branch reviewed: `security/admin-rbac-and-branding`._

---

## 0. Stack: intended vs actual

`stack.md` describes **Laravel Blade + HTML + Apache + XAMPP + Laravel Excel**.
The actual build is a **decoupled SPA**:

| Layer | stack.md says | Actually built |
|---|---|---|
| Frontend | Laravel Blade / Apache | **React 18 + Vite + TypeScript + Tailwind v4**, served by nginx |
| Backend | Laravel (Blade views) | **Laravel 12/13 REST API only**, `php artisan serve` |
| Auth | Laravel session auth | **Sanctum bearer tokens** (localStorage) |
| Excel | maatwebsite/laravel-excel | Hand-rolled CSV `StreamedResponse` (no Excel lib) |
| PDF | DOMPDF | `barryvdh/laravel-dompdf` ✅ |
| QR | "Laravel QR package" | `simplesoftwareio/simple-qrcode` ✅ |
| Deploy | cPanel / VPS / Apache | **Docker Compose** (mysql + php-cli + nginx) |
| Email | Laravel Mail | **Not wired** (see §3) |

→ `stack.md` is stale and should be rewritten to match reality, or archived.

---

## 1. What the system HAS (working)

### Backend — data model (complete)
All PRD tables exist via `2026_09_04_000001_create_events_tables.php` +
`add_attachments`:
`organizations, event_categories, events (uuid), event_staff, event_templates,
registration_forms, form_fields, participants (uuid), registrations (uuid),
registration_answers, registration_status_history, waitlist_history, tickets,
checkins, attendance, notification_templates, notification_logs, audit_logs,
system_settings` + `users` extended with `role/organization_id/phone/status`.

### Backend — features (working)
| Area | Status | Notes |
|---|---|---|
| Auth (login / me / logout) | ✅ | Sanctum, `status=active` gate, 480-min token expiry |
| **RBAC** | ✅ | `role` middleware tiers on every route (added this session) — read-only / event-manager / registration / check-in / governance |
| Public event catalog + detail by slug | ✅ | visibility filter (`public`, `hidden_link`), dynamic status |
| Event CRUD + duplicate + status change | ✅ | `EventService`: slug/code auto-gen, seeds a default form, audit-logged |
| Dynamic form builder | ✅ | `form_fields` with type/options/order/required/hidden/help; soft-hide when registrations exist |
| Public registration | ✅ | `DB::transaction` + `lockForUpdate`, sequence gen, permanent `EVT-...` number, `secure_access_token` (Str::random 48) |
| **Server-side answer validation** | ✅ | required + option constraints (added this session) |
| Capacity enforcement + waitlist | ✅ | concurrency-safe; `waitlist_capacity` cap; `approval_mode` manual/automatic |
| Waitlist FIFO auto-promotion | ✅ | on confirmed cancellation; manual promote; priority override; `waitlist_history` |
| Duplicate prevention | ✅ | per-event rule: email / phone / employee_id / none |
| Registration lookup (number + email) | ✅ | throttled |
| Participant self-service portal | ✅ | `GET/POST /public/registration/{token}`, cancel (deadline + toggle honoured) |
| QR ticket issuance + public ticket view + QR image | ✅ | `Str::random(64)` token, no PII in payload; SVG QR with fallback |
| Check-in (scan / manual / undo / search / recent) | ✅ | `CheckInService`; duplicate-scan guarded |
| Attendance roster + mark (checked_in / attended / no_show) | ✅ | `attendance` upsert + audit |
| Global dashboard stats | ✅ | events/participants/registrations/attendance-rate + recent lists |
| Event analytics | ✅ | status breakdown, capacity utilisation, registrations-by-date, source breakdown |
| CSV export (attendees) | ✅ | streamed; **core columns only — no dynamic answers** |
| PDF summary export | ✅ | DomPDF, KPI table + top-100 attendee list |
| Audit log (read + write) | ✅ | most mutations logged with before/after + IP |
| **Image upload from device** | ✅ | `POST /media/upload` → `public` disk → `/storage/...` (added this session) |
| Categories (list + create) | ✅ | slug auto |
| Event templates (list + create) | ⚠️ API only | no seeded rows, no UI, not used by the wizard |
| Notification templates (list + create) + logs (list) | ⚠️ API only | **nothing sends** (see §3) |

### Frontend — screens (working)
`PublicEventsCatalog` (left-sidebar categories), `PublicEventDetail`,
`RegistrationWizard` (3-step, dynamic fields + dropdowns), `MyRegistrationPage`
(lookup), `PublicTicketPage` (QR), `LoginPage` (+ demo quick-login),
`GlobalDashboard`, `EventsManagement` (list + filters + row actions),
`EventDetailManage` (tabs: Overview / Registrations _with expandable answers_ /
Form Builder / Queue / QR Check-In / Attendance / Analytics / Settings),
`EventWizardModal` (4-step create), `EventSettingsModal`, `FormBuilderModal`,
`WaitlistQueuePage`, `QrScannerConsole` (html5-qrcode + photo fallback),
`AttendanceRoster`, `EventReportsPage`, `AuditLogsPage`,
`AdminLayout` (**role-filtered nav**), shared `ImageUploadField`.

### Infra
Docker Compose (mysql 8 / php 8.4-cli / nginx), entrypoint syncs env→`.env`,
`storage:link`, seeds only when users table empty, named volumes for DB +
uploads. nginx proxies `/api/` and `/storage/`.

---

## 2. What's PARTIALLY done / thin

| Item | Gap |
|---|---|
| CSV export | Omits dynamic registration answers — only reg#/name/email/phone/status/dates. PRD §48 implies full answer columns. |
| Registration detail (PRD §37) | No dedicated page; only an inline row-expand in the Registrations tab. No status-history timeline, no per-registration notes editing, no resend-ticket. |
| Event analytics UI | Backend returns rich data (by-date, sources); `EventReportsPage` renders a subset — check charts coverage. |
| Audit log | Event `create/update/status` are logged in `EventService`; `destroy` (hard delete path) writes **no** audit entry. |
| `event_staff` table | Populated by seeder, but **no UI** to manage an event team and **no enforcement** — any event_admin/organizer can manage any event (`User::canManageEvent()` exists, unused). PRD §39. |
| Demo users | Only `super_admin`, `event_admin`, `checkin_staff` seeded. No `event_organizer`, `registration_officer`, `viewer` to exercise those tiers. |
| Multi-organization (PRD §77) | `organizations` table + `organization_id` columns exist; nothing scopes queries by org. Single-org in practice. |
| `system_settings` table | Exists, unused. |
| `map_url` / lat-long | Stored, not shown on a map (PRD §40). |

---

## 3. What's MISSING (vs PRD)

### Critical / user-visible
| PRD § | Feature | State |
|---|---|---|
| §44–46 | **Email notifications** | `NotificationService::send()` exists but **only writes a `notification_logs` row + `Log::info` — it never calls `Mail::`**, and **nothing anywhere calls `send()`**. So: no registration confirmation email, no waitlist-promotion email, no reminders. No `Mailable` classes, no queue worker, no scheduler. |
| §46 | Event reminders (scheduled) | None. No `schedule()` entries, no cron/worker in Docker. |
| §38 | Manual registration by admin | No route, no UI. Admins cannot add a walk-in/phone registrant. |
| §37 | Registration Detail page | Not built (see §2). |
| §36 | Global Participant Management | No cross-event participant list/search/merge screen. |
| §82 | Admin bulk actions | No bulk approve/reject/cancel/export-selected. |
| §83 | Import participants (CSV) | No import endpoint or UI. |
| §41 | Calendar view | No month/week calendar of events. |
| §42 | Event templates UI | API only; wizard has no "start from template". |
| §76 | Organization settings | No screen (name, logo, timezone, contact, branding). |
| §75/§35 | Notification template editor UI | API only. |
| §80 | Event QR code (poster/deep-link) | Ticket QR exists; no per-event "scan to register" QR. |

### Platform / non-functional
| PRD § | Item | State |
|---|---|---|
| §92–94 | **Tests can't run** | `tests/Feature/{WaitlistPromotion,CapacityConcurrency,CheckIn}Test.php` exist, but the Docker image is `composer install --no-dev` → **phpunit not installed**, `php artisan test` fails. CI not present. |
| §68/§31 | Login demo-credential exposure | `LoginPage` prints working `superadmin@rhbgroup.com` / `password123` etc. — not gated by an env flag. |
| §71 | File-upload hardening | Basic mime+size validation only; no image re-encode / EXIF strip / content sniffing beyond Laravel's `image` rule. |
| §88 | Structured logging / request IDs | Default Laravel logging only. |
| §89 | Backup strategy | None documented; DB volume only. |
| §85/§49 | Activity log UI filters | `AuditLogsPage` exists; confirm it exposes entity/date filters the API supports. |
| §63 | Conditional form logic | `form_fields.conditional_logic` column exists; neither builder nor public form implements show/hide rules. |
| §17/§17 | Field types | Builder offers text/email/phone/number/select/radio/checkbox. PRD also lists date/time/datetime/file-upload/address/country — **not implemented**. |
| §33 | `alert()` / `confirm()` | Used for errors/confirmations in several admin modules — not production UX. |
| — | `stack.md` | Describes a different architecture; misleading. |

---

## 4. Security posture (current)

**Fixed this session** (branch `security/admin-rbac-and-branding`):
- Route-level RBAC (`role` middleware) — was auth-only, no authz.
- Public `/auth/register` forced to `participant` — was accepting arbitrary `role`
  (self-provisioned super_admin).
- `POST /users` admin-only staff creation; only super_admin makes super_admin.
- Rate limiting on login/register/lookup/upload (API had none).
- CORS `*` → env allowlist; Sanctum tokens now expire (480 min).
- Frontend nav/action gating by role.
- Server-side validation of registration answers.

**Still open:**
- No per-event authorization (event_staff unused).
- Token in `localStorage` (XSS-exfiltratable) — acceptable for internal tool, noted.
- Demo credentials on the login page.
- No 2FA / SSO (PRD doesn't require, but "RHB internal" likely will).

---

## 5. Suggested priority order

1. **Email notifications** — wire `NotificationService` to real `Mail`, add
   `Mailable`s, call `send()` from register / promote / cancel / approve; add a
   queue worker + scheduler container for reminders. (Biggest functional gap.)
2. **Manual registration** (admin add attendee) + **Registration Detail page**
   with status history and resend-ticket.
3. **CSV export: include dynamic answers**; add **bulk actions** + **CSV import**.
4. **Per-event team + authorization** (use `event_staff` / `canManageEvent`).
5. **Make tests runnable** — dev image or a test stage; add CI.
6. Gate demo logins behind `VITE_SHOW_DEMO_LOGINS`; replace `alert()`/`confirm()`.
7. Org settings + notification-template editor + event-template picker UIs.
8. Calendar view; per-event registration QR; map on location.
9. Rewrite/replace `stack.md`.

---

## 6. Recently addressed (context)

See `debug.md` (registration-form sync + server validation) and the
`security/admin-rbac-and-branding` branch commits:
`862aace` RBAC + branding + form fix ·
`7a053ca` answer validation + admin answer view ·
`76281cf` cross-browser `<select>` ·
`49543ca` device image upload.
