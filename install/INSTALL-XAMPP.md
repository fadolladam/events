# Running RHB Events on XAMPP

The app is one Laravel application: the API **and** the pre-built React SPA are
served from `backend/`. You do **not** need Node.js — the compiled frontend is
already committed under `backend/public/`.

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| **XAMPP** | with **PHP 8.3+** | The common XAMPP ships PHP 8.2 — download the **8.3.x** build. Check with `php -v`. |
| **Composer** | 2.x | Not bundled with XAMPP — install from <https://getcomposer.org/download/>. |
| **Git** | any | To clone the repo. |

XAMPP already includes the PHP extensions this app needs (`pdo_mysql`, `gd`,
`zip`, `mbstring`, `openssl`, `curl`, `bcmath`, `fileinfo`). If `php -m` is
missing `gd` or `zip`, enable them in `php.ini` and restart Apache.

---

## 2. Get the code

```bash
git clone https://github.com/fadolladam/events.git
cd events/backend
```

---

## 3. Configure

```bash
cp .env.xampp .env
```

`.env.xampp` is pre-filled for XAMPP defaults (MySQL on `127.0.0.1:3306`,
user `root`, empty password) and carries a fixed local `APP_KEY`, so there is
no key-generation step. Edit `.env` if your MySQL differs.

```bash
composer install
```

---

## 4. Database

Start **MySQL** in the XAMPP control panel, then create the database — open
**phpMyAdmin** (<http://localhost/phpmyadmin>) → *New* → name it **`events`**.

Then load the schema and demo data, either way:

**A. Artisan (recommended)**
```bash
php artisan migrate --seed
```

**B. phpMyAdmin import** — in phpMyAdmin select the `events` database → *Import*
→ choose `install/events.sql` → *Go*.

Both give you the same five logins (all password **`password123`**):

| Role | Email |
|------|-------|
| Super Admin | `adam.fadhlullah@rhbgroup.com` |
| Event Admin | `manager@rhbgroup.com` |
| Event Organizer | `organizer@rhbgroup.com` |
| Registration Officer | `registration@rhbgroup.com` |
| Check-In Staff | `staff@rhbgroup.com` |

---

## 5. Run it

**Simplest — PHP's built-in server** (use XAMPP only for MySQL):

```bash
php artisan serve --host=127.0.0.1 --port=8000
```

Open <http://localhost:8000>.

There are convenience scripts in the repo root: `serve.sh` (macOS/Linux) or
`serve.bat` (Windows) — they copy `.env` if needed and start the server.

**Or — serve through XAMPP's Apache.** Add a virtual host whose `DocumentRoot`
is the **`backend/public`** folder, enable `mod_rewrite`, restart Apache, and
open the host you configured. Laravel's `public/.htaccess` handles the rest.
(If you instead drop the project inside `htdocs`, set `APP_URL` to the full
sub-path and expect to fight base URLs — a vhost at the web root is far
simpler.)

---

## Notes

- **No `php artisan storage:link` needed.** Uploaded event images are served by
  a route in the app, so the symlink (which needs elevated rights on Windows)
  is optional.
- **Frontend changes** need a one-off rebuild by someone with Node:
  `cd frontend && npm ci && npm run build` (outputs into `backend/public/`).
- **Zero-database alternative:** set `DB_CONNECTION=sqlite` in `.env`,
  `touch database/database.sqlite`, then `php artisan migrate --seed` — no
  MySQL or phpMyAdmin at all.
- `APP_DEBUG=true` in `.env.xampp` shows full error pages while you set up.
  Turn it off (and regenerate `APP_KEY`) before exposing the app to anyone.
