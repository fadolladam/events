# Deployment — RHB Events

One Laravel app serves the JSON API **and** the compiled React SPA from the same
origin. `backend/public/` (built SPA) and `backend/vendor/` (`--no-dev`) are
committed, so a release needs **no Node and no Composer** on the server.

---

## 1. Environments

| Env | `APP_ENV` | `APP_DEBUG` | Config source |
|---|---|---|---|
| Local | `local` | `true` | `backend/.env` (from `.env.example`) or `.env.xampp` |
| Testing | `testing` | — | `backend/phpunit.xml` (`<php>` block; sqlite `:memory:`) — no file to manage |
| Staging | `production` | `false` | same as production, separate host + DB + `APP_KEY` |
| Production | `production` | `false` | `.env` on the host / `.env.docker` (never committed) |

**Never** run with `APP_DEBUG=true` outside local — it leaks stack traces,
queries and paths. The Docker image already sets `APP_ENV=production` /
`APP_DEBUG=false`; a bare-metal deploy must set them in `.env`.

The demo seeders (`DatabaseSeeder`, `FreshProjectSeeder`) **refuse to run when
`APP_ENV=production`** — they plant `password123` accounts. In production run
migrations only and create the first admin via the API / `php artisan tinker`.

---

## 2. Requirements

- **PHP 8.3+** with: `pdo_mysql`, `mbstring`, `openssl`, `tokenizer`, `xml`,
  `ctype`, `json`, `bcmath`, `fileinfo`, `gd` (image validation on upload),
  `zip`, `curl`.
- **MySQL 8** (or MariaDB 10.6+). SQLite works for a tiny single-node install.
- A web server — **Nginx** or **Apache** — terminating **HTTPS**.
- No queue worker or cron is required (notifications are out of scope; there is
  no scheduler). If you add background work later, run `php artisan queue:work`
  and `php artisan schedule:run` via systemd / cron.

---

## 3. Database account

Do **not** use the MySQL `root` account for the app. Create a least-privilege
user (see [`install/db-grant.sql`](install/db-grant.sql)):

```sql
CREATE USER 'rhb_events_app'@'%' IDENTIFIED BY '<strong>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES,
      CREATE TEMPORARY TABLES, LOCK TABLES ON events.* TO 'rhb_events_app'@'%';
```

MySQL's port must **not** be reachable from the internet — bind it to
`127.0.0.1` or a private network. The bundled `docker-compose.yml` already
publishes it as `127.0.0.1:3306` only.

---

## 4. Secrets

Nothing secret is committed. Before any real deploy:

- **`APP_KEY`** — generate once: `php artisan key:generate --show` (or, with
  Docker, `docker compose run --rm events-backend php artisan key:generate --show`).
  `docker-compose.yml` has **no default** for it — the stack refuses to start
  without it.
- **DB credentials** — the strong `rhb_events_app` password.
- Copy [`.env.docker.example`](.env.docker.example) → `.env` (Docker) or
  [`backend/.env.example`](backend/.env.example) → `backend/.env` (bare metal)
  and fill them in. Keep `.env` out of version control (it already is).

Production `.env` musts:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://events.example.com
SESSION_SECURE_COOKIE=true
SESSION_SAME_SITE=lax
SANCTUM_STATEFUL_DOMAINS=events.example.com
CORS_ALLOWED_ORIGINS=https://events.example.com
SECURITY_HSTS=true
```

---

## 5. Option A — Docker

```bash
cp .env.docker.example .env          # then edit it
docker compose run --rm events-backend php artisan key:generate --show   # paste into .env
docker compose up -d --build
docker compose exec events-backend php artisan migrate --force
```

App on the port `docker-compose.yml` publishes (default `5173→8000`). Put a
TLS-terminating reverse proxy (Nginx / Caddy / a load balancer) in front and
set `APP_URL` / `SANCTUM_STATEFUL_DOMAINS` / `CORS_ALLOWED_ORIGINS` to that
hostname.

Uploaded images persist in the `events_backend_uploads` volume; the DB in
`events_db_data`.

---

## 6. Option B — Nginx + PHP-FPM (bare metal)

Only **`backend/public/`** may be web-accessible.

```nginx
server {
    listen 443 ssl http2;
    server_name events.example.com;
    root /srv/rhb-events/backend/public;
    index index.php;

    ssl_certificate     /etc/letsencrypt/live/events.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/events.example.com/privkey.pem;

    client_max_body_size 6m;   # matches the 5 MB image-upload rule + overhead

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* { deny all; }
}

server {
    listen 80;
    server_name events.example.com;
    return 301 https://$host$request_uri;
}
```

Deploy steps:

```bash
git clone <repo> /srv/rhb-events && cd /srv/rhb-events/backend
cp .env.example .env      # edit: APP_ENV=production, APP_KEY, DB_*, session/CORS
php artisan key:generate  # if APP_KEY still blank
php artisan migrate --force
php artisan config:cache route:cache
chown -R www-data:www-data storage bootstrap/cache
```

`storage/` and `bootstrap/cache/` must be writable by the PHP user. No
`storage:link` needed — uploaded images are served by a route.

For **Apache**, point the vhost `DocumentRoot` at `backend/public` with
`mod_rewrite` enabled (the repo ships `backend/public/.htaccess`).

---

## 7. Releasing an update

```bash
git pull
cd backend && php artisan migrate --force
php artisan config:cache route:cache   # bare metal
# Docker: docker compose up -d --build && docker compose exec events-backend php artisan migrate --force
```

A **frontend** change also needs the SPA rebuilt into `backend/public/`
(`cd frontend && npm ci && npm run build`) before the commit that ships it — CI
verifies the build published `index.html` + `assets/`.

---

## 8. Backups

See [`backend/database/backups/`](backend/database/backups/) for dump/restore
commands and [`install/backup.sh`](install/backup.sh) for a cron-friendly
encrypted daily backup with retention, plus `install/restore-verify.sh` to
prove a dump restores cleanly.

---

## 9. Post-deploy checklist

- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] `APP_KEY` set (not the repo default)
- [ ] DB user is `rhb_events_app` (not root); MySQL not internet-facing
- [ ] HTTPS only; `SESSION_SECURE_COOKIE=true`; HSTS on
- [ ] `SANCTUM_STATEFUL_DOMAINS` / `CORS_ALLOWED_ORIGINS` = the real hostname
- [ ] `curl -sI https://host/` shows the security headers (CSP, X-Frame-Options…)
- [ ] Log in, create an event, register on the public page, scan a ticket
- [ ] A backup has run and a restore has been verified
