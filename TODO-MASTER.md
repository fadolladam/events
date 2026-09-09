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
| 2026-09-09 | #29 Capacity visibility | ✅ over-capacity banner + `available_seats`/`over_capacity`/`utilisation_pct` on `GET /events/{id}`. `EventCapacitySnapshotTest`. |
| 2026-09-09 | #30 Check-in states | ✅ `QrScannerConsole` shows SUCCESS/DUPLICATE/INVALID/REVOKED/WRONG EVENT/CANCELLED/NOT ELIGIBLE as a large card + participant panel; backend messages mapped client-side. |
| 2026-09-09 | #21 CSV import | ✅ `RegistrationImportService` shared by the artisan command + `POST /events/{id}/registrations/import` (dry-run, 2000-row cap, audited); `RegistrationImportModal`. `RegistrationImportTest`. |
| 2026-09-09 | #19 Participant directory | ✅ `GET /participants` + `/lookup` + `/{id}`; `/admin/participants` page + drawer + nav; manual-reg autocomplete. `ParticipantDirectoryTest`. Suite: 69. |
| 2026-09-09 | #24 Conditional form logic | ✅ `ConditionalLogic` (PHP + TS); builder UI + wizard/manual-reg live hide + server skip of hidden fields. `ConditionalFieldLogicTest`. |
| 2026-09-09 | #25 Form-builder UX | ✅ drag/drop reorder, live preview, duplicate-key guard (client + `distinct:ignore_case`). `FormBuilderGuardTest`. |
| 2026-09-09 | #26 Event templates | ✅ 8-template `EventTemplateSeeder`; `GET /templates/{id}` + `POST /events/{id}/save-as-template`; wizard picker + "Save as template". `EventTemplateTest`. |
| 2026-09-09 | #27 Wizard | ◐ per-step validation + localStorage draft autosave + staff-assignment step; `EventStaffController` (GET/PUT `/events/{id}/staff`) + `GET /users/assignable`. `EventStaffTest`. **Tier 2 complete.** Suite: 81. |
| 2026-09-09 | #32 + #37 Team/Audit tabs | ✅ per-event Team + Audit tabs, `GET /events/{id}/audit-logs`, header strip. `EventAuditTabTest`. |
| 2026-09-09 | #31 Global search | ✅ `GET /search` grouped + permission-filtered; `GlobalSearch` in the shell. `GlobalSearchTest`. |
| 2026-09-09 | #34 + #35 Reports/export | ◐ `RegistrationFilters` shared; CSV gains answer columns + tz + filter-respect + audited filters; `departments` + `answer_summary` in `eventStats`. `ReportExportTest`. OPEN: PDF parity, dedicated waitlist/checkin report views. |
| 2026-09-09 | #36 User management | ✅ `PATCH /users/{id}` + `/admin/users` page (list/edit/create/force-reset/last-login). `UserManagementTest`. |
| 2026-09-09 | #33/#41/#42 | ✅ per-event readiness checklist on Overview; `/admin/calendar` month view; OpenStreetMap embed on the public event page. **Tier 3: 7 done / 3 partial; only #38, #39 open.** Suite: 94. |
| 2026-09-09 | #38 Org settings | ✅ `OrganizationController` GET/PUT `/organization` (governance); `/admin/settings` page. `OrganizationSettingsTest`. |
| 2026-09-09 | #39 Multi-org scoping | ✅ `User::scopedOrgId()`; `EventScopeMiddleware` rejects out-of-org events (event_admin included), and `events` list / search / participants / dashboards filter by the caller's org; new events inherit the creator's org. `MultiOrgScopingTest`. |
| 2026-09-09 | #34/#35 PDF + #43 | ✅ PDF export = filters + tz + dept/answers + audited filters; every `alert()`/`confirm()` swept onto `toast()` / `confirmDialog()` (new `uiFeedback` + `FeedbackHost`). **Tier 3 complete.** Suite: 100. |
| 2026-09-09 | #44–#48 + #55 Prod ops & docs | ✅ `.env.docker.example` + secret-free `docker-compose.yml` (fails without `APP_KEY`, MySQL bound to loopback); `DEPLOYMENT.md`; `install/db-grant.sql` least-privilege grant; `install/backup.sh` (GPG + retention, refuses plaintext) + `install/restore-verify.sh`; `TESTING.md`; README run-paths refresh. |
| 2026-09-09 | #53 API error envelope | ✅ `ApiErrorResponse::make()` via `withExceptions()->render()` — `{message, code, errors?}`, correct 403/404/419/422/429/500, generic 404, traces debug-only; `RoleMiddleware`/`EventScopeMiddleware` `abort()` through it; frontend 401+419 interceptor. `ApiErrorEnvelopeTest`. |
| 2026-09-09 | #49 + #50 Observability | ✅ split `security`/`audit`/`performance` log channels; `AuditService` mirrors security actions; `RequestContext` middleware (`X-Request-Id`, shared context, slow-request warning); `GET /api/health` (governance) with db/cache checks + login-failure/lockout/disk signals, 503 when degraded. `ObservabilityTest`. |
| 2026-09-09 | #51 + #52 Perf & indexes | ✅ killed the event-list N+1 (`withCount` on `index`/`publicEvents`); `EventListPerformanceTest` (fixed query count vs. dataset size); `2026_09_09_000002_add_query_hotpath_indexes` (waitlist order, answer lookups, audit tab, event_staff, checkin time). |
| 2026-09-09 | #54 Expand test suite | ✅ `RbacMatrixTest` (endpoint × 6 roles + no-auth), `DuplicateRegistrationTest`, `AttendanceTest`, `RateLimitTest`; rest of the E§48 list already covered by existing suites. **Tier 4 complete.** Suite: 152. |
| 2026-09-09 | #57 + #58 Housekeeping | ✅ dropped the never-used `system_settings` table (reversible migration + model removed); rewrote `stack.md` to the real stack; archived superseded reports (`audit.md`, `debug.md`, `qa-report.md`, `GAP-REPORT*.md`) into `docs/archive/`. **Tier 5 complete.** Suite: 152. |

