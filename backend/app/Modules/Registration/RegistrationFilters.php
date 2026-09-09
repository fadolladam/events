<?php

namespace App\Modules\Registration;

use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Http\Request;

/**
 * The registration-table filter set, shared by the console list endpoint and
 * the CSV export so "export" always matches what the officer is looking at.
 */
class RegistrationFilters
{
    public static function apply(Builder $query, Request $request): Builder
    {
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('attendance_status')) {
            $query->where('attendance_status', $request->input('attendance_status'));
        }

        if ($request->filled('checked_in')) {
            $yes = filter_var($request->input('checked_in'), FILTER_VALIDATE_BOOL);
            $query->where('attendance_status', $yes ? '=' : '!=', 'checked_in');
        }

        if ($request->filled('department')) {
            $dept = $request->input('department');
            $query->whereHas('participant', fn ($q) => $q->where('department', 'like', "%{$dept}%"));
        }

        if ($request->filled('date_from')) {
            $query->where('registered_at', '>=', $request->date('date_from')->startOfDay());
        }
        if ($request->filled('date_to')) {
            $query->where('registered_at', '<=', $request->date('date_to')->endOfDay());
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('registration_number', 'like', "%{$search}%")
                    ->orWhereHas('participant', function ($pq) use ($search) {
                        $pq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%")
                            ->orWhere('employee_id', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }
}
