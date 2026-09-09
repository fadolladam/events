# RHB Events — Gap Report (system vs. `implementation.md`)

_Reviewed 2026-09-09 · branch `security/admin-rbac-and-branding` · verified against live code_

`implementation.md` was written **2026-09-04**. This report re-checks every item
in it against the current codebase, records what has been closed since, and lists
**what is still not done**.

---

## A. Closed since the 2026-09-04 audit

| implementation.md item | Now |
|---|---|
| §68 / §31 — demo credentials printed on the login page | **Fixed.** The quick-login switcher was removed (commit `e352a83`); `LoginPage.tsx` no longer contains `password123` or a demo picker. |
| §80 — per-event "scan to register" QR | **Done.** `EventQrModal.tsx` renders a QR that deep-links to `/events/:slug`, with print-ready PNG download + copy-link. |
| §40 — `map_url` never shown | **Partial → link done.** `PublicEventDetail.tsx` now renders `map_url` as an external link (normalises a bare host to `https://`). Still no embedded map / no use of `latitude`/`longitude`. |
| §33 — `alert()` / `confirm()` everywhere | **Partial.** A `ConfirmDialog` component now exists, but `alert()`/`confirm()` are still used in ~10 modules (see D‑16). |
| §83 — CSV import | **Partial.** An artisan command `registrations:import <event> <file.csv>` (`ImportRegistrations.php`, supports `--dry-run`) exists. No HTTP endpoint and no admin UI. |
| §89 — backup strategy | **Partial.** `backend/database/backups/` + a dump/restore guide were added (commit `0e232a3`). No automated/scheduled backup. |
| Dashboard depth | **Expanded.** New `GET /dashboard/overview` + `DashboardService` + ~18 SVG widgets and an index migration (2026-09-07). |
| — | **New (not in PRD gap list):** reusable **registration-form templates** — `form_templates` table, `FormTemplateController`, 6 seeded built-ins, "load / save reusable form" + manager modal in the Form Builder. Note this is *form* templates, **not** the *event* templates of §42. |
| Stack drift | README rewritten to match reality (single Laravel app). `stack.md` still stale; `implementation.md` itself now also drifted (see E). |

---

## B. Still MISSING — critical / user-visible

| PRD § | Feature | Verified state (2026-09-09) |
|---|---|---|
| **§44–46** | **Email notifications** | **Still completely dead.** `NotificationService` is referenced **nowhere** outside its own file. No `app/Mail/` directory, no `Mailable` classes, no `Mail::` call anywhere. `notification_templates` / `notification_logs` are CRUD-only. No confirmation, promotion, approval, or reminder email is ever sent. _(= backlog item NOTIF‑1, unresolved.)_ |
| **§46** | Scheduled event reminders | **None.** `routes/console.php` contains only `inspire`. No `schedule()` entries. Docker image has no queue worker and no cron/scheduler process. |
| **§38** | Admin manual registration (walk-in / phone) | **Still no route.** `routes/api.php` exposes only `index / show / approve / reject / cancel` for registrations. No admin "add attendee" endpoint or UI. _(= backlog item MANREG‑1, unresolved.)_ |
| **§37** | Registration Detail page | **Not built.** No route in `App.tsx`. Only the inline row-expand in the Registrations tab. No status-history timeline, no per-registration notes editing, no **resend-ticket** (`grep resend/reissue` → nothing). |
| **§36** | Global Participant Management | **Not built.** No cross-event participant list / search / merge screen or endpoint. |
| **§82** | Admin bulk actions | **Not built.** No bulk approve / reject / cancel / export-selected. |
| **§41** | Calendar view | **Not built.** No month/week calendar (the `Calendar` hits in code are just Lucide icons). |
| **§42** | Event templates UI | **API only, unchanged.** `event_templates` has list/create endpoints; `EventWizardModal.tsx` has no "start from template" (no `template` reference in the file). |
| **§76** | Organization settings UI | **Not built.** No screen for org name / logo / timezone / contact / branding. |
| **§75 / §35** | Notification-template editor UI | **Not built.** API only; the only frontend touchpoint is the read-only `NotificationHealth` dashboard widget. |
| **§83** | CSV import — endpoint + UI | Artisan command only (see A). No HTTP route, no screen. |

---

## C. Still PARTIAL / thin