---

## Tier status

| Tier | Done | Partial | Open / N-A |
|---|---|---|---|
| **0 Blockers** | #2, #3 | — | #1 ❌ retired — **TIER COMPLETE** |
| **1 Security** | #4, #5, #6, #9, #10, #11, #13, #14, #15 | #7, #8, #16, #17 | #12 |
| **2 Core** | #19–#27, #29, #30 | #18(timeline), #23(file), #27(10-step), #28(dyn-status) | — **TIER COMPLETE** |
| **3 Admin/Dash** | #31–#33, #35–#39, #41–#43 | #34(dedicated waitlist/checkin report views) | #40 ❌ — **TIER COMPLETE** |
| **4 Production** | #37(CI), #44–#55 | — | — **TIER COMPLETE** |
| **5 Housekeeping** | #56, #57, #58 | — | — **TIER COMPLETE** |

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
- ✅ **11. RBAC permission matrix** — `RBAC-MATRIX.md` (endpoint × role ×
  event-scope, authoritative next to `routes/api.php`) **and** `RbacMatrixTest`
  (every protected endpoint × 6 staff roles + unauthenticated, asserting the
  authz outcome 200-ish / 403 / 401). _E§6, §49_

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
- ◐ **17. Expand audit trail** — DONE: `user_login_failed`,
  `user_login_locked_out`, `event_deleted` (hard-delete path), `report_exported`
  (csv + pdf), `user_updated`, `event_staff_updated`, `organization_updated`,
  `event_template_created`, `registration_manual_created`,
  `attendance_status_updated` + `attendance_bulk_updated`. Split `audit` /
  `security` log channels mirror these (#49). Already existed: `user_login`,
  `user_logout`, `user_registered`, `user_created`, event
  create/update/status/duplicate, registration created/cancelled,
  participant_promoted, waitlist_priority_changed, check-in create/reverse.
  STILL OPEN: DB-level guard so normal admins cannot modify/delete `audit_logs`
  rows. _PRD §49 · E§15_

---

## TIER 2 — Core function improvements

### Registrations & participants
- ◐ **18. Registration Detail** — DONE: `PATCH /registrations/{id}` (edit
  internal note) + `POST /registrations/{id}/reissue-ticket` (revoke + fresh
  QR); UI note editor (save-on-blur) + reissue button in the expanded row.
  OPEN: a full status-history timeline in the UI (backend `show` already
  returns `statusHistory`). _PRD §37_
- ✅ **19. Global Participant Management + employee search** —
  `ParticipantController` (registration tier): `GET /participants` (deduped
  directory, `registrations_count`, search over name/email/phone/employee_id/
  department), `GET /participants/lookup` (lean 2-char type-ahead),
  `GET /participants/{id}` (full cross-event history). `/admin/participants`
  page + detail drawer + nav item; ManualRegistrationModal autocompletes from
  the directory and prefills an existing person. `ParticipantDirectoryTest`.
  (Corporate-directory-API seam: a future provider slots in behind
  `/participants/lookup`.) _PRD §36 · E§17_
- ✅ **20. Bulk actions** — `POST /events/{id}/registrations/bulk`
  (approve/reject/cancel a selection, each through the shared locked service
  path, `skipped[]` for bad ids, audited) + `POST /events/{id}/attendance/bulk`.
  UI: row checkboxes + select-all + a bulk action bar. `RegistrationOpsTest`.
  (Export-selected folds into #35.) _PRD §82 · E§24, §26_
- ✅ **21. CSV import (endpoint + UI)** — `RegistrationImportService` (CSV parse
  + import loop) lifted out of the artisan command and shared with
  `POST /events/{id}/registrations/import` (registration tier, event-scoped,
  dry-run flag, 2000-row cap, audited). Every row still goes through
  `RegistrationService::register()`. `RegistrationImportModal` (file picker +
  "validate only" + per-row failure list). `RegistrationImportTest`. _PRD §83_
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
- ✅ **24. Conditional form logic** — `conditional_logic` = `{field, operator:
  equals/not_equals/in/contains, value}`. `App\Modules\Forms\ConditionalLogic` +
  `conditionalLogic.ts` (shared eval). Builder UI ("only show when <prior choice
  field> is/is not <option>"); wizard + manual-reg hide non-matching fields live
  and submit only visible answers; `validateFormAnswers` skips hidden fields.
  `ConditionalFieldLogicTest`. _PRD §63 · E§20_
- ✅ **25. Form-builder UX** — HTML5 drag-and-drop on the field handle (no lib);
  case-insensitive duplicate-key detection (highlights rows, blocks Save,
  `distinct:ignore_case` server-side); "Preview" toggle renders the participant
  form honouring conditions. `FormBuilderGuardTest`. _E§20_

### Events
- ✅ **26. Event templates** — `EventTemplateSeeder`: 8 built-ins
  (badminton/football/blood-drive/marathon/townhall/training/seminar/client-
  dinner/family-day), each `structure` = {defaults, form_fields}. `GET
  /templates/{id}` + `POST /events/{id}/save-as-template` (snapshots settings +
  form). Wizard "Start from a template" prefills + applies the form.
  "Save as template" button on the event console. `EventTemplateTest`. _PRD §42 ·
  E§19_
- ◐ **27. Event creation wizard** — DONE: per-step validation gates Next
  (title / future dates / capacity); draft autosave to localStorage with
  "Resume draft / Start fresh"; a staff-assignment picker in Review, applied via
  `PUT /events/{id}/staff` (new `EventStaffController` + `GET /users/assignable`
  — also the backend for #34). `EventStaffTest`. OPEN: a full 10-screen wizard
  was not pursued (the 4-step + template + staff flow covers the intent). _E§18_
- ◐ **28. Event lifecycle guards** — DONE: `EventService` enforces a
  status-transition map on both `changeStatus()` (`PATCH /events/{id}/status`)
  and any `status` slipped through `updateEvent()` (`PUT /events/{id}`); invalid
  moves → 422. Covered by `EventStatusTransitionTest`. STILL OPEN: reconcile the
  stored `status` with `calculateDynamicStatus()` so catalogue / detail /
  dashboard / reports never disagree. _E§21_
- ✅ **29. Capacity visibility & over-capacity handling** — Overview tab already
  showed the capacity/confirmed/pending/waitlisted/available KPI row +
  utilisation bar; added an explicit over-capacity warning banner and
  `available_seats` / `over_capacity` / `utilisation_pct` on `GET /events/{id}`.
  New confirmations already queue while over capacity, confirmed rows are never
  auto-dropped (`RegistrationService`). `EventCapacitySnapshotTest`. _E§22_

### On-site
- ✅ **30. Check-in UI states** — `QrScannerConsole` resolves each scan to
  SUCCESS / DUPLICATE / INVALID / REVOKED / WRONG EVENT / CANCELLED /
  NOT ELIGIBLE as a large colour-coded card with a participant panel (name,
  reg #, employee ID, department) + time; backend messages mapped client-side.
  Duplicate detection + undo unchanged. _E§25_

---

## TIER 3 — Admin, dashboard & reporting

- ✅ **31. Global admin search** — `GET /search?q=` (SearchController, staff
  tier) → grouped {events, registrations, participants}, permission-filtered
  (org-wide vs assigned events only). `GlobalSearch` in the admin shell header.
  `GlobalSearchTest`. _E§30_
- ✅ **32. Event command-centre tabs** — per-event **Team** tab + **Audit** tab
  (`GET /events/{id}/audit-logs`, event-scoped) added to `EVENT_TABS`; compact
  header strip (date/venue/capacity/waitlist/checked-in) on every tab.
  `EventAuditTabTest`. _E§28_
- ✅ **33. Event Readiness checklist** — `GET /events/{id}` returns a 10-item
  `readiness` checklist (details / schedule / reg window / form / capacity /
  venue / team / check-in staff / branding / published) with %, each item
  honest; rendered at the top of the Overview tab. _E§29_
- ◐ **34. Reports expansion** — DONE: `departments` + `answer_summary` in
  `eventStats`, rendered in `EventReportsPage` and the PDF; no-show shown.
  `ReportExportTest`. OPEN: dedicated read-only waitlist / check-in report
  *views* (the Queue + Attendance tabs cover the operational need). _PRD §48 ·
  E§31_
- ◐ **35. Export correctness** — DONE: shared `RegistrationFilters`; **both**
  CSV and PDF honour the console filters, carry a column/section per form
  field (+ employee_id / department), render dates in the event timezone, and
  the audit entry records the applied filters. "Export CSV/PDF" buttons on the
  Registrations tab. `ReportExportTest`. OPEN: review streaming for very large
  sets. _PRD §48 · E§32_
- ✅ **36. User management** — `PATCH /users/{id}` (name/phone/role/status, no
  escalation, no self-lockout, deactivate drops tokens, audited) alongside the
  existing create + force-reset + `last_login_at`. `/admin/users` page:
  list/filter/search, create + edit drawers, force-reset, last-login column.
  `UserManagementTest`. (Per-event roles live on the #37 Team tab.) _E§33_
- ✅ **37. Event staff assignment screen** — `EventStaffController`
  (GET/PUT `/events/{id}/staff`, full-team sync, audited, participants ignored)
  + `GET /users/assignable`; the **Team** tab on the event console. Assigning
  someone grants event-scope access immediately (ties to #9). `EventStaffTest`.
  _PRD §39 · E§34_
- ✅ **38. Organization settings** — `OrganizationController` GET/PUT
  `/organization` (governance): name, logo, default timezone, country, contact,
  brand colours; audited. `/admin/settings` page. `OrganizationSettingsTest`.
  _PRD §76_
- ✅ **39. Multi-organization scoping** — `User::scopedOrgId()` (null for
  super_admin / no-org accounts). `EventScopeMiddleware` rejects an event
  outside the caller's org (event_admin included); `GET /events`, `/search`,
  `/participants*`, and both dashboards filter by it; new events inherit the
  creator's `organization_id`. `MultiOrgScopingTest`. _PRD §77_
- ❌ **40. Notification template editor UI** — **OUT OF SCOPE** (depends on the
  retired notification engine). _PRD §75/§35_
- ☐ **41. Calendar view** — month/week calendar of events. _PRD §41_
- ✅ **42. Location map** — `PublicEventDetail` embeds an OpenStreetMap iframe
  from the event's lat/lng (plus the existing link); CSP `frame-src` allows
  only openstreetmap.org. _PRD §40_
- ✅ **43. Admin UX polish** — new `components/uiFeedback` (`toast()` +
  `confirmDialog()` backed by one `<FeedbackHost>`); every `window.alert` /
  `window.confirm` across 11 modules swept onto it. (Breadcrumbs / broader
  a11y not pursued.) _PRD §33 · E§35_

---

## TIER 4 — Production readiness

- ✅ **44. Environment separation** — `.env.docker.example` (prod-shaped, no
  secrets), `.env.example` documents the SPA/session/CORS knobs; Docker keeps
  `APP_DEBUG=false`; `docker-compose.yml` fails fast without `APP_KEY`. _E§36_
- ✅ **45. `DEPLOYMENT.md`** — Apache/Nginx + PHP 8.3+ + MySQL 8 + HTTPS, PHP
  extensions, filesystem perms, only `backend/public` web-accessible, SPA build
  step, health check. _E§38_
- ✅ **46. Database account hardening** — `install/db-grant.sql` (dedicated
  least-privilege `rhb_events_app` grant); MySQL bound to `127.0.0.1` in Compose;
  documented in `DEPLOYMENT.md`. _E§39_
- ✅ **47. Secrets hygiene** — `docker-compose.yml` reads `APP_KEY` /
  DB creds / stateful-domains from the environment (no literals); ships
  `.env.docker.example` only. _E§41_
- ✅ **48. Backup strategy** — `install/backup.sh` (GPG-encrypted daily dump,
  retention sweep, refuses to write plaintext) + `install/restore-verify.sh`
  (restore into a scratch DB and assert row counts). `DEPLOYMENT.md` cron entry.
  _PRD §89 · E§42_
- ✅ **49. Split logging** — `security` (90d) / `audit` (180d) / `performance`
  (14d) daily channels; `AuditService` mirrors to audit + (for security actions)
  security; `RequestContext` middleware adds `X-Request-Id`, shared log context,
  and a slow-request (`>=1500ms`) warning. `ObservabilityTest`. _PRD §88 · E§43_
- ✅ **50. Monitoring hooks** — `GET /api/health` (governance) reports
  database / cache checks + `login_failures_1h`, `lockouts_1h`, `disk_used_pct`
  signals, 503 when degraded. `ObservabilityTest`. _E§44_
- ✅ **51. Performance pass** — killed the event-list N+1 (`withCount` for
  confirmed / waitlist / checked-in instead of per-row counts) on `index` +
  `publicEvents`; `EventListPerformanceTest` asserts a fixed query count across
  growing datasets. _E§45_
- ✅ **52. Index review** — `2026_09_09_000002_add_query_hotpath_indexes`
  (waitlist FIFO order, `registration_answers(registration_id,field_key)`,
  per-event + action audit-log, `event_staff(user_id,event_id)`, checkin time);
  auth-hardening columns migration for `last_login_at` etc. _E§46_
- ✅ **53. Consistent API error envelope** — `ApiErrorResponse::make()` wired via
  `withExceptions()->render()`; `{message, code, errors?}` with correct
  403/404/419/422/429/500, generic 404 message, stack traces only in debug;
  `RoleMiddleware` / `EventScopeMiddleware` now `abort()` through the envelope.
  Frontend interceptor handles 401 + 419. `ApiErrorEnvelopeTest`. _E§47_
- ✅ **54. Expand test suite** — `RbacMatrixTest` (endpoint × 6 roles +
  unauthenticated), `DuplicateRegistrationTest` (email/phone/employee_id/none),
  `AttendanceTest` (single + bulk + scope + audit), `RateLimitTest` (route
  throttles). Existing suites cover Authentication/Authorization/EventStaffAuth/
  ManualRegistration/TicketSecurity/UploadSecurity/CheckIn/Capacity/Waitlist/
  ReportPermission/AuditLog. Suite: 152. _PRD §92–94 · E§48_
- ✅ **55. Docs set** — `SECURITY.md`, `RBAC-MATRIX.md`, `PROJECT.md`,
  `DEPLOYMENT.md`, `TESTING.md`, README run-paths refresh. _E§52_

---

## TIER 5 — Housekeeping / doc drift

- ✅ **56. README seed-account claim** — `DatabaseSeeder` now creates all five
  accounts (added `organizer@` / `registration@`) and assigns them to the demo
  Blood Donation event's `event_staff`. README table is now accurate. (No
  `viewer` account — not in the README list.)
- ✅ **57. `system_settings` table** — DROPPED. Never read or written;
  organisation config lives on the `organizations` row.
  `2026_09_09_000003_drop_unused_system_settings_table` (reversible), `SystemSetting`
  model deleted, `PROJECT.md` schema table updated.
- ✅ **58. Refresh / archive stale docs** — `stack.md` rewritten to the real
  stack (React 19 SPA / Vite / DOMPDF + native CSV / notifications out of scope /
  Docker+XAMPP) with a "what changed from the original sketch" table. Superseded
  point-in-time docs (`audit.md`, `debug.md`, `qa-report.md`, `GAP-REPORT*.md`)
  moved to `docs/archive/` with an index README; `PROJECT.md` references fixed.
  (`implementation.md` / `implementations-2.md` were already deleted at merge.)

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
