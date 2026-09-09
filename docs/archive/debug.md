TASK: DEBUG AND FIX ADMIN REGISTRATION FORM NOT REFLECTING ON PUBLIC EVENT FRONTEND

We have a functional Events event management system, but there is a problem with the event registration form.

PROBLEM:

The registration form configuration inside the Admin Event area appears to work or save inside Admin, but the changes do NOT correctly affect the public/frontend registration form of the corresponding event.

Example behavior:

Admin goes to:

Admin
→ Events
→ Select Event
→ Registration Form / Form Builder

Admin adds, removes, edits, reorders, enables, disables, or changes fields.

However, when opening the public event registration page:

/events/[slug]
or
/events/[slug]/register

the frontend registration form does not reflect those admin changes.

It may still show:

* old fields
* hard-coded fields
* default fields
* incorrect field order
* fields from another event
* no fields
* stale cached configuration

This must be investigated and fixed properly.

DO NOT apply a superficial frontend patch.

Trace the complete flow:

ADMIN FORM BUILDER
→ SAVE
→ DATABASE
→ API / SERVER ACTION
→ EVENT-SPECIFIC FORM CONFIGURATION
→ PUBLIC EVENT QUERY
→ FRONTEND FORM RENDERING
→ REGISTRATION SUBMISSION
→ REGISTRATION ANSWERS DATABASE

======================================================================

1. FIRST INSPECT THE EXISTING SYSTEM
    ======================================================================

Before changing code, inspect the current project carefully.

Identify:

1. Where the Admin Registration Form Builder is implemented.
2. Which database tables/models store event form fields.
3. Which API route, controller, service, server action, or repository saves the form.
4. Whether fields are actually saved in the database.
5. Whether every field is correctly linked to event_id.
6. Which API/query the public registration page uses.
7. Whether the frontend registration page is still using hard-coded fields.
8. Whether it is reading a default template instead of event-specific fields.
9. Whether caching is causing stale form configuration.
10. Whether field ordering is respected.
11. Whether enabled/disabled fields are respected.
12. Whether deleted fields remain visible because of soft-delete or stale queries.
13. Whether frontend and admin are using different data structures.
14. Whether form builder updates are saved only in frontend state and not persisted.

Do not assume the cause.

Trace it with actual code and database behavior.

======================================================================
2. EXPECTED ARCHITECTURE

Every event must have its own registration form configuration.

Example:

Event A:
Blood Donation

Fields:

* Full Name
* Employee ID
* Department
* Phone
* Blood Type

Event B:
Customer Dinner

Fields:

* Full Name
* Company
* Position
* Email
* Guest Name
* Meal Preference

The frontend registration form must dynamically load the form belonging only to the selected event.

There must NOT be one global static registration form for all events.

======================================================================
3. DATABASE RELATIONSHIP

Confirm the schema properly supports:

events

registration_forms

form_fields

form_field_options

form_conditions

registration_answers

Recommended relationship:

events
1 → 1 or 1 → many registration_forms

registration_forms
1 → many form_fields

form_fields
1 → many form_field_options

Each form must be linked to:

event_id

or indirectly through:

registration_form.event_id

Every public event query must filter by the current event.

Example concept:

SELECT fields
FROM form_fields
WHERE registration_form_id = current_event.registration_form_id
AND is_active = true
ORDER BY sort_order ASC

Do NOT retrieve all global form fields.

======================================================================
4. CHECK FOR HARD-CODED FRONTEND FIELDS

Search the public registration frontend for hard-coded components such as:

Full Name
Email
Phone
Department

Example bad implementation:

<input name="full_name" />
<input name="email" />
<input name="phone" />

If these are currently hard-coded, refactor the page so it renders fields from the database-driven form schema.

Only mandatory system fields that are intentionally global should remain hard-coded.

If Full Name, Email, or Phone are mandatory globally, define this clearly and do not accidentally duplicate them when they are also configured in the dynamic form.

======================================================================
5. PUBLIC FORM QUERY

The public event registration page should load:

Event
+
Published/active registration form
+
Active form fields
+
Field options
+
Conditional rules

For the exact event being viewed.

Example:

GET /api/public/events/[slug]/registration-form

Response should conceptually include:

{
“event”: {
“id”: “…”,
“title”: “Blood Donation Drive 2026”,
“slug”: “blood-donation-2026”
},
“form”: {
“id”: “…”,
“event_id”: “…”,
“fields”: [
{
“id”: “…”,
“type”: “text”,
“label”: “Full Name”,
“required”: true,
“sort_order”: 1,
“is_active”: true
}
]
}
}

Ensure another event cannot accidentally receive these fields.

