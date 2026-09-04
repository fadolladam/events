<?php

use App\Modules\Audit\AuditController;
use App\Modules\Auth\AuthController;
use App\Modules\Auth\RoleMiddleware;
use App\Modules\Attendance\AttendanceController;
use App\Modules\CheckIn\CheckInController;
use App\Modules\Events\EventCategoryController;
use App\Modules\Events\EventController;
use App\Modules\Events\EventTemplateController;
use App\Modules\Forms\FormBuilderController;
use App\Modules\Notifications\NotificationController;
use App\Modules\Registration\RegistrationController;
use App\Modules\Reports\ReportController;
use App\Modules\Tickets\TicketController;
use App\Modules\Waitlist\WaitlistController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

// Public Authentication
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Public Events & Categories
Route::get('/public/events', [EventController::class, 'publicEvents']);
Route::get('/public/events/{slug}', [EventController::class, 'showPublicBySlug']);
Route::get('/public/categories', [EventCategoryController::class, 'index']);

// Public Registration
Route::post('/public/events/{eventId}/register', [RegistrationController::class, 'registerPublic']);
Route::post('/public/registration/lookup', [RegistrationController::class, 'lookup']);
Route::get('/public/registration/{token}', [RegistrationController::class, 'showPublicBySecureToken']);
Route::post('/public/registration/{token}/cancel', [RegistrationController::class, 'cancelPublic']);

// Public QR Ticket
Route::get('/public/ticket/{token}', [TicketController::class, 'showPublicByToken']);
Route::get('/public/ticket/{token}/qr', [TicketController::class, 'getQrImage']);

/*
|--------------------------------------------------------------------------
| Protected Administration & Operation Routes
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Current Authenticated User
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Global Dashboard & Reports
    Route::get('/dashboard/stats', [ReportController::class, 'globalStats']);
    Route::get('/events/{eventId}/analytics', [ReportController::class, 'eventStats']);
    Route::get('/events/{eventId}/export/csv', [ReportController::class, 'exportCsv']);
    Route::get('/events/{eventId}/export/pdf', [ReportController::class, 'exportPdf']);

    // Event Management
    Route::get('/events', [EventController::class, 'index']);
    Route::get('/events/{id}', [EventController::class, 'show']);
    Route::post('/events', [EventController::class, 'store']);
    Route::put('/events/{id}', [EventController::class, 'update']);
    Route::post('/events/{id}/duplicate', [EventController::class, 'duplicate']);
    Route::patch('/events/{id}/status', [EventController::class, 'setStatus']);
    Route::delete('/events/{id}', [EventController::class, 'destroy']);

    // Categories & Templates
    Route::get('/categories', [EventCategoryController::class, 'index']);
    Route::post('/categories', [EventCategoryController::class, 'store']);
    Route::get('/templates', [EventTemplateController::class, 'index']);
    Route::post('/templates', [EventTemplateController::class, 'store']);

    // Dynamic Form Builder
    Route::get('/events/{eventId}/form', [FormBuilderController::class, 'show']);
    Route::put('/events/{eventId}/form', [FormBuilderController::class, 'update']);

    // Registrations & Waitlist Management
    Route::get('/events/{eventId}/registrations', [RegistrationController::class, 'indexForEvent']);
    Route::get('/registrations/{id}', [RegistrationController::class, 'show']);
    Route::post('/registrations/{id}/approve', [RegistrationController::class, 'approve']);
    Route::post('/registrations/{id}/reject', [RegistrationController::class, 'reject']);
    Route::post('/registrations/{id}/cancel', [RegistrationController::class, 'cancelByAdmin']);

    // Waitlist Queue
    Route::get('/events/{eventId}/waitlist', [WaitlistController::class, 'indexForEvent']);
    Route::get('/events/{eventId}/waitlist/history', [WaitlistController::class, 'history']);
    Route::post('/events/{eventId}/waitlist/promote', [WaitlistController::class, 'promoteManual']);
    Route::patch('/waitlist/{registrationId}/priority', [WaitlistController::class, 'updatePriority']);

    // QR Scanner & Check-In Operations
    Route::post('/events/{eventId}/checkin/scan', [CheckInController::class, 'scan']);
    Route::post('/events/{eventId}/checkin', [CheckInController::class, 'process']);
    Route::post('/events/{eventId}/checkin/undo', [CheckInController::class, 'undo']);
    Route::get('/events/{eventId}/checkin/search', [CheckInController::class, 'search']);
    Route::get('/events/{eventId}/checkin/recent', [CheckInController::class, 'recentCheckins']);

    // Attendance Management
    Route::get('/events/{eventId}/attendance', [AttendanceController::class, 'index']);
    Route::post('/events/{eventId}/attendance/mark', [AttendanceController::class, 'markAttendance']);

    // Notifications
    Route::get('/notifications/templates', [NotificationController::class, 'templates']);
    Route::post('/notifications/templates', [NotificationController::class, 'storeTemplate']);
    Route::get('/notifications/logs', [NotificationController::class, 'logs']);

    // Audit Logs
    Route::get('/audit-logs', [AuditController::class, 'index']);

    // User Management (Super Admin & Event Admin)
    Route::get('/users', [AuthController::class, 'users']);
});
