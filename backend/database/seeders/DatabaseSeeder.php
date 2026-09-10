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

        $this->copySeedAssets();

        // Reusable registration-form templates (idempotent, safe on every boot)
        $this->call(FormTemplateSeeder::class);
        $this->call(EventTemplateSeeder::class);

        // 1. Organization
        $org = Organization::create([
            'name' => 'RHB Bank Cambodia',
            'slug' => 'rhb-bank',
            'timezone' => 'Asia/Phnom_Penh',
            'country' => 'Cambodia',
            'contact_email' => 'kh.marcom@rhbgroup.com',
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

        // Lowest tier in the RBAC hierarchy (RBAC-MATRIX.md) — read-only
        // console access, no write endpoint anywhere allows this role. Fully
        // wired everywhere else (RoleMiddleware, EventStaffController::ROLES,
        // the Users/Team-tab role dropdowns), it just never had a demo login.
        $viewer = User::create([
            'name' => 'Dara Sok (Viewer)',
            'email' => 'viewer@rhbgroup.com',
            'password' => Hash::make('password123'),
            'role' => 'viewer',
            'organization_id' => $org->id,
            'phone' => '+60 12-100 0006',
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
            ['name' => 'Staff Sports & Recreation', 'slug' => 'sports', 'color' => '#f59e0b', 'icon' => 'Trophy'],
        ];

        $categoryModels = [];
        foreach ($categories as $cat) {
            $categoryModels[$cat['slug']] = EventCategory::create($cat);
        }

        $ticketService = app(TicketService::class);

        // 4. Sample Event 1: Blood Donation Drive 2026 — open for registration,
        // nobody has signed up yet (mirrors the real intake state: a freshly
        // published drive with zero registrations so far).
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
            'cover_image_url' => '/storage/event-covers/50af3674-7346-45e8-a22f-3559bbee2b7f.png',
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
        EventStaff::create(['event_id' => $bloodEvent->id, 'user_id' => $viewer->id, 'role' => 'viewer']);

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

        // 5. Sample Event 2: The 31st Angkor Wat International Half Marathon —
        // real event, first Sunday of December in Siem Reap, Cambodia. Sold
        // out: capacity 79, 79 confirmed + 3 on the waitlist.
        $marathonEvent = Event::create([
            'organization_id' => $org->id,
            'title' => 'The 31st Angkor Wat International Half Marathon',
            'short_title' => "Angkor Wat Int'l Half Marathon",
            'slug' => 'angkor-wat-half-marathon-2026',
            'event_code' => 'AWHM26',
            'description' => 'The Angkor Wat International Half Marathon is held on the first Sunday of December in Siem Reap, Cambodia, starting and finishing on the causeway in front of Angkor Wat inside the Angkor Archaeological Park (a UNESCO World Heritage Site). First run in 1996 and organised in aid of landmine survivors and persons with disabilities, the 2026 edition is the 31st. Distances: 3KM fun run, 5KM, 10KM and the 21.1KM half marathon, with wheelchair races.',
            'short_description' => 'First Sunday of December in Siem Reap – 3KM / 5KM / 10KM / 21KM half marathon.',
            'category_id' => $categoryModels['csr']->id,
            'event_type' => 'physical',
            'visibility' => 'public',
            'status' => 'registration_open',
            'cover_image_url' => '/storage/event-covers/97b96d9c-259c-4666-a5a1-bb8915063d9f.png',
            'organizer_name' => 'RHB Cambodia – CSR & Community',
            'owner_user_id' => $eventOrganizer->id,
            'contact_name' => 'RHB Cambodia Marcom',
            'contact_email' => 'kh.marcom@rhbgroup.com',
            'contact_phone' => '+60 3-9280 5678',
            'start_at' => now()->addDays(75)->setTime(6, 0),
            'end_at' => now()->addDays(75)->setTime(11, 0),
            'timezone' => 'Asia/Phnom_Penh',
            'registration_open_at' => now()->subDays(30),
            'registration_close_at' => now()->addDays(68),
            'capacity' => 79,
            'waitlist_enabled' => true,
            'waitlist_capacity' => 150,
            'approval_mode' => 'automatic',
            'allow_cancellation' => true,
            'cancellation_deadline' => now()->addDays(61),
            'duplicate_rule' => 'email',
            'venue_name' => 'Angkor Wat – Angkor Archaeological Park',
            'address' => 'Angkor Wat causeway, Angkor Archaeological Park',
            'city' => 'Siem Reap',
            'province' => 'Siem Reap Province',
            'country' => 'Cambodia',
            'postal_code' => '17000',
            'latitude' => 13.4124693,
            'longitude' => 103.8669857,
            'primary_color' => '#0067b1',
            'secondary_color' => '#5bc2e7',
            'terms_and_conditions' => 'Participants take part at their own risk and must accept the official event waiver and release of liability. The event is run in aid of landmine survivors and persons with disabilities in Cambodia.',
            'created_by' => $superAdmin->id,
            'published_at' => now()->subDays(30),
        ]);

        EventStaff::create(['event_id' => $marathonEvent->id, 'user_id' => $eventOrganizer->id, 'role' => 'owner']);
        EventStaff::create(['event_id' => $marathonEvent->id, 'user_id' => $registrationOfficer->id, 'role' => 'registration_officer']);
        EventStaff::create(['event_id' => $marathonEvent->id, 'user_id' => $checkinStaff->id, 'role' => 'checkin_staff']);
        EventStaff::create(['event_id' => $marathonEvent->id, 'user_id' => $viewer->id, 'role' => 'viewer']);

        $marathonForm = RegistrationForm::create([
            'event_id' => $marathonEvent->id,
            'title' => 'Marathon Registration',
            'description' => 'Please provide accurate information for registration.',
            'is_active' => true,
        ]);

        $marathonFields = [
            ['field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true, 'field_order' => 1],
            ['field_key' => 'email', 'label' => 'Email Address', 'type' => 'email', 'is_required' => true, 'field_order' => 2],
            ['field_key' => 'phone', 'label' => 'Phone Number', 'type' => 'phone', 'is_required' => true, 'field_order' => 3],
            ['field_key' => 'emergency_contact_name', 'label' => 'Emergency Contact Name', 'type' => 'text', 'is_required' => false, 'field_order' => 4],
            ['field_key' => 'emergency_contact_phone', 'label' => 'Emergency Contact Phone', 'type' => 'phone', 'is_required' => false, 'field_order' => 5],
            ['field_key' => 'race_distance', 'label' => 'Race Distance', 'type' => 'select', 'is_required' => true, 'field_order' => 6, 'options' => ['3KM Fun Run', '5KM', '10KM', '21KM Half Marathon']],
            ['field_key' => 'tshirt_size', 'label' => 'T-Shirt Size', 'type' => 'select', 'is_required' => true, 'field_order' => 7, 'options' => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']],
            ['field_key' => 'medical_conditions', 'label' => 'Medical conditions we should know about', 'type' => 'textarea', 'is_required' => false, 'field_order' => 8],
            ['field_key' => 'waiver', 'label' => 'I have read and accept the official event waiver and release of liability.', 'type' => 'checkbox', 'is_required' => true, 'field_order' => 9, 'options' => ['I accept']],
        ];

        foreach ($marathonFields as $f) {
            FormField::create(array_merge($f, ['form_id' => $marathonForm->id]));
        }

        // Seed 79 Confirmed Registrations + 3 Waitlisted Registrations
        $khmerFamilyNames = ['Sok', 'Chan', 'Lim', 'Heng', 'Chea', 'Sar', 'Meas', 'Pich', 'Ros', 'Nou', 'Kim', 'Long', 'Yin', 'Vann', 'Sam'];
        $khmerGivenNames = ['Dara', 'Sopheak', 'Chhun', 'Srey', 'Vanna', 'Bopha', 'Rithy', 'Sokha', 'Chenda', 'Panha', 'Vibol', 'Sreymom', 'Kosal', 'Ravy', 'Chanthou', 'Malis', 'Nary'];
        $raceDistances = ['3KM Fun Run', '5KM', '10KM', '21KM Half Marathon'];
        $tshirtSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

        for ($i = 1; $i <= 82; $i++) {
            $isConfirmed = $i <= 79;
            $seqPad = str_pad((string) $i, 6, '0', STR_PAD_LEFT);
            $regNum = "EVT-AWHM26-2026-{$seqPad}";
            // 15 family names and 17 given names — coprime list lengths, so
            // both indices advance every single registrant instead of one
            // holding still while the other cycles. (An earlier version used
            // a base-15 digit pair here: same modulus size on both axes made
            // every block of 15 consecutive registrants share one given name
            // — e.g. #1-15 were all "... Dara" — which read as broken data
            // even though the full names were technically all distinct.)
            // With coprime lengths 15 and 17, the pair only repeats every
            // 255 registrants, comfortably above the 82 seeded here.
            $familyIdx = ($i - 1) % count($khmerFamilyNames);
            $givenIdx = ($i - 1) % count($khmerGivenNames);
            $name = $khmerFamilyNames[$familyIdx].' '.$khmerGivenNames[$givenIdx];

            $participant = Participant::create([
                'name' => $name,
                'email' => "runner{$i}@example.com",
                'phone' => '+855 '.str_pad((string) (10 + $i % 90), 2, '0', STR_PAD_LEFT).' '.str_pad((string) ($i * 37 % 1000), 3, '0', STR_PAD_LEFT).' '.str_pad((string) ($i * 13 % 1000), 3, '0', STR_PAD_LEFT),
                'country' => 'Cambodia',
            ]);

            $registration = Registration::create([
                'event_id' => $marathonEvent->id,
                'participant_id' => $participant->id,
                'registration_number' => $regNum,
                'registration_sequence' => $i,
                'status' => $isConfirmed ? 'confirmed' : 'waitlisted',
                'attendance_status' => 'not_checked_in',
                'waitlist_priority' => 0,
                'source' => $i % 4 === 0 ? 'csv_import' : 'direct',
                'secure_access_token' => Str::random(48),
                'registered_at' => now()->subDays(90 - $i),
                'confirmed_at' => $isConfirmed ? now()->subDays(90 - $i) : null,
                'waitlisted_at' => ! $isConfirmed ? now()->subDays(90 - $i) : null,
            ]);

            RegistrationAnswer::create([
                'registration_id' => $registration->id,
                'field_key' => 'race_distance',
                'field_label' => 'Race Distance',
                'value_text' => $raceDistances[$i % 4],
            ]);
            RegistrationAnswer::create([
                'registration_id' => $registration->id,
                'field_key' => 'tshirt_size',
                'field_label' => 'T-Shirt Size',
                'value_text' => $tshirtSizes[$i % count($tshirtSizes)],
            ]);

            if ($isConfirmed) {
                $ticketService->issueTicket($registration);
            } else {
                WaitlistHistory::create([
                    'event_id' => $marathonEvent->id,
                    'registration_id' => $registration->id,
                    'action' => 'joined_queue',
                    'new_position' => $i - 79,
                    'notes' => 'Joined queue at position #'.($i - 79),
                    'created_at' => now()->subDays(90 - $i),
                ]);
            }
        }

        // 6. Sample Event 3: RHB Badminton Doubles Tournament 2026 — open for
        // registration, zero sign-ups yet.
        $badmintonEvent = Event::create([
            'organization_id' => $org->id,
            'title' => 'RHB Badminton Doubles Tournament 2026',
            'short_title' => 'Badminton 2026',
            'slug' => 'rhb-badminton-doubles-tournament-2026',
            'event_code' => 'RHBB26',
            'description' => "RHB's staff badminton doubles tournament returns this year.\n\nFormat: doubles only. Every player registers individually and names their partner — both halves of a pair must register for the entry to be confirmed. 20 pairs (40 players) will be accepted; once full, further sign-ups join the waiting list and are promoted automatically if a pair drops out.\n\nBring your own racket. Shuttlecocks, water and light refreshments provided. Wear proper court shoes (non-marking soles).",
            'short_description' => 'Staff doubles badminton tournament — register as a pair. 20 pairs (40 players), with a waiting list.',
            'category_id' => $categoryModels['sports']->id,
            'event_type' => 'physical',
            'visibility' => 'public',
            'status' => 'registration_open',
            'cover_image_url' => 'https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?auto=format&fit=crop&w=1200&q=70',
            'organizer_name' => 'MARCOM & HR',
            'owner_user_id' => $eventOrganizer->id,
            'contact_email' => 'sports@rhbgroup.com',
            'start_at' => now()->setDate(2026, 10, 24)->setTime(14, 0),
            'end_at' => now()->setDate(2026, 10, 24)->setTime(18, 0),
            'timezone' => 'Asia/Phnom_Penh',
            'registration_open_at' => now()->subDays(3),
            'registration_close_at' => now()->setDate(2026, 10, 20)->setTime(23, 59),
            'capacity' => 40,
            'waitlist_enabled' => true,
            'waitlist_capacity' => 20,
            'approval_mode' => 'automatic',
            'allow_cancellation' => true,
            'duplicate_rule' => 'email',
            'venue_name' => 'T Sport — Badminton Courts',
            'city' => 'Phnom Penh',
            'country' => 'Cambodia',
            'map_url' => 'https://www.google.com/maps/search/?api=1&query=T%20Sport%20Badminton%20Phnom%20Penh',
            'primary_color' => '#0f172a',
            'secondary_color' => '#2563eb',
            'created_by' => $superAdmin->id,
            'published_at' => now()->subDays(3),
        ]);

        EventStaff::create(['event_id' => $badmintonEvent->id, 'user_id' => $eventOrganizer->id, 'role' => 'owner']);
        EventStaff::create(['event_id' => $badmintonEvent->id, 'user_id' => $registrationOfficer->id, 'role' => 'registration_officer']);
        EventStaff::create(['event_id' => $badmintonEvent->id, 'user_id' => $checkinStaff->id, 'role' => 'checkin_staff']);
        EventStaff::create(['event_id' => $badmintonEvent->id, 'user_id' => $viewer->id, 'role' => 'viewer']);

        $badmintonForm = RegistrationForm::create([
            'event_id' => $badmintonEvent->id,
            'title' => 'Badminton Doubles Registration',
            'description' => 'Please provide accurate information for registration.',
            'is_active' => true,
        ]);

        $badmintonFields = [
            ['field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true, 'field_order' => 1],
            ['field_key' => 'email', 'label' => 'Email Address', 'type' => 'email', 'is_required' => true, 'field_order' => 2],
            ['field_key' => 'phone', 'label' => 'Phone Number', 'type' => 'phone', 'is_required' => true, 'field_order' => 3],
            ['field_key' => 'department', 'label' => 'Department', 'type' => 'text', 'is_required' => true, 'field_order' => 4],
            ['field_key' => 'skill_level', 'label' => 'Skill level', 'type' => 'radio', 'is_required' => true, 'field_order' => 5, 'options' => ['Beginner', 'Intermediate', 'Advanced']],
            ['field_key' => 'partner', 'label' => 'Preferred doubles partner (optional)', 'type' => 'text', 'is_required' => false, 'field_order' => 6],
        ];

        foreach ($badmintonFields as $f) {
            FormField::create(array_merge($f, ['form_id' => $badmintonForm->id]));
        }

        // 7. Sample Event 4: RHB Staff Football Friendly 2026 — open for
        // registration, zero sign-ups yet.
        $footballEvent = Event::create([
            'organization_id' => $org->id,
            'title' => 'RHB Staff Football Friendly 2026',
            'short_title' => 'Football Friendly',
            'slug' => 'rhb-staff-football-friendly-2026',
            'event_code' => 'RHBF26',
            'description' => 'Inter-department five-a-side football friendly. All skill levels welcome — this is about staff bonding, not the league table. Boots, shin guards and a water bottle are on you; jerseys and match balls are provided.',
            'short_description' => 'Inter-department five-a-side football friendly — all skill levels welcome.',
            'category_id' => $categoryModels['sports']->id,
            'event_type' => 'physical',
            'visibility' => 'public',
            'status' => 'registration_open',
            'cover_image_url' => 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1200&q=70',
            'organizer_name' => 'MARCOM & HR',
            'owner_user_id' => $eventAdmin->id,
            'contact_email' => 'sports@rhbgroup.com',
            'start_at' => now()->setDate(2026, 10, 24)->setTime(14, 0),
            'end_at' => now()->setDate(2026, 10, 24)->setTime(18, 0),
            'timezone' => 'Asia/Kuala_Lumpur',
            'registration_open_at' => now()->subDays(1),
            'registration_close_at' => now()->setDate(2026, 10, 20)->setTime(23, 59),
            'capacity' => 40,
            'waitlist_enabled' => true,
            'waitlist_capacity' => 20,
            'approval_mode' => 'automatic',
            'allow_cancellation' => true,
            'duplicate_rule' => 'email',
            'venue_name' => 'RHB Sports Complex',
            'city' => 'Kuala Lumpur',
            'country' => 'Malaysia',
            'primary_color' => '#0f172a',
            'secondary_color' => '#2563eb',
            'created_by' => $superAdmin->id,
            'published_at' => now()->subDays(1),
        ]);

        EventStaff::create(['event_id' => $footballEvent->id, 'user_id' => $eventAdmin->id, 'role' => 'owner']);
        EventStaff::create(['event_id' => $footballEvent->id, 'user_id' => $registrationOfficer->id, 'role' => 'registration_officer']);
        EventStaff::create(['event_id' => $footballEvent->id, 'user_id' => $checkinStaff->id, 'role' => 'checkin_staff']);
        EventStaff::create(['event_id' => $footballEvent->id, 'user_id' => $viewer->id, 'role' => 'viewer']);

        $footballForm = RegistrationForm::create([
            'event_id' => $footballEvent->id,
            'title' => 'Football Friendly Registration',
            'description' => 'Please provide accurate information for registration.',
            'is_active' => true,
        ]);

        $footballFields = [
            ['field_key' => 'full_name', 'label' => 'Full Name', 'type' => 'text', 'is_required' => true, 'field_order' => 1],
            ['field_key' => 'email', 'label' => 'Email Address', 'type' => 'email', 'is_required' => true, 'field_order' => 2],
            ['field_key' => 'phone', 'label' => 'Phone Number', 'type' => 'phone', 'is_required' => true, 'field_order' => 3],
            ['field_key' => 'department', 'label' => 'Department', 'type' => 'text', 'is_required' => true, 'field_order' => 4],
            ['field_key' => 'position', 'label' => 'Preferred position', 'type' => 'select', 'is_required' => false, 'field_order' => 5, 'options' => ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Any']],
            ['field_key' => 'jersey', 'label' => 'Jersey size', 'type' => 'select', 'is_required' => true, 'field_order' => 6, 'options' => ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']],
        ];

        foreach ($footballFields as $f) {
            FormField::create(array_merge($f, ['form_id' => $footballForm->id]));
        }
    }

    /**
     * Copy the tracked demo cover images (database/seed-assets/) into
     * storage/app/public/, so a fresh install — Docker, XAMPP, or local —
     * renders the real Blood Donation / Marathon thumbnails this seeder's
     * cover_image_url values point at, instead of a broken image or having
     * someone re-upload them by hand. Never overwrites an existing file, so
     * a real admin upload always wins over the bundled demo asset.
     */
    private function copySeedAssets(): void
    {
        $src = database_path('seed-assets/event-covers');
        $dest = storage_path('app/public/event-covers');

        if (! is_dir($src)) {
            return;
        }

        if (! is_dir($dest)) {
            mkdir($dest, 0775, true);
        }

        foreach (glob($src.'/*') as $file) {
            $target = $dest.'/'.basename($file);
            if (! file_exists($target)) {
                copy($file, $target);
            }
        }
    }
}
