PROJECT TASK: COMPLETE SYSTEM AUDIT, QA TESTING, DEBUGGING, ERROR FIXING AND PRODUCTION READINESS VERIFICATION

PROJECT:
Events Multi-Event Management Platform

IMPORTANT CONTEXT:

The project is already built and considered functionally complete.

DO NOT rebuild the application.

DO NOT replace working modules unnecessarily.

DO NOT redesign the application unless a UI issue directly affects usability or functionality.

Your task is to perform a complete technical audit, functional verification, regression test, database review, security review, debugging process and production-readiness check of the existing Events project.

The goal is:

INSPECT
→ TEST
→ IDENTIFY PROBLEMS
→ FIND ROOT CAUSE
→ FIX
→ RETEST
→ VERIFY
→ DOCUMENT

The application must remain functional throughout the process.

======================================================================

1. PRIMARY OBJECTIVE
   ======================================================================

Perform a full end-to-end audit of the existing Events system.

Verify that:

* every major module works
* database relationships are correct
* forms save correctly
* frontend reflects admin configuration
* registration works
* event capacity works
* waitlist works
* queue promotion works
* QR generation works
* check-in works
* attendance works
* permissions work
* reports work
* exports work
* notifications work
* event statuses work
* responsive layouts work
* validation works
* security protections work
* no major console/server/database errors remain
* no broken routes remain
* no broken APIs remain
* no regression issues remain

Fix any defects found.

Do not stop after identifying errors.

Resolve the root cause and verify the fix.

======================================================================
2. CRITICAL RULE — DO NOT BREAK WORKING FEATURES
================================================

Before changing any existing functionality:

1. inspect the current implementation
2. understand its dependencies
3. understand database relationships
4. understand routes/controllers/services
5. understand frontend dependencies
6. determine whether the issue is isolated or systemic
7. make the smallest safe correction
8. retest affected functionality
9. regression-test nearby modules

Do not rewrite working modules simply because another implementation might be cleaner.

Preserve existing user-facing functionality whenever possible.

======================================================================
3. CREATE A SAFE AUDIT CHECKPOINT
=================================

Before making changes:

* inspect Git status if Git is being used
* identify uncommitted work
* do not delete user changes
* create a safe checkpoint/commit if appropriate
* verify environment configuration
* verify database connection
* verify required environment variables

Do not reset or overwrite existing user work.

======================================================================
4. FIRST INSPECT THE PROJECT
============================

Before running fixes, map the current architecture.

Identify:

* framework
* PHP version if applicable
* Laravel version if applicable
* frontend framework
* CSS framework
* JavaScript libraries
* database type
* database schema
* authentication system
* authorization implementation
* routes
* controllers
* services
* models
* middleware
* jobs
* queues
* notification providers
* QR libraries
* export libraries
* PDF libraries
* file storage
* test framework
* deployment structure

Create an internal understanding of:

PUBLIC FLOW

ADMIN FLOW

REGISTRATION FLOW

QUEUE FLOW

CHECK-IN FLOW

REPORTING FLOW

Do not assume architecture from previous instructions.

Use the actual existing project.

======================================================================
5. INSTALLATION AND DEPENDENCY CHECK
====================================

Verify all required dependencies.

If Laravel/PHP:

Check:

php -v

composer --version

composer install

php artisan --version

php artisan about

If Node frontend assets are used:

node -v

npm -v

npm install

Check for:

missing packages
outdated lock files
dependency conflicts
broken imports
unsupported versions

Do not unnecessarily upgrade major framework versions during QA.

Only update dependencies when necessary to resolve an actual compatibility or security problem.

======================================================================
6. ENVIRONMENT CONFIGURATION CHECK
==================================

Verify .env configuration.

Check:

APP_ENV

APP_KEY

APP_DEBUG

APP_URL

DB_CONNECTION

DB_HOST

DB_PORT

DB_DATABASE

DB_USERNAME

DB_PASSWORD

MAIL settings

FILESYSTEM settings

QUEUE settings

CACHE settings

SESSION settings

Do not expose secrets.

For production:

APP_DEBUG must be false.

======================================================================
7. APPLICATION BOOT TEST
========================

Verify application starts successfully.

For Laravel:

php artisan optimize:clear

php artisan config:clear

php artisan cache:clear

php artisan route:clear

php artisan view:clear

Then test application.

Verify there are no:

Fatal errors

Class not found errors

Missing service providers

Missing packages

Invalid routes

Database connection errors

Environment configuration errors

