@echo off
REM Start RHB Events (Laravel serves the API and the pre-built SPA together).
REM Windows. Full setup: install\INSTALL-XAMPP.md

cd /d "%~dp0backend"

if not exist ".env" (
  echo Creating .env from .env.xampp
  copy /y ".env.xampp" ".env" >nul
)
if not exist "vendor" (
  echo Installing PHP dependencies...
  call composer install
)

echo RHB Events -^> http://localhost:8000
php artisan serve --host=127.0.0.1 --port=8000