| PRD § | Item | Verified state |
|---|---|---|
| **§48** | CSV export omits dynamic answers | **Unchanged.** `ReportService::exportCsv` eager-loads `answers` but writes only 10 fixed columns (reg#, name, email, phone, status, attendance, queue pos, 3 dates). No per-field answer columns. |
| §49 / §85 | Audit log UI filters | `AuditLogsPage` exists; entity/date filter coverage vs. the API not confirmed in this pass. |
| §39 | `event_staff` team + per-event authorization | **Still not enforced.** `User::canManageEvent()` exists and is **unused**. `EventService` writes an owner row and `DashboardService` reads staff for one readiness metric, but **no controller checks event membership** — any `event_admin` / `event_organizer` can manage any event. No UI to manage an event team. |
| §77 | Multi-organization scoping | `organizations` + `organization_id` columns exist; **nothing scopes queries by org**. Single-org in practice. |
| — | `system_settings` table | **Still unused** (model class only, no reads/writes). |
| §17 | Field types | Builder dropdown offers **text / email / phone / number / select / radio / checkbox** only. No date, time, datetime, file-upload, address, country. (The migration comment also mentions a `terms`/`waiver` type — not in the current dropdown.) |
| §63 | Conditional form logic | `form_fields.conditional_logic` column + `api.ts` type exist; **no builder UI and no public-form evaluation** of show/hide rules. |

---

## D. Still MISSING — platform / non-functional

| PRD § | Item | Verified state |
|---|---|---|
| **§92–94** | **Test suite can't run in the shipped image** | **Unchanged.** `backend/Dockerfile` still `composer install --no-dev` → PHPUnit not installed → `php artisan test` fails in the container. No CI config present. _(= backlog item TEST‑1, unresolved.)_ The 4 feature tests themselves still exist and pass locally after `composer install`. |
| §33 | `alert()` / `confirm()` in admin UX | **Still present** in `AttendanceRoster`, `FormBuilderModal`, `FormTemplatesModal`, `MyRegistrationPage`, `EventDetailManage`, `EventsManagement`, `dashboard/PendingApprovals`, `WaitlistQueuePage`, `QrScannerConsole`. `ConfirmDialog` component exists but is not adopted across these. |
| §71 | File-upload hardening | **Unchanged.** Laravel `image` + size rule only; no re-encode, EXIF strip, or content sniffing. |
| §88 | Structured logging / request IDs | **Not added.** Default Laravel logging. |
| — | Audit on event hard-delete | **Still a gap.** `EventController::destroy` archives when registrations exist, else `$event->delete()` with **no `AuditService::log`** call. |
| — | Default seed exercises only 3 roles | `DatabaseSeeder` (`migrate --seed`) creates **super_admin, event_admin, checkin_staff** only. The full 5-account set (adds `event_organizer`, `registration_officer`) lives in `FreshProjectSeeder` (`--class=FreshProjectSeeder`) and `install/events.sql`. **README claims `migrate --seed` creates all 5 — documentation drift.** `event_organizer` / `registration_officer` / `viewer` tiers are not exercised by the default seed. |
| §68 | Token in `localStorage` | Unchanged; accepted for an internal tool (noted in implementation.md). |
| — | No 2FA / SSO | Unchanged; not PRD-required but likely needed for "RHB internal". |

---

## E. `implementation.md` is itself now out of date

The audit doc predates the 2026-09-07/08 work and now mis-describes the stack:

- Says "**React 18** … served by **nginx**", "php-cli + **nginx**", entrypoint runs `storage:link`.
- Actual: **React 19**, **single Laravel app** serving the built SPA (no nginx, no separate frontend container), symlink-free `/storage` **route** instead of `storage:link`, one Docker port (`5173→8000`), committed `vendor/`.
- Its "Suggested priority order" (§5) is still accurate as a to-do list — items 1–7 there map directly to sections B, C and D above.

---

## F. Shortlist — what to do next (unchanged priorities)

1. **Email notifications** — give `NotificationService` a real `Mail` path, add `Mailable`s, call it from register / promote / cancel / approve; add a worker + scheduler for reminders. *(NOTIF‑1 — biggest functional gap.)*
2. **Manual registration** endpoint + UI, and a real **Registration Detail** page (status history + resend-ticket). *(MANREG‑1)*
3. **Make tests runnable** in the image / add a test stage + CI. *(TEST‑1)*
4. **CSV export: add dynamic-answer columns**; add **bulk actions**; promote CSV import from artisan-only to an endpoint + screen.
5. **Per-event authorization** — wire `event_staff` / `User::canManageEvent()` into controllers; add a team-management UI.
6. Replace remaining `alert()`/`confirm()` with `ConfirmDialog`; audit-log event hard-delete.
7. Additional field types (date/time/file) + conditional form logic; org-settings, notification-template-editor, and event-template-picker UIs; calendar view.
8. Fix the README seed-account claim (or expand `DatabaseSeeder` to all 5 roles); refresh or archive `stack.md` and `implementation.md`.