======================================================================
8. DATABASE CONNECTION TEST
===========================

Verify:

database connects successfully

all expected tables exist

migrations are synchronized

foreign keys are valid

indexes exist

relationships are valid

no obvious orphan records exist

Check migration status:

php artisan migrate:status

Do not automatically run destructive migrations.

If schema changes are required:

create safe migrations

preserve existing data

======================================================================
9. DATABASE SCHEMA AUDIT
========================

Review core tables.

Expected modules may include:

users

roles

permissions

events

event_categories

event_locations

event_staff

registration_forms

form_fields

form_field_options

participants

registrations

registration_answers

registration_status_history

waitlist_history

tickets

checkins

attendance

notification_templates

notification_logs

event_templates

audit_logs

Verify:

primary keys

foreign keys

unique constraints

nullable rules

default values

timestamps

indexes

cascade behavior

Do not allow accidental cascading deletion of critical historical data.

======================================================================
10. DATA INTEGRITY CHECK
========================

Look for:

registrations without events

registrations without participants

answers without registrations

answers referencing missing fields

tickets without registrations

check-ins without registrations

duplicate registration numbers

duplicate ticket tokens

duplicate queue records

invalid statuses

queue positions referencing confirmed users

confirmed registrations above capacity

orphan event staff

broken form relationships

Fix structural issues safely.

Do not delete user data without strong justification.

======================================================================
11. ROUTE AUDIT
===============

List and inspect all application routes.

For Laravel:

php artisan route:list

Check for:

duplicate routes

incorrect route names

broken middleware

missing authentication middleware

admin routes exposed publicly

invalid controller references

wrong parameter binding

slug/ID conflicts

dead routes

Test important routes manually.

======================================================================
12. AUTHENTICATION TEST
=======================

Test:

Login

Logout

Invalid credentials

Session expiration

Remember me if implemented

Password reset if implemented

Protected route access

Unauthenticated admin access

Expected:

Unauthenticated user cannot access admin pages.

Authenticated user can access only permitted pages.

======================================================================
13. AUTHORIZATION AND ROLE TEST
===============================

Test each role.

Super Admin

Event Admin

Event Organizer

Registration Officer

Check-In Staff

Viewer

Participant

Verify server-side permissions.

Do not only inspect hidden buttons.

Attempt direct route/API access.

Example:

Check-In Staff should not be able to modify event settings by manually entering an admin URL.

Viewer should not be able to approve registrations.

Event Admin should not access unauthorized events.

======================================================================
14. ADMIN DASHBOARD TEST
========================

Verify:

dashboard loads

statistics are correct

event counts are correct

registration counts are correct

attendance figures are correct

recent activity loads

charts load

no console errors

no server errors

no SQL errors

Test empty database states as well.

======================================================================
15. EVENT CREATION TEST
=======================

Create a test event.

Verify every step:

Basic Information

Date and Time

Location

Registration Settings

Registration Form

Capacity

Waitlist

Ticket Settings

Notifications

Team

Review

Publish

Verify draft saving.

Verify editing.

Verify publishing.

Verify frontend event appears correctly.

======================================================================
16. EVENT EDIT TEST
===================

Edit an existing event.

Change:

Title

Description

Date

Venue

Capacity

Registration dates

Banner

Contact details

Verify:

database updates

admin reflects updates

public frontend reflects updates

cached data refreshes correctly

Do not allow edits to unexpectedly reset registrations.

======================================================================
17. EVENT STATUS TEST
=====================

Verify statuses:

Draft

Upcoming

Registration Open

Full

Registration Closed

Ongoing

Completed

Cancelled

Archived

Test automatic status calculation.

Test manual override if available.

Verify incorrect status transitions do not occur.

======================================================================
18. PUBLIC EVENT LIST TEST
==========================

Verify:

event cards load

event image loads

title loads

date loads

venue loads

status badge is correct

registration CTA is correct

search works

filters work

pagination works if implemented

completed events display correctly

private events are hidden where required

======================================================================
19. EVENT DETAIL PAGE TEST
==========================

Verify each event page displays:

title

description

cover

date

time

venue

location

contact

capacity information

registration status

registration button

map if applicable

terms

attachments

Test missing optional fields.

Page must not crash when optional data is empty.

======================================================================
20. ADMIN REGISTRATION FORM BUILDER TEST
========================================

This module is critical.

Test:

Add field

Edit field

Delete/disable field

Required toggle

Optional toggle

Reorder fields

Dropdown options

Radio options

Checkbox options

