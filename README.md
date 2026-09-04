# EventNex: Multi-Event Registration, FIFO Waitlist Queue, QR Ticketing & Check-In Platform

EventNex is a modular, production-grade event management platform built according to [prd.md](file:///Users/fadolla-mini/Developer/events/prd.md) and [stack.md](file:///Users/fadolla-mini/Developer/events/stack.md).

The codebase is strictly separated into **`backend/`** and **`frontend/`** and designed with a **decoupled, standalone feature module architecture**.

---

## Project Structure

```
events/
├── backend/                       # Laravel 11+ / PHP 8.x REST API & Service Layer
│   ├── app/
│   │   ├── Models/                # Eloquent Models (Event, Registration, Ticket, Checkin, Attendance, etc.)
│   │   └── Modules/               # Standalone, decoupled domain modules
│   │       ├── Auth/              # Authentication, Sanctum tokens, RoleMiddleware
│   │       ├── Events/            # Event CRUD, Status lifecycle, Categories, Templates
│   │       ├── Forms/             # Dynamic Form Builder & versioning
│   │       ├── Registration/      # Atomic concurrency-safe registration (SELECT FOR UPDATE)
│   │       ├── Waitlist/          # Automated FIFO Queue & promotion engine
│   │       ├── Tickets/           # Cryptographic QR ticket generation (Bacon/SimpleSoftwareIO)
│   │       ├── CheckIn/           # Mobile QR camera check-in, duplicate detection, undo
│   │       ├── Attendance/        # Attendee presence & no-show tracking
│   │       ├── Notifications/     # Notification templates & dispatch logs
│   │       ├── Reports/           # Analytics, CSV exports & PDF report generation (DOMPDF)
│   │       └── Audit/             # Immutable audit trail logger
│   ├── database/
│   │   ├── migrations/            # Normalized MySQL/MariaDB database tables
│   │   └── seeders/               # Pre-seeded demo accounts & sample events (BD26, TH26, etc.)
│   ├── routes/api.php             # Modular REST API endpoints
│   └── tests/Feature/             # Automated test suite (Capacity, Waitlist, CheckIn)
│
├── frontend/                      # Modern React / TypeScript / Tailwind CSS Single Page App
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/              # Admin Login & demo account fast-switcher
│   │   │   ├── public/            # Public Event Catalog, Category Filter, Event Detail
│   │   │   ├── registration/      # Dynamic Step-by-step Registration Wizard
│   │   │   ├── participant/       # Self-Service Portal (`/my-registration/{token}`)
│   │   │   ├── ticket/            # Public QR Ticket Pass (`/ticket/{token}`)
│   │   │   ├── admin/             # Global Dashboard, Event Management & 4-step Creation Wizard
│   │   │   ├── forms/             # Visual Dynamic Form Builder Modal
│   │   │   ├── queue/             # Live Waitlist & FIFO Queue Console
│   │   │   ├── checkin/           # Mobile-first QR Camera Scanner & Manual Lookup
│   │   │   ├── attendance/        # Attendance Roster & Status Management
│   │   │   ├── reports/           # Event Analytics, CSV & PDF Export Triggers
│   │   │   └── audit/             # Immutable Audit Log Viewer
│   │   ├── components/            # Layouts and reusable UI primitives
│   │   └── services/api.ts        # Typed API client and models
│   └── package.json
│
├── prd.md                         # Product Requirements Document
└── stack.md                       # Technology Stack Specification
```

---

## Docker Quickstart (`events`)

You can launch the entire stack (Database, Backend API, and Frontend) in Docker with one command:

```bash
# Build and start all containers in background
docker compose up -d --build
```

### Containers Created:
- **`events-frontend`**: Web application served by Nginx on **`http://localhost:5173`** and **`http://localhost:8080`**.
- **`events-backend`**: Laravel 11 API on **`http://localhost:8000`**.
- **`events-db`**: MySQL 8.0 database with persistent volume `events_db_data`.

To view logs or stop:
```bash
# View live logs
docker compose logs -f

# Stop containers
docker compose down
```

---

## Local Manual Setup (Without Docker)
```bash
cd backend

# 1. Install dependencies
composer install

# 2. Setup environment
cp .env.example .env
php artisan key:generate

# 3. Run database migrations & seed demo data
php artisan migrate:fresh --seed

# 4. Start backend server
php artisan serve --port=8000
```

### 2. Frontend Setup (React + Tailwind)
```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start frontend dev server
npm run dev
```

The frontend will run on **`http://localhost:5173`** and proxy all API calls automatically to **`http://localhost:8000`**.

---

## Pre-seeded Demo Accounts

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `superadmin@eventnex.com` | `password123` |
| **Event Admin** | `manager@eventnex.com` | `password123` |
| **Check-In Staff** | `staff@eventnex.com` | `password123` |

---

## Running Automated Tests

Run the full PHPUnit feature test suite covering concurrency safety, waitlist FIFO promotion, permanent numbering, and QR check-in:

```bash
cd backend
php artisan test
```
