<?php

use App\Modules\Audit\AuditController;
use App\Modules\Auth\AuthController;
use App\Modules\Attendance\AttendanceController;
use App\Modules\CheckIn\CheckInController;
use App\Modules\Dashboard\DashboardController;
use App\Modules\Events\EventCategoryController;
use App\Modules\Events\EventController;
use App\Modules\Events\EventTemplateController;
use App\Modules\Forms\FormBuilderController;
use App\Modules\Forms\FormTemplateController;
use App\Modules\Media\MediaController;
use App\Modules\Notifications\NotificationController;
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
*/
const ROLE_STAFF = 'role:event_admin,event_organizer,registration_officer,checkin_staff,viewer';
const ROLE_EVENT_MANAGER = 'role:event_admin,event_organizer';
const ROLE_REGISTRATION = 'role:event_admin,event_organizer,registration_officer';
const ROLE_CHECKIN = 'role:event_admin,event_organizer,registration_officer,checkin_staff';
const ROLE_ADMIN = 'role:event_admin';

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
Route::get('/public/ticket/{token}', [TicketController::class, 'showPublicByToken']);
Route::get('/public/ticket/{token}/qr', [TicketController::class, 'getQrImage']);

/*
|--------------------------------------------------------------------------
| Protected Administration & Operation Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Available to any authenticated account (incl. participant)
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    /*
    | Read-only console access — every staff role
    */
    Route::middleware(ROLE_STAFF)->group(function () {
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
    Route::middleware(ROLE_EVENT_MANAGER)->group(function () {
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

        Route::get('/events/{eventId}/export/csv', [ReportController::class, 'exportCsv']);
        Route::get('/events/{eventId}/export/pdf', [ReportController::class, 'exportPdf']);

        Route::get('/notifications/templates', [NotificationController::class, 'templates']);
        Route::post('/notifications/templates', [NotificationController::class, 'storeTemplate']);
        Route::get('/notifications/logs', [NotificationController::class, 'logs']);
    });

    /*
    | Registration & waitlist decisions — adds registration officers
    */
    Route::middleware(ROLE_REGISTRATION)->group(function () {
        Route::get('/events/{eventId}/registrations', [RegistrationController::class, 'indexForEvent']);
        Route::get('/registrations/{id}', [RegistrationController::class, 'show']);
        Route::post('/registrations/{id}/approve', [RegistrationController::class, 'approve']);
        Route::post('/registrations/{id}/reject', [RegistrationController::class, 'reject']);
        Route::post('/registrations/{id}/cancel', [RegistrationController::class, 'cancelByAdmin']);

        Route::get('/events/{eventId}/waitlist', [WaitlistController::class, 'indexForEvent']);
        Route::get('/events/{eventId}/waitlist/history', [WaitlistController::class, 'history']);
        Route::post('/events/{eventId}/waitlist/promote', [WaitlistController::class, 'promoteManual']);
        Route::patch('/waitlist/{registrationId}/priority', [WaitlistController::class, 'updatePriority']);
    });

    /*
    | Onsite operations — adds check-in staff
    */
    Route::middleware(ROLE_CHECKIN)->group(function () {
        Route::post('/events/{eventId}/checkin/scan', [CheckInController::class, 'scan']);
        Route::post('/events/{eventId}/checkin', [CheckInController::class, 'process']);
        Route::post('/events/{eventId}/checkin/undo', [CheckInController::class, 'undo']);
        Route::get('/events/{eventId}/checkin/search', [CheckInController::class, 'search']);
        Route::get('/events/{eventId}/checkin/recent', [CheckInController::class, 'recentCheckins']);

        Route::get('/events/{eventId}/attendance', [AttendanceController::class, 'index']);
        Route::post('/events/{eventId}/attendance/mark', [AttendanceController::class, 'markAttendance']);
    });

    /*
    | Governance — super_admin & event_admin only
    */
    Route::middleware(ROLE_ADMIN)->group(function () {
        Route::delete('/events/{id}', [EventController::class, 'destroy']);

        Route::get('/audit-logs', [AuditController::class, 'index']);

        Route::get('/users', [AuthController::class, 'users']);
        Route::post('/users', [AuthController::class, 'storeUser']);
    });
});