Help text

Placeholder

Conditional fields

Save

Refresh Admin

Confirm persisted data remains.

======================================================================
21. ADMIN FORM → FRONTEND SYNC TEST
===================================

Create Event A.

Form:

Full Name
Phone
Department

Save.

Open public registration.

Expected:

Full Name
Phone
Department

Then Admin adds:

Blood Type

Save.

Refresh public frontend.

Expected:

Full Name
Phone
Department
Blood Type

Repeat tests for:

Edit label

Remove field

Disable field

Reorder field

Required field

Dropdown options

Ensure frontend reflects Admin configuration.

======================================================================
22. MULTI-EVENT FORM ISOLATION TEST
===================================

Create:

Event A

Fields:

Name
Phone
Blood Type

Create:

Event B

Fields:

Name
Company
Position
Meal Preference

Expected:

Event A only displays Event A form.

Event B only displays Event B form.

No field leakage.

No shared wrong cached form.

======================================================================
23. REGISTRATION SUBMISSION TEST
================================

Test successful registration.

Verify:

form validation

server validation

registration created

participant created or linked

form answers stored

registration number generated

correct status assigned

ticket generated if applicable

notification queued/sent

admin registration list updated

dashboard statistics updated

======================================================================
24. REGISTRATION NUMBER TEST
============================

Verify registration numbers are:

unique

sequential where required

event-specific

permanent

not duplicated under concurrency

Example:

BD26-000001

BD26-000002

BD26-000003

Cancellation must not cause reuse of old numbers.

======================================================================
25. DUPLICATE REGISTRATION TEST
===============================

Test duplicate detection using configured fields.

Examples:

same email

same phone

same employee ID

Verify behavior matches event settings.

Ensure another event can accept the same participant where permitted.

======================================================================
26. CAPACITY TEST
=================

Create test event.

Capacity:

3

Register:

Participant A

Participant B

Participant C

Expected:

All Confirmed.

Register Participant D.

Expected:

Waitlisted #1

Register Participant E.

Expected:

Waitlisted #2

Confirmed must remain:

3

======================================================================
27. WAITLIST QUEUE TEST
=======================

Verify:

queue ordering

queue position

waitlist timestamps

queue page

participant queue status

Expected:

D = Queue #1

E = Queue #2

No gaps.

======================================================================
28. AUTOMATIC QUEUE PROMOTION TEST
==================================

Using:

A Confirmed

B Confirmed

C Confirmed

D Queue #1

E Queue #2

Cancel B.

Expected:

D becomes Confirmed.

E becomes Queue #1.

D registration number remains unchanged.

Verify:

status history

promotion timestamp

notification

ticket generation if required

capacity remains correct.

======================================================================
29. WAITLIST CANCELLATION TEST
==============================

Queue:

#1 D

#2 E

#3 F

Cancel E.

Expected:

#1 D

#2 F

No gap.

======================================================================
30. CAPACITY INCREASE TEST
==========================

Capacity:

3

Confirmed:

3

Queue:

5

Increase capacity to:

5

Expected:

first two queue participants promoted.

Confirmed:

5

Remaining Queue:

3

Verify notification and queue recalculation.

======================================================================
31. CAPACITY DECREASE TEST
==========================

Capacity:

100

Confirmed:

95

Reduce capacity to:

80

Expected:

Do not automatically remove confirmed users.

Show over-capacity warning:

15

Verify system remains stable.

======================================================================
32. CONCURRENCY TEST
====================

This is critical.

Test multiple simultaneous registrations for the final available slot.

Example:

Capacity:
100

Confirmed:
99

Simulate multiple registration requests.

Expected:

Only one additional registration becomes Confirmed.

Others become Waitlisted.

Never allow:

Confirmed > Capacity

unless explicit administrator override exists.

Inspect database transaction and locking logic.

Fix race conditions if found.

======================================================================
33. MANUAL APPROVAL TEST
========================

For Manual Approval event:

Register participant.

Expected:

Pending.

Admin approves.

If capacity available:

Confirmed.

If capacity full:

Waitlisted.

Test rejection.

Test status history.

======================================================================
34. ADMIN MANUAL REGISTRATION TEST
==================================

Admin manually creates registration.

Verify:

same validation

same capacity rules

same queue rules

same registration number generation

same participant logic

Admin registration must not bypass critical business rules accidentally.

======================================================================
35. REGISTRATION DETAIL TEST
============================

Verify Admin can view:

registration number

participant information

form answers

status

queue history

ticket

