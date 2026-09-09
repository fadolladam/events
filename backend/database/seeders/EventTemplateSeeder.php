<?php

namespace Database\Seeders;

use App\Models\EventTemplate;
use Illuminate\Database\Seeder;

/**
 * Built-in "start from a template" presets. Idempotent — safe on every boot.
 * `structure` = { defaults: <event field overrides>, form_fields: [<FormField>] }.
 */
class EventTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->templates() as $t) {
            EventTemplate::updateOrCreate(
                ['name' => $t['name']],
                ['description' => $t['description'], 'structure' => $t['structure']]
            );
        }
    }

    private function field(string $key, string $label, string $type, array $extra = []): array
    {
        return array_merge([
            'field_key' => $key, 'label' => $label, 'type' => $type,
            'is_required' => false, 'is_hidden' => false, 'options' => null, 'help_text' => null,
        ], $extra);
    }

    private function core(): array
    {
        return [
            $this->field('full_name', 'Full Name', 'text', ['is_required' => true]),
            $this->field('email', 'Email Address', 'email', ['is_required' => true]),
            $this->field('phone', 'Phone Number', 'phone'),
        ];
    }

    private function templates(): array
    {
        $sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

        return [
            [
                'name' => 'Staff Sports — Badminton',
                'description' => 'Small-capacity racquet sport with a waitlist and a skill-level question.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'physical', 'capacity' => 24, 'waitlist_enabled' => true,
                        'approval_mode' => 'automatic', 'duplicate_rule' => 'email',
                        'short_description' => 'Inter-department badminton. Bring your own racquet.',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('department', 'Department', 'text', ['is_required' => true]),
                        $this->field('skill_level', 'Skill level', 'radio', ['is_required' => true, 'options' => ['Beginner', 'Intermediate', 'Advanced']]),
                        $this->field('partner', 'Preferred doubles partner (optional)', 'text'),
                    ],
                ],
            ],
            [
                'name' => 'Staff Sports — Football',
                'description' => 'Team sport, larger capacity, position + jersey size.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'physical', 'capacity' => 60, 'waitlist_enabled' => true,
                        'approval_mode' => 'automatic', 'duplicate_rule' => 'email',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('department', 'Department', 'text', ['is_required' => true]),
                        $this->field('position', 'Preferred position', 'select', ['options' => ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Any']]),
                        $this->field('jersey', 'Jersey size', 'select', ['is_required' => true, 'options' => $sizes]),
                    ],
                ],
            ],
            [
                'name' => 'Blood Donation Drive',
                'description' => 'Health screening questions, manual approval, no waitlist.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'physical', 'capacity' => 120, 'waitlist_enabled' => false,
                        'approval_mode' => 'manual', 'duplicate_rule' => 'employee_id',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('employee_id', 'Employee ID', 'employee_id', ['is_required' => true]),
                        $this->field('blood_type', 'Blood type (if known)', 'select', ['options' => ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-', 'Unknown']]),
                        $this->field('last_donation', 'Date of last donation', 'date'),
                        $this->field('eligible', 'I have read the eligibility criteria', 'consent', ['is_required' => true]),
                    ],
                ],
            ],
            [
                'name' => 'Marathon / Fun Run',
                'description' => 'Distance category, jersey size, emergency contact, waiver.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'physical', 'capacity' => 500, 'waitlist_enabled' => true,
                        'approval_mode' => 'automatic', 'duplicate_rule' => 'email',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('category', 'Distance', 'radio', ['is_required' => true, 'options' => ['5 km', '10 km', '21 km']]),
                        $this->field('jersey', 'Jersey size', 'select', ['is_required' => true, 'options' => $sizes]),
                        $this->field('emergency_contact', 'Emergency contact (name & number)', 'text', ['is_required' => true]),
                        $this->field('waiver', 'I accept the event waiver and assume the risks of participation', 'consent', ['is_required' => true]),
                    ],
                ],
            ],
            [
                'name' => 'Corporate Townhall',
                'description' => 'Large RSVP, automatic confirmation, minimal questions.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'hybrid', 'capacity' => 1000, 'waitlist_enabled' => true,
                        'approval_mode' => 'automatic', 'duplicate_rule' => 'email',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('department', 'Department', 'text', ['is_required' => true]),
                        $this->field('attendance_mode', 'Attending', 'radio', ['is_required' => true, 'options' => ['In person', 'Online']]),
                    ],
                ],
            ],
            [
                'name' => 'Training / Workshop',
                'description' => 'Capped seats, manual approval, prerequisite check.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'physical', 'capacity' => 30, 'waitlist_enabled' => true,
                        'approval_mode' => 'manual', 'duplicate_rule' => 'email',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('department', 'Department', 'text', ['is_required' => true]),
                        $this->field('manager_email', "Line manager's email (for approval)", 'email', ['is_required' => true]),
                        $this->field('experience', 'Relevant experience level', 'select', ['options' => ['None', 'Some', 'Experienced']]),
                        $this->field('dietary', 'Dietary requirements', 'multi_select', ['options' => ['Halal', 'Vegetarian', 'Vegan', 'Nut allergy', 'None']]),
                    ],
                ],
            ],
            [
                'name' => 'Seminar / Conference',
                'description' => 'Track selection, dietary, networking opt-in.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'physical', 'capacity' => 250, 'waitlist_enabled' => true,
                        'approval_mode' => 'automatic', 'duplicate_rule' => 'email',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('organization', 'Organisation', 'text'),
                        $this->field('track', 'Preferred track', 'select', ['options' => ['Technology', 'Risk & Compliance', 'Customer', 'Leadership']]),
                        $this->field('dietary', 'Dietary requirements', 'multi_select', ['options' => ['Halal', 'Vegetarian', 'Vegan', 'Nut allergy', 'None']]),
                        $this->field('networking', 'Include me in the networking session', 'consent'),
                    ],
                ],
            ],
            [
                'name' => 'Client Event / Executive Dinner',
                'description' => 'Invitation-only, manual approval, small capacity.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'physical', 'visibility' => 'invitation_only', 'capacity' => 40,
                        'waitlist_enabled' => false, 'approval_mode' => 'manual', 'duplicate_rule' => 'email',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('organization', 'Company', 'text', ['is_required' => true]),
                        $this->field('title', 'Job title', 'text'),
                        $this->field('dietary', 'Dietary requirements', 'multi_select', ['options' => ['Halal', 'Vegetarian', 'Vegan', 'Nut allergy', 'None']]),
                        $this->field('plus_one', 'Bringing a guest?', 'radio', ['options' => ['No', 'Yes']]),
                    ],
                ],
            ],
            [
                'name' => 'Staff Gathering / Family Day',
                'description' => 'Headcount for adults & children, t-shirt sizes.',
                'structure' => [
                    'defaults' => [
                        'event_type' => 'physical', 'capacity' => 800, 'waitlist_enabled' => true,
                        'approval_mode' => 'automatic', 'duplicate_rule' => 'employee_id',
                    ],
                    'form_fields' => [
                        ...$this->core(),
                        $this->field('employee_id', 'Employee ID', 'employee_id', ['is_required' => true]),
                        $this->field('adults', 'Number of adults (incl. you)', 'number', ['is_required' => true]),
                        $this->field('children', 'Number of children', 'number'),
                        $this->field('tshirt', 'Your t-shirt size', 'select', ['options' => $sizes]),
                    ],
                ],
            ],
        ];
    }
}
