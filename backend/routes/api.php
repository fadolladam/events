<?php

use App\Modules\Attendance\AttendanceController;
use App\Modules\Audit\AuditController;
use App\Modules\Auth\AuthController;
use App\Modules\CheckIn\CheckInController;
use App\Modules\Dashboard\DashboardController;
use App\Modules\Events\EventCategoryController;
use App\Modules\Events\EventController;
use App\Modules\Events\EventTemplateController;
use App\Modules\Forms\FormBuilderController;
use App\Modules\Forms\FormTemplateController;
use App\Modules\Media\MediaController;
use App\Modules\Notifications\NotificationController;
use App\Modules\Registration\ParticipantController;
use App\Modules\Registration\RegistrationController;
use App\Modules\Reports\ReportController;
use App\Modules\Tickets\TicketController;
use App\Modules\Waitlist\WaitlistController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Role tiers
|--------------------------------------------------------------------------
| RoleMiddleware ('role' alias) lets super_admin through unconditionally,
| so it is omitted from the lists below.
|
| Declared with guarded define() rather than `const` because the test
| runner boots the application (and re-includes this file) more than once
| per process; a bare `const` would fatal with "already defined".
*/
defined('ROLE_STAFF') || define('ROLE_STAFF', 'role:event_admin,event_organizer,registration_officer,checkin_staff,viewer');
defined('ROLE_EVENT_MANAGER') || define('ROLE_EVENT_MANAGER', 'role:event_admin,event_organizer');
defined('ROLE_REGISTRATION') || define('ROLE_REGISTRATION', 'role:event_admin,event_organizer,registration_officer');
defined('ROLE_CHECKIN') || define('ROLE_CHECKIN', 'role:event_admin,event_organizer,registration_officer,checkin_staff');
defined('ROLE_ADMIN') || define('ROLE_ADMIN', 'role:event_admin');

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

// Public Authentication (rate limited against brute force / abuse)
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:5,1');

// Public Events & Categories
Route::get('/public/events', [EventController::class, 'publicEvents']);
Route::get('/public/events/{slug}', [EventController::class, 'showPublicBySlug']);
Route::get('/public/categories', [EventCategoryController::class, 'index']);

// Public Registration
Route::post('/public/events/{eventId}/register', [RegistrationController::class, 'registerPublic'])->middleware('throttle:15,1');
Route::post('/public/registration/lookup', [RegistrationController::class, 'lookup'])->middleware('throttle:10,1');
Route::get('/public/registration/{token}', [RegistrationController::class, 'showPublicBySecureToken']);
Route::post('/public/registration/{token}/cancel', [RegistrationController::class, 'cancelPublic'])->middleware('throttle:10,1');

// Public QR Ticket
Route::get('/public/ticket/{token}', [TicketController::class, 'showPublicByToken'])->middleware('throttle:30,1');
Route::get('/public/ticket/{token}/qr', [TicketController::class, 'getQrImage'])->middleware('throttle:60,1');