notification history

attendance

notes

status history

Test both old and new registrations.

======================================================================
36. PARTICIPANT SEARCH TEST
===========================

Test search by:

name

registration number

email

phone

employee ID

Ensure event-level search only returns records from that event unless global search is intended.

======================================================================
37. PARTICIPANT PORTAL TEST
===========================

Test participant secure link.

Verify:

registration information

event information

status

queue position

ticket

cancellation option

privacy

Ensure one participant cannot view another participant's data by changing URL IDs.

======================================================================
38. QR TICKET GENERATION TEST
=============================

Verify:

QR generated for Confirmed participant

unique token

ticket page works

QR does not contain sensitive information

token is unpredictable

ticket cannot be guessed sequentially

cancelled ticket behaves correctly

======================================================================
39. QR SCANNER TEST
===================

Test on:

Desktop with camera if available

Android

iPhone/iOS if available or simulated where possible

Verify:

camera permission

rear camera

scan success

invalid QR

wrong event QR

cancelled participant

waitlisted participant

already checked-in participant

======================================================================
40. CHECK-IN TEST
=================

For valid Confirmed registration:

Scan QR.

Expected:

participant found

status displayed

check-in available

Check In.

Expected:

check-in timestamp stored

user who checked in stored

attendance updated

dashboard updated

======================================================================
41. DUPLICATE CHECK-IN TEST
===========================

Scan already checked-in participant again.

Expected:

ALREADY CHECKED IN

Show existing check-in time.

Do not create duplicate records.

======================================================================
42. MANUAL CHECK-IN TEST
========================

Search registration manually.

Check in participant.

Verify same business logic as QR check-in.

======================================================================
43. CHECK-IN PERMISSION TEST
============================

Check-In Staff:

Can scan/check in.

Cannot:

Edit event

Change capacity

Manage roles

Delete registrations

Test direct URL access as well.

======================================================================
44. ATTENDANCE TEST
===================

Verify:

Checked-In

Attended

No Show

Cancellation

Admin correction if implemented

Check final attendance calculations.

No Show should not include:

Cancelled

Rejected

Waitlisted users who were never confirmed.

======================================================================
45. NOTIFICATION TEST
=====================

Test:

Registration Received

Confirmed

Pending

Waitlisted

Promoted

Rejected

Cancelled

Reminder

Event Changed

Event Cancelled

Post-Event message

Verify:

correct participant

correct event

correct variables

no broken placeholders

correct URLs

notification log stored

======================================================================
46. EMAIL TEMPLATE VARIABLE TEST
================================

Verify variables such as:

{{participant_name}}

{{registration_number}}

{{event_name}}

{{event_date}}

{{event_time}}

{{event_location}}

{{queue_position}}

{{ticket_url}}

No unresolved raw variables should appear in sent messages.

======================================================================
47. REPORT TEST
===============

Verify event reports:

Registration Summary

Confirmed

Waitlist

Attendance

No Show

Cancellation

Location

Source

Ensure data totals match database.

======================================================================
48. CSV EXPORT TEST
===================

Export registrations.

Verify:

file downloads

headers correct

UTF-8 encoding

special characters work

Khmer characters display correctly

correct event only

correct filters applied

======================================================================
49. EXCEL EXPORT TEST
=====================

Verify:

valid XLSX

columns correct

Khmer Unicode works

dates formatted

numbers not corrupted

registration numbers preserved

large dataset works

======================================================================
50. PDF EXPORT TEST
===================

Verify:

PDF renders

no overlapping content

correct event

correct totals

Khmer text if supported by current PDF font setup

no broken logo/images

no debug messages

======================================================================
51. FILTER TEST
===============

Test registration filters:

Confirmed

Pending

Waitlisted

Rejected

Cancelled

Checked In

No Show

Date

Department

Location

Registration Source

Test combined filters.

======================================================================
52. PAGINATION TEST
===================

Verify:

page 1

next page

previous page

page size

filters with pagination

search with pagination

No duplicate/missing rows when navigating.

======================================================================
53. SORTING TEST
================

Test sorting:

Registration Date

Name

Status

Queue Position

Registration Number

Ensure queue sort reflects actual waitlist logic.

======================================================================
54. FILE UPLOAD TEST
====================

If file uploads exist:

Test:

allowed file

invalid extension

large file

duplicate filename

special filename

malicious-looking filename

Ensure:

storage works

filename sanitized

file type validated

file size validated

file cannot execute as code

======================================================================
55. EVENT IMAGE TEST
====================