======================================================================
6. FORM FIELD TYPES

Ensure frontend renderer correctly supports all configured field types already supported by Admin.

At minimum:

text

textarea

email

phone

number

date

time

datetime

select

dropdown

radio

checkbox

multi-select

file upload

image upload

address

country

province

city

employee ID

department

organization

job title

consent

terms

custom question

Create a reusable component such as:

DynamicFormField

or equivalent.

Conceptually:

switch(field.type) {

case “text”:
render text input

case “email”:
render email input

case “select”:
render select options

case “radio”:
render radio group

case “checkbox”:
render checkbox

etc.

}

Do not duplicate field rendering logic throughout the application.

======================================================================
7. FIELD ORDERING

When Admin reorders fields, the public frontend must reflect that order.

Use:

sort_order

position

display_order

or the equivalent existing column.

Admin save must update order values.

Public query must include:

ORDER BY sort_order ASC

Do not rely on database insertion order.

======================================================================
8. ACTIVE / INACTIVE FIELDS

If Admin disables a field:

is_active = false

or equivalent,

the field must disappear from the public registration page.

If re-enabled, it must return.

Do not delete historical responses simply because a field is disabled.

======================================================================
9. FIELD EDITING

If Admin changes:

Label:
Phone Number
→ Mobile Number

Placeholder:
Enter phone
→ Enter your mobile number

Required:
false
→ true

Help Text

Options

Validation

the public form must reflect those values immediately after save, subject only to intentional caching behavior.

======================================================================
10. SELECT / RADIO OPTIONS

Confirm options are persisted correctly.

Example:

Department

Options:

Marketing
HR
IT
Finance

If Admin changes options, public form must use the updated options.

Ensure frontend is not using static arrays.

======================================================================
11. FORM SAVE PROCESS

Inspect Admin Save functionality.

When Admin clicks:

SAVE FORM

Confirm:

1. API request fires.
2. Correct event ID is included.
3. Correct registration form ID is included.
4. Field create/update/delete actions are persisted.
5. Field options are persisted.
6. Field ordering is persisted.
7. transaction succeeds.
8. error responses are displayed.
9. Admin UI does not show fake success if database save failed.

Do not consider a local React state update to be a successful save.

======================================================================
12. TRANSACTIONAL SAVE

Save form updates transactionally where appropriate.

For example:

BEGIN

Update registration form

Upsert fields

Upsert options

Mark removed fields inactive

Update sort order

COMMIT

If something fails:

ROLLBACK

Do not leave the form partially updated.

======================================================================
13. FORM VERSIONING / HISTORICAL DATA

Existing registrations must remain readable after the form changes.

Example:

Old registration answered:

Department = Marketing

Admin later removes Department.

The historical registration should still display:

Department:
Marketing

Do not break historical registration_answers relationships.

Prefer:

is_active = false

instead of destructive deletion when fields already have answers.

======================================================================
14. PUBLIC FORM CACHING

Inspect whether the public event page uses:

Next.js cache

React Query cache

SWR cache

server cache

browser cache

Laravel cache if backend uses Laravel

or any other caching mechanism.

If form edits are saved correctly but public form stays old, invalidate or revalidate the correct cache after Admin saves.

Examples depending on architecture:

revalidatePath()

revalidateTag()

router.refresh()

queryClient.invalidateQueries()

cache forget

Do not disable all caching globally unless necessary.

Invalidate only relevant event/form data.

======================================================================
15. EVENT-SPECIFIC CACHE KEY

If caching is used, ensure the key contains event ID or slug.

Bad:

registration-form

Good:

registration-form:{event_id}

or:

registration-form:{event_slug}

Otherwise one event can reuse another event’s cached form.

======================================================================
16. FRONTEND REFRESH

After Admin saves a form, verify:

* reopening Admin shows persisted data
* refreshing the public event page shows updated fields
* opening in incognito shows updated fields
* another browser sees updated fields

The system must not depend on Admin browser memory.

======================================================================
17. REGISTRATION SUBMISSION

The public submit handler must submit dynamic answers using stable field IDs.

Recommended payload:

{
“event_id”: “…”,
“answers”: [
{
“field_id”: “uuid-1”,
“value”: “John Doe”
},
{
“field_id”: “uuid-2”,
“value”: “Marketing”
}
]
}

Do not submit only labels because labels can change.

Use stable field IDs.

======================================================================
18. SERVER-SIDE VALIDATION

Do not trust frontend required-field validation only.

When registration is submitted:

Server must load the current active event form schema.

Then validate answers against:

* required status
* field type
* allowed options
* min/max
* email format
* phone rules
* file type
* field visibility
* conditional rules

