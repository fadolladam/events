#!/bin/sh
set -e

# Copy .env if not present
if [ ! -f .env ]; then
  cp .env.example .env
fi

# Sync key runtime settings from the container environment into .env.
# `php artisan serve` propagates the .env FILE to its HTTP worker, so values
# passed only as container env vars (e.g. DB_CONNECTION) would otherwise be
# ignored by web requests while CLI commands still see them.
sync_env() {
  key="$1"
  val="$2"
  [ -z "$val" ] && return 0
  # Quote values containing a space so dotenv keeps them intact.
  case "$val" in
    *" "*) val="\"${val}\"" ;;
  esac
  if grep -q "^${key}=" .env; then
    sed -i "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}
sync_env APP_NAME "$APP_NAME"
sync_env APP_ENV "$APP_ENV"
sync_env APP_KEY "$APP_KEY"
sync_env CORS_ALLOWED_ORIGINS "$CORS_ALLOWED_ORIGINS"
sync_env SANCTUM_TOKEN_EXPIRATION "$SANCTUM_TOKEN_EXPIRATION"
sync_env APP_DEBUG "$APP_DEBUG"
sync_env APP_URL "$APP_URL"
sync_env DB_CONNECTION "$DB_CONNECTION"
sync_env DB_HOST "$DB_HOST"
sync_env DB_PORT "$DB_PORT"
sync_env DB_DATABASE "$DB_DATABASE"
sync_env DB_USERNAME "$DB_USERNAME"
sync_env DB_PASSWORD "$DB_PASSWORD"

# Generate an APP_KEY only if one was neither baked into .env nor passed in.
if ! grep -q "APP_KEY=base64:" .env; then
  php artisan key:generate --force
fi

# Wait for MySQL if DB_CONNECTION is mysql
if [ "$DB_CONNECTION" = "mysql" ]; then
  echo "Waiting for MySQL database at $DB_HOST:$DB_PORT..."
  until nc -z -v -w30 "$DB_HOST" "$DB_PORT"; do
    echo "MySQL is unavailable - sleeping 2s"
    sleep 2
  done
  echo "MySQL is up and available."
fi

# Public storage symlink (for device-uploaded images served at /storage/*)
if [ ! -e public/storage ]; then
  php artisan storage:link || true
fi
mkdir -p storage/app/public/event-covers storage/app/public/event-banners
chmod -R 775 storage/app/public || true

# Run database migrations and seeders
echo "Running database migrations..."
php artisan migrate --force

echo "Seeding initial data (if needed)..."
SEEDED_USERS=$(php artisan tinker --execute="echo \App\Models\User::count();" 2>/dev/null | tr -dc '0-9')
if [ -z "$SEEDED_USERS" ] || [ "$SEEDED_USERS" = "0" ]; then
  php artisan db:seed --force || true
else
  echo "Database already has ${SEEDED_USERS} users - skipping seed."
fi

echo "Starting RHB Events backend server on port 8000..."
exec php artisan serve --host=0.0.0.0 --port=8000