Test:

upload cover

replace cover

remove cover

missing image

large image

mobile rendering

broken URL handling

======================================================================
56. CALENDAR TEST
=================

If calendar exists:

Verify:

event appears on correct date

registration opening appears correctly if intended

registration closing appears correctly

timezone correct

month navigation works

Google Calendar link works

ICS file works

======================================================================
57. TIMEZONE TEST
=================

Verify timestamps stored consistently.

Test event timezone.

Verify:

registration opening

registration closing

event start

event end

check-in time

notification time

Ensure Cambodia timezone events show correctly if timezone is Asia/Phnom_Penh or configured equivalent.

======================================================================
58. SEARCH TEST
===============

Test:

exact search

partial search

case-insensitive search

Khmer text if supported

special characters

empty search

large result set

Search must not expose unauthorized records.

======================================================================
59. ADMIN EVENT DUPLICATION TEST
================================

Duplicate event.

Expected copied:

configuration

form fields

capacity settings

notifications

selected team/template settings

Expected NOT copied:

registrations

attendance

tickets

queue records

registration history

======================================================================
60. EVENT TEMPLATE TEST
=======================

Create template.

Create event from template.

Verify:

fields copied

settings copied

no participant data copied

editing new event does not modify original template unexpectedly.

======================================================================
61. AUDIT LOG TEST
==================

Perform:

event edit

capacity edit

registration approve

registration cancel

queue promotion

check-in

permission change

Verify audit entries record:

user

action

entity

timestamp

before/after where appropriate

Normal users must not edit audit history.

======================================================================
62. SECURITY ROUTE TEST
=======================

Attempt direct access to unauthorized routes.

Examples:

/admin

/admin/users

/admin/settings

/admin/events/[unauthorized-event]

API endpoints

Expected:

403 or appropriate redirect.

Never return sensitive data.

======================================================================
63. IDOR SECURITY TEST
======================

Test Insecure Direct Object Reference risks.

Example:

Participant A URL:

/registration/123

Attempt:

/registration/124

Participant A must not see Participant B.

Admin assigned Event A must not access Event B using changed ID.

Fix all object-level authorization issues.

======================================================================
64. INPUT VALIDATION TEST
=========================

Test:

empty required values

very long text

invalid email

invalid phone

negative numbers

invalid date

invalid event ID

invalid registration ID

unexpected JSON

HTML

JavaScript-like input

SQL-like input

Application should reject or safely handle malicious/invalid inputs.

======================================================================
65. XSS TEST
============

Test user-controlled fields such as:

name

event description

custom questions

notes

Try harmless test payload:

<script>alert('test')</script>

It must render safely as text or be sanitized.

Do not allow executable script injection.

======================================================================
66. SQL INJECTION REVIEW
========================

Inspect raw SQL.

Ensure parameter binding.

If using Eloquent/Query Builder, verify no unsafe string concatenation.

Especially inspect:

search

filters

sorting

reports

exports

admin custom queries

======================================================================
67. CSRF TEST
=============

Ensure state-changing web requests are protected.

Test:

event update

registration action

check-in

role change

settings

Do not disable CSRF globally.

======================================================================
68. SESSION SECURITY CHECK
==========================

Review:

secure cookies

HTTP only

same-site

session expiration

logout invalidation

session fixation protection

production HTTPS behavior

======================================================================
69. RATE LIMITING TEST
======================

Review rate limiting for:

login

registration submission

registration lookup

ticket lookup

password reset

public API endpoints

Prevent basic abuse without harming normal registration flow.

======================================================================
70. ERROR PAGE TEST
===================

Verify professional handling for:

404

403

419 if Laravel CSRF/session expiry

500

validation error

database error

event not found

registration not found

ticket invalid

Never expose stack trace in production.

======================================================================
71. BROWSER CONSOLE AUDIT
=========================

Open important pages and inspect console.

Fix:

JavaScript errors

React/Vue warnings if applicable

failed fetch requests

404 assets

CORS errors

deprecated API warnings where meaningful

Do not ignore recurring console errors.

======================================================================
72. NETWORK REQUEST AUDIT
=========================

Inspect frontend network requests.

Check:

failed APIs

duplicate API calls

incorrect URLs

500 responses

403 responses

large unnecessary payloads

sensitive information exposed

======================================================================
73. SERVER LOG AUDIT
====================

Inspect:

Laravel logs

Apache/PHP errors

database errors

queue errors

mail errors

Fix repeated application-level errors.