/*
|--------------------------------------------------------------------------
| Protected Administration & Operation Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Available to any authenticated account (incl. participant)
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/password', [AuthController::class, 'changePassword'])->middleware('throttle:10,1');

    /*
    | Read-only console access — every staff role
    */
    Route::middleware([ROLE_STAFF, 'event.scope'])->group(function () {
        Route::get('/dashboard/stats', [ReportController::class, 'globalStats']);
        Route::get('/dashboard/overview', [DashboardController::class, 'overview']);
        Route::get('/events/{eventId}/analytics', [ReportController::class, 'eventStats']);

        Route::get('/events', [EventController::class, 'index']);
        Route::get('/events/{id}', [EventController::class, 'show']);

        Route::get('/categories', [EventCategoryController::class, 'index']);
        Route::get('/templates', [EventTemplateController::class, 'index']);
        Route::get('/events/{eventId}/form', [FormBuilderController::class, 'show']);

        // Reusable registration-form templates (read)
        Route::get('/forms/templates', [FormTemplateController::class, 'index']);
        Route::get('/forms/templates/{id}', [FormTemplateController::class, 'show']);
    });

    /*
    | Event authoring & configuration — admins & organizers
    */
    Route::middleware([ROLE_EVENT_MANAGER, 'event.scope'])->group(function () {
        Route::post('/events', [EventController::class, 'store']);
        Route::put('/events/{id}', [EventController::class, 'update']);
        Route::post('/events/{id}/duplicate', [EventController::class, 'duplicate']);
        Route::patch('/events/{id}/status', [EventController::class, 'setStatus']);

        Route::post('/categories', [EventCategoryController::class, 'store']);
        Route::post('/templates', [EventTemplateController::class, 'store']);

        Route::post('/media/upload', [MediaController::class, 'uploadImage'])->middleware('throttle:30,1');

        Route::put('/events/{eventId}/form', [FormBuilderController::class, 'update']);

        // Reusable registration-form templates (write)
        Route::post('/forms/templates', [FormTemplateController::class, 'store']);
        Route::put('/forms/templates/{id}', [FormTemplateController::class, 'update']);
        Route::delete('/forms/templates/{id}', [FormTemplateController::class, 'destroy']);

        Route::get('/events/{eventId}/export/csv', [ReportController::class, 'exportCsv'])->middleware('throttle:20,1');
        Route::get('/events/{eventId}/export/pdf', [ReportController::class, 'exportPdf'])->middleware('throttle:20,1');

        Route::get('/notifications/templates', [NotificationController::class, 'templates']);
        Route::post('/notifications/templates', [NotificationController::class, 'storeTemplate']);
        Route::get('/notifications/logs', [NotificationController::class, 'logs']);
    });

    /*
    | Registration & waitlist decisions — adds registration officers
    */
    Route::middleware([ROLE_REGISTRATION, 'event.scope'])->group(function () {
        // Cross-event participant directory (not event-scoped).
        Route::get('/participants', [ParticipantController::class, 'index']);
        Route::get('/participants/lookup', [ParticipantController::class, 'lookup'])->middleware('throttle:60,1');
        Route::get('/participants/{id}', [ParticipantController::class, 'show']);

        Route::get('/events/{eventId}/registrations', [RegistrationController::class, 'indexForEvent']);
        Route::post('/events/{eventId}/registrations', [RegistrationController::class, 'storeManual'])->middleware('throttle:60,1');
        Route::post('/events/{eventId}/registrations/bulk', [RegistrationController::class, 'bulk'])->middleware('throttle:30,1');
        Route::post('/events/{eventId}/registrations/import', [RegistrationController::class, 'import'])->middleware('throttle:10,1');
        Route::get('/registrations/{id}', [RegistrationController::class, 'show']);
        Route::patch('/registrations/{id}', [RegistrationController::class, 'updateNotes']);
        Route::post('/registrations/{id}/approve', [RegistrationController::class, 'approve']);
        Route::post('/registrations/{id}/reject', [RegistrationController::class, 'reject']);
        Route::post('/registrations/{id}/cancel', [RegistrationController::class, 'cancelByAdmin']);
        Route::post('/registrations/{id}/reissue-ticket', [RegistrationController::class, 'reissueTicket']);

        Route::get('/events/{eventId}/waitlist', [WaitlistController::class, 'indexForEvent']);
        Route::get('/events/{eventId}/waitlist/history', [WaitlistController::class, 'history']);
        Route::post('/events/{eventId}/waitlist/promote', [WaitlistController::class, 'promoteManual']);
        Route::patch('/waitlist/{registrationId}/priority', [WaitlistController::class, 'updatePriority']);
    });

    /*
    | Onsite operations — adds check-in staff
    */
    Route::middleware([ROLE_CHECKIN, 'event.scope'])->group(function () {
        // Generous limits — a busy gate scans continuously on event day.
        Route::post('/events/{eventId}/checkin/scan', [CheckInController::class, 'scan'])->middleware('throttle:240,1');
        Route::post('/events/{eventId}/checkin', [CheckInController::class, 'process'])->middleware('throttle:240,1');
        Route::post('/events/{eventId}/checkin/undo', [CheckInController::class, 'undo'])->middleware('throttle:120,1');
        Route::get('/events/{eventId}/checkin/search', [CheckInController::class, 'search'])->middleware('throttle:120,1');
        Route::get('/events/{eventId}/checkin/recent', [CheckInController::class, 'recentCheckins']);

        Route::get('/events/{eventId}/attendance', [AttendanceController::class, 'index']);
        Route::post('/events/{eventId}/attendance/mark', [AttendanceController::class, 'markAttendance']);
        Route::post('/events/{eventId}/attendance/bulk', [AttendanceController::class, 'bulkMark'])->middleware('throttle:30,1');
    });

    /*
    | Governance — super_admin & event_admin only
    */
    Route::middleware(ROLE_ADMIN)->group(function () {
        Route::delete('/events/{id}', [EventController::class, 'destroy']);

        Route::get('/audit-logs', [AuditController::class, 'index']);

        Route::get('/users', [AuthController::class, 'users']);
        Route::post('/users', [AuthController::class, 'storeUser'])->middleware('throttle:20,1');
        Route::post('/users/{id}/force-password-reset', [AuthController::class, 'forcePasswordReset'])->middleware('throttle:20,1');
    });
});
