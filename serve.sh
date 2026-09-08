#!/bin/sh
# Start RHB Events (Laravel serves the API and the pre-built SPA together).
# macOS / Linux. Windows: use serve.bat. Full setup: install/INSTALL-XAMPP.md
set -e
cd "$(dirname "$0")/backend"

[ -f .env ] || { echo "Creating .env from .env.xampp"; cp .env.xampp .env; }
[ -d vendor ] || { echo "Installing PHP dependencies..."; composer install; }

echo "RHB Events -> http://localhost:8000"
exec php artisan serve --host=127.0.0.1 --port=8000