Do not simply delete logs to hide issues.

======================================================================
74. N+1 QUERY REVIEW
====================

Inspect pages such as:

registrations

participants

events

reports

dashboard

Check for excessive database queries.

Use eager loading where appropriate.

Optimize without changing business behavior.

======================================================================
75. PERFORMANCE TEST
====================

Test with realistic dataset.

Example:

100 events

10,000 participants

50,000 registrations

Verify:

event lists

registration tables

search

filters

dashboard

reports

queue

Use pagination and indexes.

Do not fetch entire large tables unnecessarily.

======================================================================
76. DATABASE INDEX REVIEW
=========================

Ensure indexes exist for commonly queried fields.

Examples:

event_id

participant_id

registration_number

status

registered_at

email

phone

event slug

ticket token

check-in registration ID

Add safe migrations for missing important indexes if needed.

======================================================================
77. RESPONSIVE TEST
===================

Verify:

1920px desktop

1366px laptop

tablet

mobile 390px

mobile 360px

Test:

navigation

tables

forms

event page

registration

queue

ticket

QR scanner

admin dashboard

No important button should be inaccessible.

======================================================================
78. MOBILE REGISTRATION TEST
============================

Complete registration entirely from mobile viewport.

Check:

keyboard types

date inputs

dropdowns

checkboxes

validation messages

submit button

confirmation

QR display

No horizontal overflow.

======================================================================
79. ACCESSIBILITY CHECK
=======================

Verify:

form labels

keyboard access

focus states

button labels

modal accessibility

status not indicated by color alone

readable contrast

image alt text where relevant

======================================================================
80. EMPTY STATE TEST
====================

Test:

no events

no registrations

no queue

no notifications

no reports

no check-ins

Pages must not crash.

Provide appropriate empty states.

======================================================================
81. NULL VALUE TEST
===================

Test records missing optional:

phone

email

location

banner

description

contact person

meeting URL

System must handle null safely.

======================================================================
82. LARGE TEXT TEST
===================

Test:

long event description

long participant name

long organization

long custom field answer

Verify:

UI does not break

database does not unexpectedly truncate

export still works

======================================================================
83. UNICODE TEST
================

Test:

English

Khmer

mixed Khmer/English

special punctuation

emoji if allowed

Ensure:

database stores UTF-8 correctly

frontend displays correctly

exports preserve characters

======================================================================
84. DATE EDGE CASE TEST
=======================

Test:

same-day event

multi-day event

registration closes at event start

midnight

month-end

year-end

Ensure status and timing remain correct.

======================================================================
85. CANCELLATION TEST
=====================

Test participant cancellation.

Verify:

status changes

capacity released

waitlist promotion triggers

ticket invalidates if required

notification sends

dashboard changes

audit history updates

======================================================================
86. EVENT CANCELLATION TEST
===========================

Cancel event.

Verify:

public status

registration closed

new registration blocked

participant communication if configured

existing data preserved

tickets handled appropriately

======================================================================
87. ARCHIVE TEST
================

Archive completed event.

Verify:

not lost

still reportable

removed from active admin views if intended

public visibility behaves correctly

registrations preserved

======================================================================
88. CACHE TEST
==============

Verify changes propagate correctly.

Test:

event edits

registration form edits

status edits

capacity edits

Admin saves.

Refresh public page.

Changes must appear.

Check:

application cache

browser cache

query cache

route cache

configuration cache

Do not disable all caching unless required.

======================================================================
89. QUEUE / JOB PROCESS TEST
============================

If asynchronous queues are used:

verify worker configuration

failed_jobs

notification jobs

scheduled jobs

retry behavior

Prevent duplicate notifications.

======================================================================
90. SCHEDULED TASK TEST
=======================

If Laravel Scheduler is used:

Inspect:

app/Console/Kernel.php

or current Laravel scheduler configuration.

Verify jobs such as:

event status updates

reminders

no-show processing

archiving

notification processing

Test scheduler commands.

======================================================================
91. PHP/LARAVEL QUALITY CHECK
=============================

If Laravel:

Run appropriate checks.

Potential commands:

php artisan optimize:clear

php artisan route:list

php artisan migrate:status

php artisan test

composer dump-autoload

If Laravel Pint exists:

./vendor/bin/pint --test

If PHPStan/Larastan exists:

./vendor/bin/phpstan analyse

Fix real issues.

Do not install large new QA frameworks unless necessary.

======================================================================
92. JAVASCRIPT QUALITY CHECK
============================

If project uses npm:

Run:

npm run build

npm run lint

if available:

npm test

Fix:

build errors

lint errors affecting correctness

broken imports

type errors if TypeScript is used

======================================================================
93. BUILD TEST
==============

Ensure production assets build successfully.

No:

missing modules

broken imports

syntax errors

unresolved dependencies

fatal build warnings

Application must build from clean dependencies.

======================================================================
94. AUTOMATED TEST COVERAGE
===========================

Inspect existing tests.

Do not delete valid tests to make test suite pass.

Fix application behavior.

Add tests for critical business rules if missing:

event CRUD

registration

capacity

waitlist

promotion

authorization

check-in

duplicate check-in

======================================================================
95. CRITICAL AUTOMATED TEST — CAPACITY
======================================

Create test:

Capacity:
3

Register A
Register B
Register C
Register D

Expected:

A confirmed

B confirmed

C confirmed

D waitlisted

Assert confirmed count = 3.

======================================================================
96. CRITICAL AUTOMATED TEST — PROMOTION
=======================================

Initial:

Capacity:
3

Confirmed:
A
B
C

Waitlist:
D #1
E #2

Cancel B.

Assert:

D = Confirmed

E = Waitlisted

E Queue = #1

Confirmed count = 3.

======================================================================
97. CRITICAL AUTOMATED TEST — CONCURRENCY
=========================================

If practical in current testing environment:

simulate simultaneous registration requests for the final seat.

Verify transactional protection.

At minimum inspect code and create database transaction test that validates no over-capacity condition can occur.

======================================================================
98. REGRESSION TEST AFTER EVERY FIX
===================================

After fixing a module, test related modules.

Example:

If queue logic changed:

Retest:

registration

capacity

cancellation

promotion

notifications

dashboard

reports

Do not assume isolated fixes have no side effects.

======================================================================
99. BUG FIXING PROCESS
======================

For every discovered defect:

1. reproduce problem

2. identify root cause

3. identify affected files

4. determine impact

5. create minimal safe fix

6. test fix

7. test surrounding functionality

8. document result

Do not hide errors with try/catch without fixing underlying cause.

======================================================================
100. PRIORITY CLASSIFICATION
============================

Classify defects:

P0 CRITICAL

Examples:

Application will not start

Data loss

Authentication bypass

Confirmed participants exceed capacity

Unauthorized data exposure

P1 HIGH

Examples:

Registration broken

Queue incorrect

QR broken

Check-in broken

Admin form not reflected frontend

P2 MEDIUM

Examples:

Incorrect report

Filter broken

Notification template issue

P3 LOW

Examples:

Minor layout issue

Text alignment

Non-blocking cosmetic issue

Fix priority:

P0
→ P1
→ P2
→ P3

======================================================================
101. DO NOT SILENTLY CHANGE BUSINESS RULES
==========================================

The following core Events business rules must remain intact:

Each event has independent registration.

Every registration has a permanent registration number.

Confirmed participants cannot exceed capacity.

Additional participants enter waitlist.

Waitlist defaults to FIFO.

Queue position recalculates dynamically.

Queue #1 is promoted when a confirmed seat becomes available.

Registration number never changes after promotion.

QR does not expose sensitive personal data.

Attendance is event-specific.

Roles and permissions are server-enforced.

Audit logs preserve important administrative actions.

Do not change these rules unless current code clearly contains an error against them.

======================================================================
102. PRODUCTION CONFIGURATION REVIEW
====================================

Verify production settings.

Check:

APP_ENV=production

APP_DEBUG=false

correct APP_URL

secure database credentials

HTTPS configuration

mail configuration

file permissions

storage links

queue workers

scheduler

cache

session driver

log rotation

Do not hard-code production secrets.

======================================================================
103. XAMPP / LOCAL ENVIRONMENT CHECK
====================================

If current deployment uses XAMPP:

Verify:

Apache works

PHP extensions required by Laravel are enabled

MySQL/MariaDB runs

mod_rewrite is enabled where required

DocumentRoot is configured correctly

Laravel public directory is served correctly

storage permissions work

database configuration works

URLs do not depend on incorrect localhost paths

Do not expose Laravel project files directly if proper public-directory configuration can be used.

======================================================================
104. APACHE CHECK
=================

Verify:

.htaccess

rewrite rules

public/index.php

asset URLs

uploads

route fallback

No sensitive files should be publicly downloadable:

.env

composer.json if unnecessary

storage logs

database backups

Git files

