<?php

namespace Database\Seeders;

use App\Models\FormTemplate;
use Illuminate\Database\Seeder;

/**
 * Ready-made reusable registration forms. Idempotent — safe to re-run
 * (`php artisan db:seed --class=FormTemplateSeeder`).
 */
class FormTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->templates() as $tpl) {
            FormTemplate::updateOrCreate(
                ['name' => $tpl['name']],
                [
                    'description' => $tpl['description'],
                    'fields' => $this->number($tpl['fields']),
                    'is_system' => true,
                    'created_by' => null,
                ],
            );
        }
    }

    /** Assign field_order 1..n and fill defaults. */
    private function number(array $fields): array
    {
        return array_values(array_map(function ($f, $i) {
            return array_merge([
                'placeholder' => null,
                'help_text' => null,
                'is_required' => false,
                'is_hidden' => false,
                'options' => null,
                'validation_rules' => null,
                'conditional_logic' => null,
            ], $f, ['field_order' => $i + 1]);
        }, $fields, array_keys($fields)));
    }

    private function f(string $key, string $label, string $type, bool $required = false, ?array $options = null, ?string $help = null): array
    {
        return array_filter([
            'field_key' => $key,
            'label' => $label,
            'type' => $type,
            'is_required' => $required,
            'options' => $options,
            'help_text' => $help,
        ], fn ($v) => $v !== null);
    }

    private function templates(): array
    {
        $dept = ['Engineering', 'Technology', 'Operations', 'Finance', 'Human Resources', 'Marketing', 'Sales', 'Risk & Compliance', 'Legal', 'External Guest'];

        return [
            [
                'name' => 'Standard RSVP',
                'description' => 'Minimal form — name, email, phone. A safe default for any event.',
                'fields' => [
                    $this->f('full_name', 'Full Name', 'text', true),
                    $this->f('email', 'Email Address', 'email', true),
                    $this->f('phone', 'Phone Number', 'phone', false),
                ],
            ],
            [
                'name' => 'Corporate Townhall / All-Hands',
                'description' => 'Internal staff event with in-person / virtual attendance choice.',
                'fields' => [
                    $this->f('full_name', 'Full Name', 'text', true),
                    $this->f('email', 'Corporate Email', 'email', true),
                    $this->f('employee_id', 'Employee ID', 'text', false),
                    $this->f('department', 'Department', 'select', true, $dept),
                    $this->f('attendance_mode', 'How will you attend?', 'radio', true, ['In-Person', 'Virtual (Live Stream)']),
                    $this->f('dietary', 'Dietary Requirement', 'select', false, ['None', 'Vegetarian', 'Vegan', 'Halal', 'No Pork / No Lard', 'Other']),
                ],
            ],
            [
                'name' => 'Blood Donation Drive',
                'description' => 'Health-screening fields for a blood donation event.',
                'fields' => [
                    $this->f('full_name', 'Full Name', 'text', true),
                    $this->f('email', 'Email Address', 'email', true),
                    $this->f('phone', 'Phone Number', 'phone', true),
                    $this->f('employee_id', 'Employee ID', 'text', false),
                    $this->f('blood_type', 'Blood Type', 'select', true, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']),
                    $this->f('donated_recently', 'Have you donated blood in the last 3 months?', 'radio', true, ['Yes', 'No']),
                    $this->f('preferred_slot', 'Preferred Time Slot', 'select', true, ['09:00 – 11:00', '11:00 – 13:00', '14:00 – 16:00', '16:00 – 17:30']),
                    $this->f('health_declaration', 'I confirm I am in good health and eligible to donate.', 'checkbox', true, ['I confirm']),
                ],
            ],
            [
                'name' => 'Sports / Marathon / CSR Activity',
                'description' => 'Physical-activity event with emergency contact, t-shirt size and a waiver.',
                'fields' => [
                    $this->f('full_name', 'Full Name', 'text', true),
                    $this->f('email', 'Email Address', 'email', true),
                    $this->f('phone', 'Phone Number', 'phone', true),
                    $this->f('emergency_contact_name', 'Emergency Contact Name', 'text', true),
                    $this->f('emergency_contact_phone', 'Emergency Contact Phone', 'phone', true),
                    $this->f('tshirt_size', 'T-Shirt Size', 'select', true, ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']),
                    $this->f('medical_conditions', 'Medical conditions we should know about', 'textarea', false, null, 'Leave blank if none.'),
                    $this->f('waiver', 'I have read and accept the activity waiver and release of liability.', 'checkbox', true, ['I accept']),
                ],
            ],
            [
                'name' => 'Executive / Client Dinner',
                'description' => 'External guest event — company, title, dietary and seating notes.',
                'fields' => [
                    $this->f('full_name', 'Full Name', 'text', true),
                    $this->f('email', 'Email Address', 'email', true),
                    $this->f('phone', 'Phone Number', 'phone', true),
                    $this->f('company', 'Company / Organisation', 'text', true),
                    $this->f('job_title', 'Job Title', 'text', false),
                    $this->f('dietary', 'Dietary Requirement', 'select', true, ['None', 'Vegetarian', 'Vegan', 'Halal', 'No Pork / No Lard', 'Gluten-Free', 'Nut Allergy', 'Other']),
                    $this->f('seating_notes', 'Seating preference or requests', 'textarea', false),
                ],
            ],
            [
                'name' => 'Training / Workshop',
                'description' => 'Learning session — captures department, experience level and topic preference.',
                'fields' => [
                    $this->f('full_name', 'Full Name', 'text', true),
                    $this->f('email', 'Corporate Email', 'email', true),
                    $this->f('employee_id', 'Employee ID', 'text', true),
                    $this->f('department', 'Department', 'select', true, $dept),
                    $this->f('experience_level', 'Experience Level', 'radio', true, ['Beginner', 'Intermediate', 'Advanced']),
                    $this->f('accommodations', 'Any accessibility or dietary needs?', 'textarea', false),
                ],
            ],
        ];
    }
}
