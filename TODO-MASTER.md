# RHB Events — Master TODO

_Consolidated from the `implementation.md` audit (PRD) and the
`implementations-2.md` enhancement brief — both now merged into this file and
deleted. Deduplicated and prioritised. Reviewed 2026-09-09 against branch
`security/admin-rbac-and-branding`._

**Legend** — status: ☐ not started · ◐ partial · ✅ done · ❌ out of scope
Source refs: `PRD §` = `prd.md`; `E§` = the former `implementations-2.md`.

> **Notifications — OUT OF SCOPE (user decision):** email/SMS/notification
> functionality will **not** be implemented. `implementations-2.md` already
> excluded it, and the project owner has confirmed to leave it. Items that
> depended on it (former Tier 0 #1, and #40) are marked ❌ and skipped. Item
> numbers below are kept stable — #1 is intentionally retired.

---

## Progress log

| Date | Item | Result |
|---|---|---|
| 2026-09-09 | Merge both source docs → this file; delete `implementation.md` + `implementations-2.md` | ✅ |
| 2026-09-09 | #1 Notifications | ❌ retired (out of scope) |
| 2026-09-09 | #3 Tests runnable + CI | ✅ fixed `routes/api.php` `const`→guarded `define()` (was fataling on 2nd boot); added `.github/workflows/ci.yml` (backend tests + Pint, frontend lint + typecheck + build + SPA-publish check); applied Pint across the codebase for a clean lint baseline. Suite now 13 green (was 2/5). |
| 2026-09-09 | #6 Login protection | ◐ generic `"Invalid credentials."` for every failure mode (no account enumeration) + failed logins written to `audit_logs`. Progressive lockout/backoff still open. |
| 2026-09-09 | #13 Rate-limit gaps | ✅ throttles added: public ticket lookup (30/min), QR image (60/min), check-in scan/process (240/min), undo/search (120/min), CSV/PDF export (20/min), `POST /users` (20/min). |
| 2026-09-09 | #17 Expand audit trail | ◐ added: `user_login_failed`, `event_deleted` (hard delete), `report_exported` (csv/pdf). Still open: user updated/role/disabled (need #36 endpoints), manual-registration (needs #2), attendance changes. |
| 2026-09-09 | #28 Event lifecycle guards | ✅ `EventService` now enforces a status-transition map on both `changeStatus()` and the generic `updateEvent()` payload; invalid moves → 422. Tests added. |
| 2026-09-09 | #56 Seed all 5 roles | ✅ `DatabaseSeeder` now creates event_organizer + registration_officer (was 3 accounts) and wires them into `event_staff`; README claim is now accurate. |
| 2026-09-09 | #2 Admin manual registration | ✅ `POST /events/{id}/registrations` (registration-officer tier) → same `RegistrationService::register()` (source=`manual`); `ManualRegistrationModal` + "Add participant" button on the Registrations tab; `registration_manual_created` audit; `ManualRegistrationTest`. **Tier 0 complete.** |
| 2026-09-09 | #14 Security headers | ✅ `SecurityHeaders` middleware (global) — CSP / XFO / nosniff / Referrer-Policy / Permissions-Policy (camera=self) / COOP / HSTS(https). `config/security.php` env toggles. `SecurityHeadersTest`. |
| 2026-09-09 | #6 Login protection | ✅ **complete** — added per-email+IP `RateLimiter` lockout (5 fails → 15 min → 429; correct password still refused during lockout; cleared on success), `user_login_locked_out` audit. `LoginThrottleTest`. |
| 2026-09-09 | #15 Upload hardening | ✅ `MediaController` — `getimagesize()` header authoritative for type+extension (client filename ignored), 6000px cap, UUID filename, jpeg/png/webp/gif allow-list. `UploadSecurityTest`. |
| 2026-09-09 | #16 Token / QR | ◐ cancelling a registration now **revokes its ticket** (`RegistrationService`); verified cross-event / forged-token / no-PII. `TicketSecurityTest`. Follow-up: `ticket_code` (8 rand chars) is weaker than `secure_token` — consider dropping it as a scan key. |
| 2026-09-09 | #9 Per-event authorization | ✅ `EventScopeMiddleware` (`event.scope`) on the 4 protected groups; org-wide roles unchanged, scoped roles limited to `event_staff` events; `EventController::index` filtered. `EventScopeAuthorizationTest`. |
| 2026-09-09 | #10 IDOR | ✅ registration-id routes resolve the parent event + apply the scope check; public token routes already object-scoped. |
| 2026-09-09 | #11 RBAC matrix | ◐ `RBAC-MATRIX.md` written (endpoint × role × event-scope). Follow-up: exhaustive automated endpoint×7-role suite (E§49). |
| 2026-09-09 | #5 Password security | ✅ policy (min 12 / mixed / numbers / symbols / pwned-in-prod), `POST /auth/password` self-change (revokes other tokens), `POST /users/{id}/force-password-reset`, `must_change_password` + `last_login_at` columns, seeders blocked in prod. Email reset-link flow deferred (needs notifications). `PasswordManagementTest` (8). |
| 2026-09-09 | #7 MFA-ready / #8 SSO-ready | ◐ integration points documented in `SECURITY.md`; authorization layer already decoupled from the auth mechanism. Full TOTP / Entra OIDC not built (deliberate — no half-implementations). |
| 2026-09-09 | #55 Docs | ◐ `SECURITY.md` + `RBAC-MATRIX.md` added. Still: `DEPLOYMENT.md`, production install guide, testing guide. |
| 2026-09-09 | #4 SPA session/cookie auth | ✅ SPA now authenticates by Sanctum session cookie (HttpOnly, SameSite=lax, Secure-in-prod) + CSRF; `EnsureFrontendRequestsAreStateful` on the `api` group; login regenerates the session, logout invalidates it; no token in `localStorage` (only the non-secret profile, re-validated via `/auth/me` on boot); bearer tokens still work for non-browser clients. Verified end-to-end with curl (CSRF 419, session `/auth/me` 200, post-logout 401, bearer fallback 200). `SpaSessionAuthTest` (3). **Tier 1 core done — only #12 remains open.** |
| 2026-09-09 | #18 Registration detail | ◐ backend: `POST /registrations/{id}/reissue-ticket`, `PATCH /registrations/{id}` (notes); UI: note editor (save-on-blur) + reissue button in the expanded row. OPEN: full status-history timeline in the UI. |
| 2026-09-09 | #20 + #26 Bulk actions | ✅ `POST /events/{id}/registrations/bulk` (approve/reject/cancel) + `POST /events/{id}/attendance/bulk`; approve/reject moved into `RegistrationService` so single + bulk share one locked path; UI: row checkboxes + select-all + bulk bar. `RegistrationOpsTest`. |
| 2026-09-09 | #22 Registration filters | ✅ `indexForEvent` gains department / date_from / date_to / checked_in; UI filter bar with Clear. |
| 2026-09-09 | #23 Form field types | ✅ textarea, employee_id, date, time, multi_select, consent, info added — allow-listed on save, server-validated (consent-required, option membership, date/time/number format), rendered in the builder + public wizard + manual-reg modal. `FormFieldTypesTest`. File upload deferred. |

---

## Tier status

| Tier | Done | Partial | Open / N-A |
|---|---|---|---|
| **0 Blockers** | #2, #3 | — | #1 ❌ retired — **TIER COMPLETE** |
| **1 Security** | #4, #5, #6, #9, #10, #13, #14, #15 | #7, #8, #11, #16, #17 | #12 |
| **2 Core** | #20, #22, #23 | #18, #28 | #19, #21, #24, #25, #26, #27, #29, #30 |
| 3 Admin/Dash | #27-adjacent | #42, #43 | #31–#41 (#40 ❌) |
| 4 Production | #37, #51 | #44, #46, #52 | #38, #39, #41, #45, #47–#50, #53–#55 |
| 5 Housekeeping | #56 | — | #57, #58 |

---

## TIER 0 — Blockers (nothing ships without these)

- ❌ **1. Email notification engine** — **OUT OF SCOPE.** Will not be built.
  `NotificationService` stays dormant; no `Mail`, no scheduler. (Retired per
  owner decision; kept as a numbered placeholder so later references don't shift.)
- ✅ **2. Admin manual registration** — `POST /events/{id}/registrations`
  (registration-officer tier, throttle 60/min) → `RegistrationController::
  storeManual()` → the existing `RegistrationService::register(source:'manual')`,
  so capacity / duplicate / approval / waitlist / sequence / permanent number /
  QR ticket / status history all behave identically. `ManualRegistrationModal`
  renders identity fields + the event's dynamic form; "Add participant" button
  on the Registrations tab; `registration_manual_created` audit entry.
  `ManualRegistrationTest` (4 cases). FOLLOW-UPS: participant autocomplete
  (#19), and an optional "register despite registration_closed" override.
  _PRD §38 · E§16_
- ✅ **3. Make tests runnable + CI** — `routes/api.php` role-tier `const`s were
  fataling on the test runner's 2nd app boot → converted to guarded `define()`.
  Added `.github/workflows/ci.yml`: backend job = `composer install` (with dev) +
  `php artisan test` + `pint --test`; frontend job = `npm ci` + `npm run lint` +
  `npm run build` (covers `tsc -b`) + a check that the SPA published into
  `backend/public/`. Pint applied repo-wide for a clean baseline. Suite: 13 green.
  _PRD §92–94 · E§48, §50, §51_ — follow-ups: the 15 named suites in E§48 (#54).

---

## TIER 1 — Security hardening (`implementations-2.md` Priority 1)

### Authentication
- ✅ **4. SPA session auth** — Sanctum stateful **cookie** auth: HttpOnly,
  `SameSite=lax`, `Secure` in prod; CSRF via `/sanctum/csrf-cookie` +
  `X-XSRF-TOKEN`; `EnsureFrontendRequestsAreStateful` prepended to the `api`
  group; login → `session()->regenerate()`, logout → `invalidate()`. Token gone
  from `localStorage` (only the non-secret profile cached, re-checked via
  `/auth/me` on boot with a spinner so refresh doesn't flash the login page).
  Bearer tokens still serve non-browser clients. Public registration keeps
  working (SPA primes the CSRF cookie). Verified end-to-end with curl + 47 tests
  incl. `SpaSessionAuthTest`. Config: `SANCTUM_STATEFUL_DOMAINS`,
  `SESSION_SECURE_COOKIE`, `CORS_ALLOWED_ORIGINS`, vite proxy `/sanctum`. _E§1_
- ✅ **5. Password security** — `PasswordRules` / `Password::defaults()` (min 12,
  mixed case, numbers, symbols; pwned-check in prod only). `POST /auth/password`
  self-change (verify current, forbid reuse, revoke other tokens, audited).
  `POST /users/{id}/force-password-reset` (governance). `must_change_password`
  (default true for admin-created) + `password_changed_at` + `last_login_at`
  columns. Seeders refuse to run in prod. `PasswordManagementTest`.
  DEFERRED: email forgot-password reset-link (needs notifications). _E§2 · PRD §31_
- ✅ **6. Login protection** — generic `"Invalid credentials."` (no enumeration);
  failures audited; per-email+IP `RateLimiter` lockout (5 → 15 min → 429, correct
  password still refused during lockout, cleared on success),
  `user_login_locked_out` audit. `LoginThrottleTest`. _E§3_
- ◐ **7. MFA-ready architecture** — integration point documented in
  `SECURITY.md` (`AuthService::login`, before token issue). Full TOTP enrolment
  + verify endpoint + `two_factor_*` columns NOT built (deliberate: no
  half-implementation). _E§4_
- ◐ **8. SSO-ready architecture** — `SECURITY.md` documents the seam; the
  authorization layer (role tier + event scope) is already independent of the
  auth mechanism, so an Entra OIDC callback that resolves a `User` + issues a
  Sanctum token slots in without restructuring. No provider code yet. _E§5_

### Authorization
- ✅ **9. Per-event authorization** — `EventScopeMiddleware` (alias `event.scope`)
  on the STAFF / EVENT_MANAGER / REGISTRATION / CHECKIN groups, using the
  existing `User::canManageEvent()`. Org-wide roles unchanged; scoped roles
  limited to their `event_staff` events (403 otherwise). `EventController::index`
  filtered to assigned events. `EventScopeAuthorizationTest`. NOTE: chose a
  single scope middleware over 11-ability Policies to keep controllers thin —
  revisit if fine-grained per-ability rules are needed. _PRD §39 · E§7_
- ✅ **10. IDOR / object-level** — `/registrations/{id}` (+approve/reject/cancel)
  and `/waitlist/{registrationId}/priority` resolve the parent event and run the
  same scope check; public token routes already object-scoped. _E§8_
- ◐ **11. RBAC permission matrix** — `RBAC-MATRIX.md` written (endpoint × role ×
  event-scope, authoritative next to `routes/api.php`). OPEN: exhaustive
  automated endpoint × 7-role suite asserting 200/401/403 (E§49). _E§6, §49_

### API / data protection
- ☐ **12. API Resources / DTOs** — stop returning raw Eloquent models; least-
  privilege fields. Participant email / phone / employee_id / department /
  answers are currently exposed wherever a registration is returned. _E§14_
- ✅ **13. Rate-limiting gaps** — throttles added in `routes/api.php`: public
  ticket lookup 30/min, QR image 60/min, check-in scan/process 240/min,
  undo/search 120/min, CSV/PDF export 20/min, `POST /users` 20/min. Check-in
  limits deliberately generous for event day. _E§12_
- ✅ **14. Security headers** — `App\Http\Middleware\SecurityHeaders` (global):
  same-origin CSP (+ `data:`/`blob:` images, `camera=(self)` for the QR
  scanner), X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy,
  Permissions-Policy, COOP, HSTS on HTTPS only. `config/security.php` env
  toggles. `SecurityHeadersTest`. _E§13_
- ✅ **15. Upload hardening** — `MediaController`: `getimagesize()` header is
  authoritative for type + written extension (client filename ignored),
  dimensions capped 6000px, UUID filename (no overwrite/traversal),
  jpeg/png/webp/gif allow-list. `UploadSecurityTest`. Optional follow-up:
  re-encode / EXIF strip. _PRD §71 · E§11_
- ◐ **16. Token / QR** — cancelling a registration now **revokes its ticket**
  (`RegistrationService::cancelRegistration`), so a cancelled seat's QR stops
  scanning. Verified: forged token / cross-event ticket rejected, no PII in
  `qr_payload`. `TicketSecurityTest`. OPEN: `ticket_code` (8 random chars) is a
  weaker scan key than `secure_token` (64) — consider removing it as an
  accepted key. _E§9, §10_

### Audit
- ◐ **17. Expand audit trail** — DONE: `user_login_failed`, `event_deleted`
  (hard-delete path), `report_exported` (csv + pdf). Already existed:
  `user_login`, `user_logout`, `user_registered`, `user_created`, event
  create/update/status/duplicate, registration created/cancelled,
  participant_promoted, waitlist_priority_changed, check-in create/reverse.
  STILL OPEN: user updated / role changed / disabled (need #36 endpoints),
  manual-registration (needs #2), attendance changes; DB-level guard so normal
  admins cannot modify/delete `audit_logs` rows. _PRD §49 · E§15_

---

## TIER 2 — Core function improvements

### Registrations & participants
- ◐ **18. Registration Detail** — DONE: `PATCH /registrations/{id}` (edit
  internal note) + `POST /registrations/{id}/reissue-ticket` (revoke + fresh
  QR); UI note editor (save-on-blur) + reissue button in the expanded row.
  OPEN: a full status-history timeline in the UI (backend `show` already
  returns `statusHistory`). _PRD §37_
- ☐ **19. Global Participant Management + employee search** — cross-event
  participant list; search by employee ID / name / email / phone / department;
  autocomplete, duplicate warning, participant preview; seam for a corporate
  directory API. _PRD §36 · E§17_
- ✅ **20. Bulk actions** — `POST /events/{id}/registrations/bulk`
  (approve/reject/cancel a selection, each through the shared locked service
  path, `skipped[]` for bad ids, audited) + `POST /events/{id}/attendance/bulk`.
  UI: row checkboxes + select-all + a bulk action bar. `RegistrationOpsTest`.
  (Export-selected folds into #35.) _PRD §82 · E§24, §26_
- ☐ **21. CSV import (endpoint + UI)** — promote the existing
  `registrations:import` artisan command to an authorized HTTP endpoint + admin
  screen, reusing `RegistrationService`. _PRD §83_
- ✅ **22. Registration table filters** — `indexForEvent` adds `department`
  (like), `date_from` / `date_to` (registered_at), `checked_in` yes/no,
  alongside the existing status / attendance / free-text + pagination. UI
  filter bar with one-click Clear. _E§24_

### Forms
- ◐ **23. Form-builder field types** — DONE: textarea, employee_id, date, time,
  multi_select, consent, info — allow-listed on save, server-validated
  (consent-required, option membership, date/time/number format), rendered in
  the builder, public wizard, and manual-reg modal. `FormFieldTypesTest`.
  OPEN: **file upload** — deferred to its own storage-security pass. _PRD §17 ·
  E§20_
- ☐ **24. Conditional form logic** — the `conditional_logic` column + TS type
  exist; implement show/hide rules in the builder **and** the public form.
  _PRD §63 · E§20_
- ☐ **25. Form-builder UX** — drag/drop reorder, live preview, duplicate-field
  detection. _E§20_

### Events
- ☐ **26. Event templates (real feature + UI)** — seed richer templates (sports,
  badminton, football, blood donation, marathon, townhall, training, seminar,
  client event, gathering, custom); "start from template" in the wizard; allow
  custom templates. `event_templates` is API-only today. _PRD §42 · E§19_
- ☐ **27. Event creation wizard** — fuller multi-step flow with per-step
  validation and safe draft state between steps; include a staff-assignment step.
  Today a 4-step create modal, no autosave. _E§18_
- ◐ **28. Event lifecycle guards** — DONE: `EventService` enforces a
  status-transition map on both `changeStatus()` (`PATCH /events/{id}/status`)
  and any `status` slipped through `updateEvent()` (`PUT /events/{id}`); invalid
  moves → 422. Covered by `EventStatusTransitionTest`. STILL OPEN: reconcile the
  stored `status` with `calculateDynamicStatus()` so catalogue / detail /
  dashboard / reports never disagree. _E§21_
- ☐ **29. Capacity visibility & over-capacity handling** — show capacity /
  confirmed / pending / waitlisted / available / utilisation %; explicit
  over-capacity warning; block new confirmations while over capacity; never
  auto-cancel confirmed. _E§22_

### On-site
- ☐ **30. Check-in UI states** — large visual SUCCESS / DUPLICATE / INVALID /
  REVOKED / WRONG EVENT / CANCELLED / NOT ELIGIBLE; rich participant panel
  (name, employee ID, reg #, department, event, time, gate, status). Keep
  duplicate detection + undo. _E§25_

---

## TIER 3 — Admin, dashboard & reporting

- ☐ **31. Global admin search** — events / registration number / participant /
  employee ID / email / phone; grouped results; permission-filtered (never show
  unauthorized results). None today (only per-event check-in search). _PRD
  (deferred) · E§30_
- ☐ **32. Event command-centre tabs** — add a per-event **Staff** tab and a
  per-event **Audit** tab; event header with status/date/venue/capacity/
  registrations/waitlist/check-ins. _E§28_
- ☐ **33. Event Readiness checklist** — surface the existing
  `DashboardService::readiness()` as a per-event checklist with % and no
  misleading "ready" when critical config is missing. _E§29_
- ☐ **34. Reports expansion** — department breakdown, no-show, form-answers,
  dedicated waitlist / check-in report views (have: status, capacity util,
  by-date, source). _PRD §48 · E§31_
- ☐ **35. Export correctness** — CSV/PDF must respect the table filters + the
  caller's permissions, use event timezone, consistent column naming, include
  **dynamic answers**, protect sensitive fields, stream large sets, and be
  **audited**. Today: streamed but unfiltered, no answers, not audited. _PRD §48
  · E§32_
- ☐ **36. User management UI + endpoints** — create / edit / activate / disable /
  assign global role / assign+remove event role / force password reset /
  last-login / status. Prevent escalation (event_admin ≠ create super_admin —
  already guarded on create). Add a `last_login` column. No frontend today.
  _E§33_
- ☐ **37. Event staff assignment screen** — assign owner / manager / organizer /
  registration officer / check-in staff / viewer per event; enforce in backend
  authz (ties to item 9). No endpoints/UI today. _PRD §39 · E§34_
- ☐ **38. Organization settings UI** — name, logo, timezone, contact, branding.
  _PRD §76_
- ☐ **39. Multi-organization scoping** — actually scope queries by
  `organization_id` (columns exist, unused). _PRD §77_
- ❌ **40. Notification template editor UI** — **OUT OF SCOPE** (depends on the
  retired notification engine). _PRD §75/§35_
- ☐ **41. Calendar view** — month/week calendar of events. _PRD §41_
- ◐ **42. Location map** — `map_url` now renders as a link; add embedded map /
  use `latitude`/`longitude`. _PRD §40_
- ◐ **43. Admin UX polish** — replace remaining `alert()` / `confirm()` (~10
  modules) with the existing `ConfirmDialog`; add breadcrumbs, empty/loading
  states, validation feedback, keyboard nav, a11y. _PRD §33 · E§35_

---

## TIER 4 — Production readiness

- ◐ **44. Environment separation** — add staging/testing env configs; keep prod
  `APP_DEBUG=false` (Docker already does). _E§36_
- ☐ **45. `DEPLOYMENT.md`** — Apache/Nginx + PHP 8.3+ + MySQL 8 + HTTPS; required
  PHP extensions; filesystem permissions; only `backend/public` web-accessible.
  _E§38_
- ◐ **46. Database account hardening** — dedicated least-privilege grant
  (`rhb_events_app`), documented; `.env.xampp` currently uses `root`; MySQL not
  publicly exposed. _E§39_
- ☐ **47. Secrets hygiene** — remove hard-coded `APP_KEY` and DB passwords from
  `docker-compose.yml`; ship `.env.example` only. _E§41_
- ◐ **48. Backup strategy** — extend the manual dump/restore guide to scheduled
  daily backup, encryption, retention, and a **verified** restore procedure.
  _PRD §89 · E§42_
- ☐ **49. Split logging** — separate application / security / audit log channels;
  never log passwords or tokens; useful request/error context; request IDs.
  _PRD §88 · E§43_
- ☐ **50. Monitoring hooks** — vendor-neutral surface for 500s, slow endpoints,
  failed jobs, DB failures, disk, uptime, suspicious logins. _E§44_
- ☐ **51. Performance pass** — N+1 sweep with EXPLAIN across dashboard,
  registration search, reports, attendance lists, exports, catalogue; paginate /
  eager-load / index / cache-where-safe. _E§45_
- ◐ **52. Index review** — audit indexes vs. the E§46 list (status, start_at,
  registration dates, participant email/employee_id, registration_number,
  registration/attendance status, event_id, waitlist ordering, ticket token).
  Some added in `2026_09_07_000001_add_dashboard_indexes`. _E§46_
- ☐ **53. Consistent API error envelope** — `{ message, errors, code }`; proper
  403/404/419/422/429/500; friendly frontend rendering; never leak stack traces
  or paths. _E§47_
- ☐ **54. Expand test suite** — the E§48 list: Authentication, Authorization,
  EventPolicy, EventStaffAuthorization, ManualRegistration, DuplicateRegistration,
  TicketSecurity, Attendance, UploadSecurity, ReportPermission, AuditLog,
  RateLimit (+ existing Capacity, Waitlist, CheckIn). _PRD §92–94 · E§48_
- ◐ **55. Docs set** — DONE: `SECURITY.md`, `RBAC-MATRIX.md`, `PROJECT.md`.
  OPEN: `DEPLOYMENT.md` / production install guide (#38), testing guide, README
  refresh. _E§52_

---

## TIER 5 — Housekeeping / doc drift

- ✅ **56. README seed-account claim** — `DatabaseSeeder` now creates all five
  accounts (added `organizer@` / `registration@`) and assigns them to the demo
  Blood Donation event's `event_staff`. README table is now accurate. (No
  `viewer` account — not in the README list.)
- ☐ **57. `system_settings` table** — use it (app settings) or drop it; model
  exists, zero reads/writes.
- ☐ **58. Refresh / archive stale docs** — `stack.md` (describes Blade/Apache/
  Excel — wrong) and `implementation.md` (says "React 18 / nginx / storage:link"
  — now React 19, single Laravel app, symlink-free `/storage` route).

---

## Already done — do not redo (reference)

- ✅ Route-level RBAC middleware tiers (`routes/api.php`) + frontend `ROLE_TIERS`
  mirror + route guards
- ✅ Public `/auth/register` locked to `participant`; `POST /users` staff creation
  with "only super_admin makes super_admin" guard
- ✅ Rate limiting on login / register / public register / lookup / cancel /
  media upload (gaps remain — item 13)
- ✅ CORS allowlist via env; Sanctum token expiry (480 min)
- ✅ Server-side registration-answer validation
- ✅ Demo quick-login switcher removed from `LoginPage`
- ✅ Per-event "scan to register" QR (`EventQrModal`) — _PRD §80_
- ✅ Reusable **registration-form** templates (`form_templates`, controller, 6
  seeded, builder load/save + manager modal)
- ✅ Consolidated dashboard (`GET /dashboard/overview` + `DashboardService` + ~18
  widgets + index migration) — _E§27_
- ✅ Registration list: pagination + status/attendance/free-text search
- ✅ Single Laravel app serving the built SPA; symlink-free `/storage` route;
  committed `vendor/`; single Docker port; XAMPP install kit + `events.sql`
- ✅ Dedicated Docker DB user (`events_user`, not root)
- ✅ Backup folder + manual dump/restore guide (extend — item 48)
- ✅ `map_url` rendered as a link (embed still pending — item 42)
- ✅ `ConfirmDialog` component exists (adopt everywhere — item 43)
- ✅ EventNex → RHB "Events" rebrand complete; SPA build verification / catch-all
  routing — _E§51_
- ✅ CI pipeline (`.github/workflows/ci.yml`) + Pint-clean baseline + runnable
  test suite (2026-09-09, item 3)

---

## Suggested execution order

1. **Tier 0** — item 2 (item 1 retired, item 3 ✅).
2. **Tier 1 auth + authz core** — items 4, 9, 10, 11, 12, 14 (6 ◐, 17 ◐).
3. **Tier 1 remainder** — items 5, 15, 16 (13 ✅); MFA/SSO seams (7, 8) as design-only if time-boxed.
4. **Tier 2** — items 18, 20, 22, 35 first (unblock admin ops + export trust), then 23–30.
5. **Tier 3** — items 31, 32, 36, 37 (search + user/staff management), then the rest.
6. **Tier 4** — items 45, 47, 53, 54, 55 before any staging sign-off; 49–52 for production.
7. **Tier 5** — fold into whichever PR touches the area.
