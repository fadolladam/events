<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\User;
use App\Modules\Registration\RegistrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventListPerformanceTest extends TestCase
{
    use RefreshDatabase;

    private function seedEvents(int $n, int $start = 0): void
    {
        $svc = app(RegistrationService::class);
        for ($i = $start; $i < $start + $n; $i++) {
            $e = Event::create([
                'title' => "Perf Event {$i}", 'slug' => "perf-{$i}", 'event_code' => "PERF{$i}",
                'start_at' => now()->addDays(3), 'end_at' => now()->addDays(3)->addHours(2),
                'capacity' => 20, 'approval_mode' => 'automatic', 'status' => 'registration_open',
            ]);
            $svc->register($e->id, ['name' => "P{$i}", 'email' => "p{$i}@t.com"]);
        }
    }

    private function queryCountFor(callable $fn): int
    {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $fn();
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    }

    public function test_event_list_query_count_does_not_grow_with_the_number_of_events(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'A', 'email' => 'a@rhbgroup.com', 'password' => Hash::make('x'),
            'role' => 'event_admin', 'status' => 'active',
        ]));

        $this->seedEvents(3);
        $small = $this->queryCountFor(fn () => $this->getJson('/api/events?per_page=25')->assertOk());

        $this->seedEvents(12, 3); // 15 total
        $large = $this->queryCountFor(fn () => $this->getJson('/api/events?per_page=25')->assertOk());

        // withCount folds the per-row counts into the page query — the count
        // must not scale with rows (allow a tiny constant slack).
        $this->assertLessThanOrEqual($small + 2, $large, "event list N+1: {$small} -> {$large} queries");
        $this->assertLessThan(12, $large);
    }
}