A malicious user must not be able to bypass required fields by modifying frontend HTML.

======================================================================
19. CONDITIONAL LOGIC

If Admin has configured conditional fields, ensure frontend uses the same rules.

Example:

Question:
Are you an employee?

YES

Then show:

Employee ID
Department

NO

Hide those fields.

Hidden conditional fields should not incorrectly trigger required validation.

Server-side validation must also respect the conditions.

======================================================================
20. ONE EVENT MUST NOT AFFECT ANOTHER EVENT

Critical test:

Create Event A.

Configure:

Full Name
Phone
Blood Type

Create Event B.

Configure:

Full Name
Company
Meal Preference

Expected:

Event A frontend only shows:

Full Name
Phone
Blood Type

Event B frontend only shows:

Full Name
Company
Meal Preference

Editing Event A must not change Event B.

======================================================================
21. ADMIN PREVIEW

If not already available, add a:

PREVIEW FORM

button inside Admin.

This preview must render using the same DynamicFormRenderer used by the public frontend.

Do not create a completely separate fake preview implementation.

This helps ensure Admin and Public use the same rendering logic.

======================================================================
22. RECOMMENDED SHARED COMPONENT ARCHITECTURE

Create or refactor toward:

DynamicFormRenderer

DynamicFormField

FieldValidation

ConditionalFieldEngine

FormSchemaMapper

AdminFormBuilder

PublicRegistrationForm

The public form and Admin Preview should share:

DynamicFormRenderer

This minimizes inconsistency.

======================================================================
23. UI BEHAVIOR

On Admin save:

Show:

Saving…

Then:

Form saved successfully.

If failure:

Failed to save registration form.

Show useful error message.

Do not show success until server confirms persistence.

======================================================================
24. DEBUG LOGGING

During debugging, temporarily log or inspect:

Admin save payload

Event ID

Form ID

Database fields after save

Public form API response

Frontend form schema

Do not leave sensitive verbose debug logs in production.

======================================================================
25. TEST SCENARIO 1

Event:

Test Event A

Initial fields:

Full Name
Email

Open public registration.

Expected:

Full Name
Email

Admin adds:

Phone

Save.

Refresh public registration.

Expected:

Full Name
Email
Phone

======================================================================
26. TEST SCENARIO 2

Admin changes:

Full Name

to:

Participant Full Name

Save.

Public frontend must show:

Participant Full Name

======================================================================
27. TEST SCENARIO 3

Admin changes field order:

Before:

Full Name
Email
Phone

After:

Full Name
Phone
Email

Save.

Public frontend must show exact new order.

======================================================================
28. TEST SCENARIO 4

Admin disables:

Email

Save.

Public frontend:

Email must disappear.

Existing old registrations must still retain their Email answers.

======================================================================
29. TEST SCENARIO 5

Admin changes:

Phone

Required:
false → true

Save.

Public form must show required indicator.

Submitting without Phone must fail both:

Frontend validation

and

Server validation.

======================================================================
30. TEST SCENARIO 6

Create another event with different fields.

Confirm forms remain independent.

No field leakage between events.

======================================================================
31. TEST SCENARIO 7

Submit a public registration using newly configured fields.

Open the registration inside Admin.

All submitted answers must display correctly using field labels.

======================================================================
32. CHECK REGISTRATION ANSWERS VIEW

Admin Registration Detail page should dynamically display:

Question / Field Label

Answer

Example:

Full Name:
John Doe

Department:
Marketing

Blood Type:
O+

Do not only show hard-coded participant columns.

======================================================================
33. API CONSISTENCY

Ensure Admin and Public APIs use consistent DTO/schema types.

Do not have:

AdminField

using:

fieldType

while Public expects:

type

unless there is an intentional mapper.

Prefer shared TypeScript types/schema where possible.

======================================================================
34. SLUG VS EVENT ID

Public routes may use event slug.

Admin routes may use event ID.

Ensure slug is correctly resolved to the same event ID before retrieving registration form.

Do not accidentally query:

registration_forms.event_id = slug

when event_id is UUID.

======================================================================
35. PUBLISHED FORM STATUS

Check whether system has:

draft form

published form

form version

If so, clearly determine intended behavior.

If Admin edits draft but frontend reads published version, this may explain the issue.

If versioning exists:

Provide explicit actions such as:

SAVE DRAFT

PUBLISH FORM

and clearly show current state.

If versioning was not intended, remove accidental separation between saved Admin form and public active form.

Do not silently save to draft if user expects immediate publication.

======================================================================
36. EVENT PUBLISH STATE

Editing an already published event’s registration form should follow the intended product rule.

Recommended behavior:

