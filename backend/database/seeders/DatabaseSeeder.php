<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\EventCategory;
use App\Models\EventStaff;
use App\Models\FormField;
use App\Models\Organization;
use App\Models\Participant;
use App\Models\Registration;
use App\Models\RegistrationAnswer;
use App\Models\RegistrationForm;
use App\Models\User;
use App\Models\WaitlistHistory;
use App\Modules\Tickets\TicketService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // This seeder plants well-known demo credentials (password123). Never in
        // production — run migrations only there and create accounts via the API.
        if (app()->isProduction()) {
            throw new \RuntimeException('DatabaseSeeder carries demo credentials and must not run in production.');
        }

        // Reusable registration-form templates (idempotent, safe on every boot)
        $this->call(FormTemplateSeeder::class);
        $this->call(EventTemplateSeeder::class);

        // 1. Organization
        $org = Organization::create([
            'name' => 'RHB Bank Berhad',
            'slug' => 'rhb-bank',
            'timezone' => 'Asia/Kuala_Lumpur',
            'country' => 'Malaysia',
            'contact_email' => 'events@rhbgroup.com',
            'contact_phone' => '+60 3-9280 8888',
        ]);

        // 2. Demo Users
        $superAdmin = User::create([
            'name' => 'Adam Fadhlullah',
            'email' => 'adam.fadhlullah@rhbgroup.com',
            'password' => Hash::make('password123'),
            'role' => 'super_admin',
            'organization_id' => $org->id,
            'phone' => '+60 12-100 0001',
            'status' => 'active',
        ]);

        $eventAdmin = User::create([
            'name' => 'Sarah Jenkins (Event Admin)',
            'email' => 'manager@rhbgroup.com',
            'password' => Hash::make('password123'),
            'role' => 'event_admin',
            'organization_id' => $org->id,
            'phone' => '+60 12-100 0002',
            'status' => 'active',
        ]);

        $eventOrganizer = User::create([
            'name' => 'Aidan Lim (Event Organizer)',
            'email' => 'organizer@rhbgroup.com',
            'password' => Hash::make('password123'),
            'role' => 'event_organizer',
            'organization_id' => $org->id,
            'phone' => '+60 12-100 0003',
            'status' => 'active',
        ]);

        $registrationOfficer = User::create([
            'name' => 'Priya Nair (Registration Officer)',
            'email' => 'registration@rhbgroup.com',
            'password' => Hash::make('password123'),
            'role' => 'registration_officer',
            'organization_id' => $org->id,
            'phone' => '+60 12-100 0004',
            'status' => 'active',
        ]);

        $checkinStaff = User::create([
            'name' => 'Marcus Vance (Check-In Staff)',
            'email' => 'staff@rhbgroup.com',
            'password' => Hash::make('password123'),
            'role' => 'checkin_staff',
            'organization_id' => $org->id,
            'phone' => '+60 12-100 0005',
            'status' => 'active',
        ]);

        // 3. Event Categories
        $categories = [
            ['name' => 'Blood Donation', 'slug' => 'blood-donation', 'color' => '#ef3e42', 'icon' => 'Heart'],
            ['name' => 'Corporate & Townhall', 'slug' => 'corporate', 'color' => '#0067b1', 'icon' => 'Building'],
            ['name' => 'Conference & Summit', 'slug' => 'conference', 'color' => '#5bc2e7', 'icon' => 'Users'],
            ['name' => 'Workshops & Training', 'slug' => 'workshop', 'color' => '#059669', 'icon' => 'BookOpen'],
            ['name' => 'Executive Dinner', 'slug' => 'dinner', 'color' => '#b8860b', 'icon' => 'Utensils'],
            ['name' => 'CSR & Community', 'slug' => 'csr', 'color' => '#0067b1', 'icon' => 'Globe'],
        ];

        $categoryModels = [];
        foreach ($categories as $cat) {
            $categoryModels[$cat['slug']] = EventCategory::create($cat);
        }

        // 4. Sample Event 1: Blood Donation Drive 2026 (From PRD Scenario)
        $bloodEvent = Event::create([
            'organization_id' => $org->id,
            'title' => 'Blood Donation Drive 2026',
            'short_title' => 'Blood Drive 2026',
            'slug' => 'blood-donation-drive-2026',
            'event_code' => 'BD26',
            'description' => 'Join our annual corporate Blood Donation Drive in partnership with the National Red Cross. Every donation saves up to three lives!',
            'short_description' => 'Annual corporate blood donation drive in partnership with Red Cross.',
            'category_id' => $categoryModels['blood-donation']->id,
            'event_type' => 'physical',
            'visibility' => 'public',
            'status' => 'registration_open',
            'cover_image_url' => 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1200&q=70',
            'attachments' => [
                ['label' => 'Donor Health Screening Form (PDF)', 'url' => 'https://www.rhbgroup.com/'],
                ['label' => 'RHB Centre Level 3 Floor Plan', 'url' => 'https://www.rhbgroup.com/'],
            ],
            'organizer_name' => 'Corporate Social Responsibility & HR Team',
            'owner_user_id' => $eventAdmin->id,
            'contact_name' => 'Sarah Jenkins',
            'contact_email' => 'blood-drive@rhbgroup.com',
            'contact_phone' => '+60 3-9280 1234',
            'start_at' => now()->addDays(14)->setTime(9, 0),
            'end_at' => now()->addDays(14)->setTime(17, 0),
            'timezone' => 'Asia/Kuala_Lumpur',
            'registration_open_at' => now()->subDays(5),
            'registration_close_at' => now()->addDays(13),
            'capacity' => 70,
            'waitlist_enabled' => true,
            'waitlist_capacity' => 30,
            'approval_mode' => 'automatic',
            'allow_cancellation' => true,
            'cancellation_deadline' => now()->addDays(12),
            'duplicate_rule' => 'email',
            'venue_name' => 'RHB Centre - Level 3 Auditorium',
            'address' => 'Jalan Tun Razak',
            'city' => 'Kuala Lumpur',
            'province' => 'Wilayah Persekutuan',
            'country' => 'Malaysia',
            'postal_code' => '50400',
            'latitude' => 3.161563,
            'longitude' => 101.718216,
            'primary_color' => '#ef3e42',
            'secondary_color' => '#f16265',
            'terms_and_conditions' => 'Participants must be at least 18 years old, weigh at least 50kg, and have had adequate rest before donating blood.',
            'created_by' => $superAdmin->id,
            'published_at' => now()->subDays(5),
        ]);

        EventStaff::create(['event_id' => $bloodEvent->id, 'user_id' => $eventAdmin->id, 'role' => 'owner']);
        EventStaff::create(['event_id' => $bloodEvent->id, 'user_id' => $eventOrganizer->id, 'role' => 'organizer']);
        EventStaff::create(['event_id' => $bloodEvent->id, 'user_id' => $registrationOfficer->id, 'role' => 'registration_officer']);
        EventStaff::create(['event_id' => $bloodEvent->id, 'user_id' => $checkinStaff->id, 'role' => 'checkin_staff']);

        // Form for Blood Donation
        $bloodForm = RegistrationForm::create([
            'event_id' => $bloodEvent->id,
            'title' => 'Blood Donation Registration Form',
            'description' => 'Please fill out your health and contact details.',
            'is_active' => true,
        ]);

        $bloodFields = [
            ['field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true, 'field_order' => 1],
            ['field_key' => 'email', 'label' => 'Email Address', 'type' => 'email', 'is_required' => true, 'field_order' => 2],
            ['field_key' => 'phone', 'label' => 'Phone Number', 'type' => 'phone', 'is_required' => true, 'field_order' => 3],
            ['field_key' => 'employee_id', 'label' => 'Employee ID', 'type' => 'text', 'is_required' => false, 'field_order' => 4],
            ['field_key' => 'department', 'label' => 'Department', 'type' => 'select', 'is_required' => false, 'field_order' => 5, 'options' => ['Engineering', 'Marketing', 'Human Resources', 'Finance', 'Operations', 'Sales', 'External Guest']],
            ['field_key' => 'blood_type', 'label' => 'Blood Type', 'type' => 'select', 'is_required' => true, 'field_order' => 6, 'options' => ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']],
            ['field_key' => 'previous_donor', 'label' => 'Have you donated blood in the past 6 months?', 'type' => 'radio', 'is_required' => true, 'field_order' => 7, 'options' => ['Yes', 'No']],
            ['field_key' => 'preferred_time', 'label' => 'Preferred Time Slot', 'type' => 'select', 'is_required' => true, 'field_order' => 8, 'options' => ['09:00 - 11:00 AM', '11:00 - 01:00 PM', '02:00 - 04:00 PM', '04:00 - 05:00 PM']],
        ];

        foreach ($bloodFields as $f) {
            FormField::create(array_merge($f, ['form_id' => $bloodForm->id]));
        }

        // Seed 70 Confirmed Registrations + 5 Waitlisted Registrations
        $ticketService = app(TicketService::class);

        for ($i = 1; $i <= 75; $i++) {
            $isConfirmed = $i <= 70;
            $seqPad = str_pad((string) $i, 6, '0', STR_PAD_LEFT);
            $regNum = "EVT-BD26-2026-{$seqPad}";

            $participant = Participant::create([
                'name' => "Donor Participant {$i}",
                'email' => "donor{$i}@example.com",
                'phone' => '+1 (555) 200-'.str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                'country' => 'United States',
                'employee_id' => "EMP-{$i}",
                'department' => $i % 2 === 0 ? 'Engineering' : 'Marketing',
            ]);

            $registration = Registration::create([
                'event_id' => $bloodEvent->id,
                'participant_id' => $participant->id,
                'registration_number' => $regNum,
                'registration_sequence' => $i,
                'status' => $isConfirmed ? 'confirmed' : 'waitlisted',
                'attendance_status' => ($isConfirmed && $i <= 15) ? 'checked_in' : 'not_checked_in',
                'waitlist_priority' => 0,
                'source' => $i % 3 === 0 ? 'qr_poster' : 'direct',
                'secure_access_token' => Str::random(48),
                'registered_at' => now()->subHours(80 - $i),
                'confirmed_at' => $isConfirmed ? now()->subHours(80 - $i) : null,
                'waitlisted_at' => ! $isConfirmed ? now()->subHours(80 - $i) : null,
                'checked_in_at' => ($isConfirmed && $i <= 15) ? now()->subMinutes(60 - $i) : null,
            ]);

            RegistrationAnswer::create([
                'registration_id' => $registration->id,
                'field_key' => 'blood_type',
                'field_label' => 'Blood Type',
                'value_text' => ['O+', 'A+', 'B+', 'AB+'][$i % 4],
            ]);

            if ($isConfirmed) {
                $ticketService->issueTicket($registration);
            } else {
                WaitlistHistory::create([
                    'event_id' => $bloodEvent->id,
                    'registration_id' => $registration->id,
                    'action' => 'joined_queue',
                    'new_position' => $i - 70,
                    'notes' => 'Joined queue at position #'.($i - 70),
                    'created_at' => now()->subHours(80 - $i),
                ]);
            }
        }

        // 5. Sample Event 2: Corporate Townhall Q3
        $townhallEvent = Event::create([
            'organization_id' => $org->id,
            'title' => 'Global Corporate Townhall Q3 2026',
            'short_title' => 'Townhall Q3',
            'slug' => 'global-corporate-townhall-q3-2026',
            'event_code' => 'TH26',
            'description' => 'Quarterly company-wide all-hands meeting presenting executive strategy, financial performance, and celebrating team achievements.',
            'short_description' => 'Quarterly company-wide executive strategy and milestones presentation.',
            'category_id' => $categoryModels['corporate']->id,
            'event_type' => 'hybrid',
            'visibility' => 'public',
            'status' => 'registration_open',
            'cover_image_url' => 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=70',
            'attachments' => [
                ['label' => 'Q3 Townhall Agenda', 'url' => 'https://www.rhbgroup.com/'],
                ['label' => 'Joining Instructions & Zoom Guide', 'url' => 'https://www.rhbgroup.com/'],
            ],
            'organizer_name' => 'Executive Office',
            'owner_user_id' => $superAdmin->id,
            'contact_name' => 'Corporate Communications',
            'contact_email' => 'townhall@rhbgroup.com',
            'start_at' => now()->addDays(20)->setTime(10, 0),
            'end_at' => now()->addDays(20)->setTime(12, 30),
            'timezone' => 'Asia/Kuala_Lumpur',
            'registration_open_at' => now()->subDays(2),
            'registration_close_at' => now()->addDays(19),
            'capacity' => 500,
            'waitlist_enabled' => true,
            'waitlist_capacity' => 100,
            'approval_mode' => 'automatic',
            'venue_name' => 'Grand Hall & Zoom Live',
            'meeting_url' => 'https://zoom.us/j/9988776655',
            'address' => 'Jalan Tun Razak',
            'city' => 'Kuala Lumpur',
            'country' => 'Malaysia',
            'primary_color' => '#083a5e',
            'secondary_color' => '#0067b1',
            'created_by' => $superAdmin->id,
            'published_at' => now()->subDays(2),
        ]);

        $townhallForm = RegistrationForm::create(['event_id' => $townhallEvent->id, 'title' => 'Townhall RSVP']);
        FormField::create(['form_id' => $townhallForm->id, 'field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true, 'field_order' => 1]);
        FormField::create(['form_id' => $townhallForm->id, 'field_key' => 'email', 'label' => 'Corporate Email', 'type' => 'email', 'is_required' => true, 'field_order' => 2]);
        FormField::create(['form_id' => $townhallForm->id, 'field_key' => 'attendance_mode', 'label' => 'Will you attend in-person or virtually?', 'type' => 'radio', 'options' => ['In-Person (Auditorium)', 'Virtual (Zoom)'], 'is_required' => true, 'field_order' => 3]);

        // 6. Sample Event 3: Executive Dinner
        Event::create([
            'organization_id' => $org->id,
            'title' => 'Premier Client Executive Dinner',
            'short_title' => 'Client Gala Dinner',
            'slug' => 'premier-client-executive-dinner',
            'event_code' => 'GD26',
            'description' => 'Exclusive networking dinner with top tier enterprise clients and leadership.',
            'category_id' => $categoryModels['dinner']->id,
            'event_type' => 'physical',
            'visibility' => 'invitation_only',
            'status' => 'registration_open',
            'cover_image_url' => 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1200&q=70',
            'start_at' => now()->addDays(30)->setTime(18, 30),
            'end_at' => now()->addDays(30)->setTime(22, 0),
            'capacity' => 120,
            'waitlist_enabled' => true,
            'approval_mode' => 'manual',
            'venue_name' => 'The St. Regis Kuala Lumpur - Grand Ballroom',
            'city' => 'Kuala Lumpur',
            'country' => 'Malaysia',
            'primary_color' => '#083a5e',
            'secondary_color' => '#b8860b',
            'created_by' => $superAdmin->id,
            'published_at' => now()->subDays(1),
        ]);
    }
}