======================================================================
105. DATABASE BACKUP SAFETY
===========================

Before destructive data fixes:

Create or recommend a database backup.

Never perform irreversible mass cleanup without verifying impact.

Use migrations/scripts where appropriate.

======================================================================
106. CODE CLEANUP
=================

After functionality is stable:

Remove:

temporary debug code

console.log debugging

dd()

dump()

var_dump()

temporary test routes

temporary credentials

unused development endpoints

Do not remove useful production logging.

======================================================================
107. FINAL FULL REGRESSION RUN
==============================

After all fixes:

Repeat complete critical workflow:

1. Login Admin

2. Create Event

3. Configure Event

4. Create Registration Form

5. Publish Event

6. Open Public Event

7. Register Participants

8. Reach Capacity

9. Create Waitlist

10. Verify Queue

11. Cancel Confirmed Registration

12. Verify Queue Promotion

13. Retrieve QR Ticket

14. Scan QR

15. Check In

16. Verify Attendance

17. View Dashboard

18. Export Registration Report

19. Verify Audit Logs

20. Verify Roles

This entire flow must work without manual database intervention.

======================================================================
108. TEST EVENT TO USE
======================

Create a temporary QA event if necessary.

Name:

Events Full QA Test Event

Code:

QATEST

Capacity:

3

Waitlist:

Enabled

Waitlist Capacity:

5

Registration Fields:

Full Name

Email

Phone

Department

Preferred Session

Consent

Use this event for controlled functional testing.

Do not test destructive workflows on important real event data unless necessary.

======================================================================
109. EXPECTED FINAL QA STATE
============================

At completion there should be:

No known P0 issues.

No known P1 issues.

All critical workflows pass.

Build succeeds.

Authentication works.

Permissions work.

Registration works.

Admin form and frontend form synchronize.

Capacity works.

Waitlist works.

Promotion works.

QR works.

Check-in works.

Attendance works.

Reports work.

Exports work.

Database integrity is valid.

No major console errors.

No recurring server errors.

No known sensitive data exposure.

======================================================================
110. FINAL REPORT REQUIRED
==========================

After completing the audit and fixes, produce a final report.

Use this format:

Events SYSTEM QA REPORT

Overall Status:

PASS
PASS WITH MINOR ISSUES
or
FAIL

---

Environment

Framework:
Version:
PHP:
Database:
Web Server:

---

Tests Performed

Total:
Passed:
Failed:
Fixed:

---

Critical Modules

Authentication:
PASS / FAIL

Permissions:
PASS / FAIL

Event Management:
PASS / FAIL

Registration Form:
PASS / FAIL

Public Registration:
PASS / FAIL

Capacity:
PASS / FAIL

Waitlist:
PASS / FAIL

Queue Promotion:
PASS / FAIL

QR Ticket:
PASS / FAIL

Check-In:
PASS / FAIL

Attendance:
PASS / FAIL

Notifications:
PASS / FAIL

Reports:
PASS / FAIL

Exports:
PASS / FAIL

Audit Logs:
PASS / FAIL

Responsive UI:
PASS / FAIL

Security:
PASS / FAIL

---

Problems Found

For each problem provide:

ID

Severity

Module

Problem

Root Cause

Files Changed

Fix

Test Result

---

Database Changes

List migrations or indexes added.

---

Files Modified

List important files.

---

Security Findings

List issues found and fixed.

---

Remaining Issues

Only list unresolved issues.

Do not claim everything works if something has not been tested.

---

Final Recommendation

READY FOR PRODUCTION

or

NOT READY FOR PRODUCTION

Explain why.

======================================================================
111. FINAL INSTRUCTION
======================

Begin by inspecting the existing application.

Do not start by rewriting code.

Do not create a new project.

Do not replace the existing database.

Do not delete working features.

Use the existing project as the source of truth.

Run actual tests whenever possible.

Inspect actual logs.

Inspect actual database behavior.

Reproduce errors before fixing them.

Fix root causes rather than symptoms.

Retest every correction.

Maintain compatibility with the current architecture.

Protect existing data.

Prioritize business-critical Events flows:

EVENT
→ FORM
→ REGISTRATION
→ CAPACITY
→ WAITLIST
→ PROMOTION
→ QR
→ CHECK-IN
→ ATTENDANCE
→ REPORT

Continue until the critical application workflows have been verified and all discovered critical/high-severity defects have been corrected.

======================================================================
END OF Events COMPLETE QA, DEBUGGING AND PRODUCTION READINESS PROMPT
======================================================================
