<?php

namespace Database\Seeders;

use App\Models\Event;
use App\Models\EventCategory;
use App\Models\EventStaff;
use App\Models\FormField;
use App\Models\Organization;
use App\Models\RegistrationForm;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Clean starting project: one organisation, the standard staff logins, event
 * categories, the reusable form templates, and TWO events — Blood Donation
 * Drive 2026 and Marathon 2026 — each with a registration form and no
 * registrations yet.
 *
 *   php artisan migrate:fresh --force
 *   php artisan db:seed --class=FreshProjectSeeder --force
 */
class FreshProjectSeeder extends Seeder
{
    public function run(): void
    {
        // Built-in reusable registration forms
        $this->call(FormTemplateSeeder::class);

        // --- Organisation -------------------------------------------------
        $org = Organization::create([
            'name' => 'RHB Bank Berhad',
            'slug' => 'rhb-bank',
            'timezone' => 'Asia/Kuala_Lumpur',
            'country' => 'Malaysia',
            'contact_email' => 'events@rhbgroup.com',
            'contact_phone' => '+60 3-9280 8888',
        ]);

        // --- Staff logins (all password: password123) -------------------
        $users = collect([
            ['Super Administrator', 'superadmin@rhbgroup.com', 'super_admin'],
            ['Sarah Jenkins', 'manager@rhbgroup.com', 'event_admin'],
            ['Aidan Lim', 'organizer@rhbgroup.com', 'event_organizer'],
            ['Priya Nair', 'registration@rhbgroup.com', 'registration_officer'],
            ['Marcus Vance', 'staff@rhbgroup.com', 'checkin_staff'],
        ])->mapWithKeys(function ($u, $i) use ($org) {
            return [$u[2] => User::create([
                'name' => $u[0],
                'email' => $u[1],
                'password' => Hash::make('password123'),
                'role' => $u[2],
                'organization_id' => $org->id,
                'phone' => '+60 12-100 000' . ($i + 1),
                'status' => 'active',
            ])];
        });

        // --- Event categories ------------------------------------------
        $categories = collect([
            ['name' => 'Blood Donation', 'slug' => 'blood-donation', 'color' => '#ef3e42', 'icon' => 'Heart'],
            ['name' => 'CSR & Community', 'slug' => 'csr', 'color' => '#0067b1', 'icon' => 'Globe'],
            ['name' => 'Corporate & Townhall', 'slug' => 'corporate', 'color' => '#0067b1', 'icon' => 'Building'],
            ['name' => 'Conference & Summit', 'slug' => 'conference', 'color' => '#5bc2e7', 'icon' => 'Users'],
            ['name' => 'Workshops & Training', 'slug' => 'workshop', 'color' => '#059669', 'icon' => 'BookOpen'],
            ['name' => 'Executive Dinner', 'slug' => 'dinner', 'color' => '#b8860b', 'icon' => 'Utensils'],
        ])->mapWithKeys(fn ($c) => [$c['slug'] => EventCategory::create($c)]);

        // ==============================================================
        //  Event 1 — Blood Donation Drive 2026
        // ==============================================================
        $blood = Event::create([
            'organization_id' => $org->id,
            'title' => 'Blood Donation Drive 2026',
            'short_title' => 'Blood Drive 2026',
            'slug' => 'blood-donation-drive-2026',
            'event_code' => 'BD26',
            'description' => 'Annual corporate Blood Donation Drive in partnership with the National Blood Centre. Every donation can save up to three lives.',
            'short_description' => 'Annual corporate blood donation drive.',
            'category_id' => $categories['blood-donation']->id,
            'event_type' => 'physical',
            'visibility' => 'public',
            'status' => 'registration_open',
            'cover_image_url' => 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1200&q=70',
            'organizer_name' => 'CSR & HR Team',
            'owner_user_id' => $users['event_admin']->id,
            'contact_name' => 'Sarah Jenkins',
            'contact_email' => 'blood-drive@rhbgroup.com',
            'contact_phone' => '+60 3-9280 1234',
            'start_at' => now()->addDays(30)->setTime(9, 0),
            'end_at' => now()->addDays(30)->setTime(17, 0),
            'timezone' => 'Asia/Kuala_Lumpur',
            'registration_open_at' => now(),
            'registration_close_at' => now()->addDays(28),
            'capacity' => 80,
            'waitlist_enabled' => true,
            'waitlist_capacity' => 40,
            'approval_mode' => 'automatic',
            'allow_cancellation' => true,
            'cancellation_deadline' => now()->addDays(27),
            'duplicate_rule' => 'email',
            'venue_name' => 'RHB Centre — Level 3 Auditorium',
            'address' => 'Jalan Tun Razak',
            'city' => 'Kuala Lumpur',
            'province' => 'Wilayah Persekutuan',
            'country' => 'Malaysia',
            'postal_code' => '50400',
            'primary_color' => '#ef3e42',
            'secondary_color' => '#f16265',
            'terms_and_conditions' => 'Donors must be 18–60 years old, weigh at least 45kg, and be in good health with adequate rest.',
            'created_by' => $users['super_admin']->id,
            'published_at' => now(),
        ]);
        EventStaff::create(['event_id' => $blood->id, 'user_id' => $users['event_admin']->id, 'role' => 'owner']);
        EventStaff::create(['event_id' => $blood->id, 'user_id' => $users['checkin_staff']->id, 'role' => 'checkin_staff']);
        EventStaff::create(['event_id' => $blood->id, 'user_id' => $users['registration_officer']->id, 'role' => 'registration_officer']);
        $this->form($blood, 'Blood Donation Registration', [
            ['full_name', 'Full Name', 'text', true],
            ['email', 'Email Address', 'email', true],
            ['phone', 'Phone Number', 'phone', true],
            ['employee_id', 'Employee ID', 'text', false],
            ['blood_type', 'Blood Type', 'select', true, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']],
            ['donated_recently', 'Have you donated blood in the last 3 months?', 'radio', true, ['Yes', 'No']],
            ['preferred_slot', 'Preferred Time Slot', 'select', true, ['09:00 – 11:00', '11:00 – 13:00', '14:00 – 16:00', '16:00 – 17:00']],
            ['health_declaration', 'I confirm I am in good health and eligible to donate.', 'checkbox', true, ['I confirm']],
        ]);

        // ==============================================================
        //  Event 2 — Marathon 2026
        // ==============================================================
        $marathon = Event::create([
            'organization_id' => $org->id,
            'title' => 'Marathon 2026',
            'short_title' => 'Marathon 2026',
            'slug' => 'marathon-2026',
            'event_code' => 'MARA26',
            'description' => 'RHB charity run supporting community programmes. Choose the 5KM Fun Run, 10KM, or 21KM Half Marathon. All proceeds go to CSR initiatives.',
            'short_description' => 'RHB charity run — 5KM / 10KM / 21KM.',
            'category_id' => $categories['csr']->id,
            'event_type' => 'physical',
            'visibility' => 'public',
            'status' => 'registration_open',
            'cover_image_url' => 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&w=1200&q=70',
            'organizer_name' => 'CSR & Community Team',
            'owner_user_id' => $users['event_organizer']->id,
            'contact_name' => 'Aidan Lim',
            'contact_email' => 'marathon@rhbgroup.com',
            'contact_phone' => '+60 3-9280 5678',
            'start_at' => now()->addDays(60)->setTime(6, 0),
            'end_at' => now()->addDays(60)->setTime(11, 0),
            'timezone' => 'Asia/Kuala_Lumpur',
            'registration_open_at' => now(),
            'registration_close_at' => now()->addDays(55),
            'capacity' => 500,
            'waitlist_enabled' => true,
            'waitlist_capacity' => 150,
            'approval_mode' => 'automatic',
            'allow_cancellation' => true,
            'cancellation_deadline' => now()->addDays(50),
            'duplicate_rule' => 'email',
            'venue_name' => 'Padang Merbok',
            'address' => 'Jalan Parlimen',
            'city' => 'Kuala Lumpur',
            'province' => 'Wilayah Persekutuan',
            'country' => 'Malaysia',
            'postal_code' => '50480',
            'primary_color' => '#0067b1',
            'secondary_color' => '#5bc2e7',
            'terms_and_conditions' => 'Participants run at their own risk and must accept the event waiver and release of liability.',
            'created_by' => $users['super_admin']->id,
            'published_at' => now(),
        ]);
        EventStaff::create(['event_id' => $marathon->id, 'user_id' => $users['event_organizer']->id, 'role' => 'owner']);
        EventStaff::create(['event_id' => $marathon->id, 'user_id' => $users['checkin_staff']->id, 'role' => 'checkin_staff']);
        $this->form($marathon, 'Marathon Registration', [
            ['full_name', 'Full Name', 'text', true],
            ['email', 'Email Address', 'email', true],
            ['phone', 'Phone Number', 'phone', true],
            ['category', 'Race Category', 'select', true, ['5KM Fun Run', '10KM', '21KM Half Marathon']],
            ['tshirt_size', 'T-Shirt Size', 'select', true, ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']],
            ['emergency_contact_name', 'Emergency Contact Name', 'text', true],
            ['emergency_contact_phone', 'Emergency Contact Phone', 'phone', true],
            ['medical_conditions', 'Medical conditions we should know about', 'textarea', false],
            ['waiver', 'I have read and accept the event waiver and release of liability.', 'checkbox', true, ['I accept']],
        ]);
    }

    /** @param array<int, array{0:string,1:string,2:string,3:bool,4?:array}> $fields */
    private function form(Event $event, string $title, array $fields): void
    {
        $form = RegistrationForm::create([
            'event_id' => $event->id,
            'title' => $title,
            'description' => 'Please provide accurate information for registration.',
            'is_active' => true,
        ]);

        foreach ($fields as $i => $f) {
            FormField::create([
                'form_id' => $form->id,
                'field_key' => $f[0],
                'label' => $f[1],
                'type' => $f[2],
                'is_required' => $f[3],
                'is_hidden' => false,
                'field_order' => $i + 1,
                'options' => $f[4] ?? null,
            ]);
        }
    }
}
