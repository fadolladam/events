# Testing — RHB Events

## Backend (PHPUnit)

The committed `backend/vendor/` is `--no-dev`, so pull the dev tools first:

```bash
cd backend
composer install                 # restores phpunit, mockery, pint…
php artisan test                 # sqlite :memory:, config from phpunit.xml
php artisan test --filter=EventScopeAuthorizationTest
vendor/bin/pint --test           # code style (CI gate)
```

`phpunit.xml` sets `APP_ENV=testing`, `DB_CONNECTION=sqlite`,
`DB_DATABASE=:memory:`, `MAIL_MAILER=array`, `QUEUE_CONNECTION=sync`. No `.env`
is read for tests.

### What's covered (`backend/tests/Feature/`)

| Area | File |
|---|---|
| Capacity / concurrency, no overbooking | `CapacityConcurrencyTest` |
| Waitlist FIFO promotion | `WaitlistPromotionTest` |
| QR check-in + duplicate + undo | `CheckInTest` |
| Event status transitions | `EventStatusTransitionTest` |
| Audit trail (login-fail, delete, export) | `AuditTrailTest` |
| Manual registration | `ManualRegistrationTest` |
| Bulk actions, reissue, notes | `RegistrationOpsTest` |
| CSV import | `RegistrationImportTest` |
| Form field types + conditional logic | `FormFieldTypesTest`, `ConditionalFieldLogicTest` |
| Form-builder guards | `FormBuilderGuardTest` |
| Event templates | `EventTemplateTest` |
| Event staff / per-event authz | `EventStaffTest`, `EventScopeAuthorizationTest` |
| Multi-org isolation | `MultiOrgScopingTest` |
| Global search | `GlobalSearchTest` |
| Per-event audit tab | `EventAuditTabTest` |
| Report export (CSV + PDF, filters, tz) | `ReportExportTest` |
| Capacity snapshot | `EventCapacitySnapshotTest` |
| Participant directory | `ParticipantDirectoryTest` |
| User management | `UserManagementTest`, `PasswordManagementTest` |
| Security headers | `SecurityHeadersTest` |
| Login throttle / lockout | `LoginThrottleTest` |
| Upload hardening | `UploadSecurityTest` |
| Ticket security | `TicketSecurityTest` |
| SPA session/cookie auth | `SpaSessionAuthTest` |
| Org settings | `OrganizationSettingsTest` |

### Writing a test

- `use RefreshDatabase;`
- `Sanctum::actingAs($user)` for authenticated endpoints; a user with no
  `organization_id` skips org scoping.
- Service-level tests instantiate via `app(RegistrationService::class)` and
  assert on models; HTTP tests use `$this->getJson()` / `postJson()`.

## Frontend

```bash
cd frontend
npm ci
npm run lint          # oxlint (CI gate)
npm run build         # tsc -b + vite build → backend/public/  (CI gate)
```

There is no component test suite yet; `tsc` + lint + a green production build
are the frontend gates.

## CI

`.github/workflows/ci.yml` runs on every push / PR:

- **backend** — PHP 8.3, `composer install` (with dev), `php artisan test`,
  `pint --test`
- **frontend** — Node 22, `npm ci`, `npm run lint`, `npm run build`, then a
  check that `backend/public/index.html` + `assets/` were produced

A failing job blocks the merge.