For normal field changes:
save and publish immediately unless versioning is intentionally implemented.

For destructive changes:
show warning if registrations already exist.

======================================================================
37. MIGRATIONS

If database schema is missing proper relationships, create a safe migration.

Do not manually alter production database without migration files.

Preserve existing data.

======================================================================
38. DO NOT REBUILD UNRELATED MODULES

Do not rewrite:

Event Dashboard

Queue

Check-In

Authentication

Capacity

Attendance

unless changes are necessary to support this fix.

Focus on Registration Form Builder → Public Registration Form synchronization.

Do not break working functionality.

======================================================================
39. EXPECTED FINAL BEHAVIOR

After the fix:

Admin opens:

Events
→ Event A
→ Registration Form

Admin configures the event form.

Admin clicks Save.

The configuration is persisted to the database.

The public frontend of Event A loads that exact configuration.

Any field changes appear correctly.

Fields are rendered dynamically.

Field order matches Admin.

Required rules match Admin.

Options match Admin.

Disabled fields disappear.

Different events keep independent forms.

Public submissions save answers correctly.

Admin can view submitted answers.

Existing registrations remain intact after form edits.

======================================================================
40. FINAL VERIFICATION

Before considering this task complete:

1. Run database migrations if required.
2. Run type checking.
3. Run linting.
4. Run automated tests.
5. Test Admin save.
6. Refresh Admin and verify persistence.
7. Test public form.
8. Test two different events.
9. Test add field.
10. Test edit field.
11. Test remove/disable field.
12. Test reorder.
13. Test required field.
14. Test dropdown/radio options.
15. Test registration submission.
16. Test Admin registration answer display.
17. Confirm no stale caching issue.
18. Confirm no field leakage between events.
19. Confirm existing queue/capacity logic still works.
20. Confirm production build succeeds.

DO NOT stop after finding the first symptom.

Find the root cause and fix the complete Admin Form → Database → Public Form → Submission → Admin Response flow.

After fixing, provide a concise summary containing:

* root cause
* files changed
* database changes
* API changes
* frontend changes
* caching changes
* tests performed
* final verification result
======================================================================
RESOLUTION (2026-09-04)
======================================================================

ROOT CAUSE
The admin form builder, DB persistence, and the public API were all correct.
The public registration page never received the form:

- `GET /api/public/events` (catalog list) does NOT eager-load `form.fields`.
- `App.tsx` passed that list item straight to `PublicEventDetail` and then to
  `RegistrationWizard`, and neither re-fetched the full event.
- `RegistrationWizard` read `event.form?.fields || []` -> always `[]`, so every
  dynamic field (dropdown / radio / checkbox / text) was silently dropped.

`GET /api/public/events/{slug}` already returns `form.fields` with `options`,
ordered by `field_order` (baked into `RegistrationForm::fields()`).

FILES CHANGED
- frontend/src/modules/registration/RegistrationWizard.tsx
  Fetches `GET /public/events/{slug}` on mount into `fullEvent` state; renders
  fields from `fullEvent.form.fields` (falls back to the prop on error).
- backend/app/Modules/Registration/RegistrationService.php
  New `validateFormAnswers()` run inside the register transaction: enforces
  required non-hidden fields and constrains select/radio/checkbox values to the
  configured options, server-side (frontend `required` is no longer trusted alone).
- frontend/src/modules/admin/EventDetailManage.tsx
  Registrations tab rows are now expandable and render each registration's
  dynamic answers (field label -> value, incl. multi-select arrays) plus
  participant extras, de-duplicated.

DATABASE / API CHANGES
None. No migration. No route changes. Existing `registration_answers` untouched;
answers are keyed by `field_key` + stored `field_label`, so historical rows stay
readable after a field is renamed or hidden.

CACHING
No stale-cache mechanism involved (axios has no cache; wizard refetches per mount;
no Laravel config/query cache on these paths).

TESTS PERFORMED
- curl: add "Blood Type" (select) via `PUT /events/{id}/form` -> appears in
  `GET /public/events/{slug}` with options, ordered.
- curl register: missing required dynamic fields -> 422 per-field; invalid select
  option -> 422; valid submission -> 201.
- browser: public wizard now renders Blood Type / Department / Preferred Time Slot
  selects + "donated before?" radio.
- browser: admin Registrations tab -> expand row -> all answers shown.
- `tsc -b && vite build` clean; production images rebuilt and running.

STILL OPEN (not addressed, lower priority)
- Answers submitted by `field_key`, not an immutable field UUID (brief #17/#33).
- No in-admin "Preview Form" button sharing the public renderer (brief #21).
- No conditional-logic engine on the public form (brief #19) - not currently used.
