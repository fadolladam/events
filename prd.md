PRODUCT REQUIREMENTS DOCUMENT
PROJECT NAME: Events
PRODUCT TYPE: Multi-Event Registration, Queue, Check-In, Attendance and Event Management Platform
VERSION: 1.0
PRIMARY BUILD TARGET: Antigravity AI Development Environment

======================================================================

1. PROJECT OVERVIEW
    ======================================================================

Build a production-ready web application called EventNex.

EventNex is a centralized multi-event management platform that allows an organization to create, publish, manage, track and report multiple events from one administration system.

Each event must operate independently and have its own:

* event information
* event date and time
* event venue
* registration opening date
* registration closing date
* participant capacity
* waitlist capacity
* registration form
* registration numbering
* participant database
* queue
* QR tickets
* attendance
* check-in
* event staff
* notifications
* reports
* analytics
* event status
* event branding
* event settings

The system must support different types of events including:

* corporate events
* internal staff events
* customer events
* conferences
* workshops
* seminars
* training
* townhalls
* CSR activities
* blood donation events
* sports events
* dinners
* promotional events
* public events
* invitation-only events

Do not create a separate physical database for every event.

Use one centralized relational database and separate event-specific data using event_id and proper relational database relationships.

The system must be scalable enough to support thousands of events and hundreds of thousands of registrations.

======================================================================
2. PRODUCT OBJECTIVE

The main objective is to allow administrators to manage the complete event lifecycle:

Create Event
→ Configure Registration
→ Publish Event
→ Receive Registrations
→ Confirm Participants
→ Manage Capacity
→ Manage Queue / Waitlist
→ Issue QR Tickets
→ Check-In Participants
→ Track Attendance
→ Complete Event
→ Generate Reports
→ Archive Event

The platform should eliminate the need to create separate Google Forms, Excel files, registration databases and check-in tools for every event.

======================================================================
3. CORE DESIGN PRINCIPLES

The system must be:

* secure
* professional
* responsive
* mobile-friendly
* scalable
* modular
* maintainable
* simple to use
* fast
* audit-friendly
* privacy-conscious

Do not build the application as a single massive component.

Use proper reusable components, services, modules and database relationships.

Avoid hard-coded registration forms.

Every event must be configurable.

======================================================================
4. RECOMMENDED TECHNOLOGY STACK

Use the following technology unless there is a strong technical reason to change it:

Frontend:

* Laravel Blade
* HTML
* Tailwind CSS
* JavaScript

Backend:

* Laravel / PHP 8.x

Database:

* MySQL / MariaDB

ORM:

* Eloquent ORM

Authentication:

* Laravel authentication

Form Validation:

* Laravel Form Requests / Validation

Web Server:

* Apache

Local Development:

* XAMPP

QR Code:

* Laravel QR package (e.g. SimpleSoftwareIO/simple-qrcode)
* browser camera QR scanner compatible with Android and iOS

Excel Export:

* Laravel Excel (Maatwebsite)

PDF:

* DOMPDF (barryvdh/laravel-dompdf)

Email:

* Laravel Mail

Charts:

* Chart.js / ApexCharts or similar lightweight charting library

File Storage:

* Laravel Storage (Local / Public / S3-compatible)

Maps:

* Google Maps API or OpenStreetMap integration

Deployment:

* Any PHP/MySQL hosting
* VPS
* cPanel hosting

Keep infrastructure configurable through environment variables.

======================================================================
5. APPLICATION STRUCTURE

The system should have four major interfaces.

A. PUBLIC EVENT PORTAL

Used by participants to:

* browse events
* search events
* view event details
* register
* join waitlists
* view registration confirmation
* access QR tickets
* view registration status

B. ADMINISTRATION PORTAL

Used by administrators to:

* create events
* configure events
* manage registrations
* manage participants
* manage queue
* scan tickets
* check attendance
* send notifications
* export reports
* manage staff
* review analytics

C. EVENT OPERATIONS INTERFACE

Optimized for mobile devices.

Used during events for:

* QR scanning
* participant search
* manual check-in
* attendance tracking
* status lookup

D. PARTICIPANT REGISTRATION PORTAL

Used by participants to:

* check their registration
* see queue status
* retrieve QR ticket
* cancel registration if permitted
* update selected information if permitted

======================================================================
6. USER ROLES

Implement Role-Based Access Control.

Required roles:

1. Super Admin

Permissions:

* full system access
* manage users
* manage roles
* manage all events
* manage settings
* view audit logs
* manage organizations

2. Event Admin

Permissions:

* create assigned events
* edit assigned events
* manage participants
* manage registrations
* manage capacity
* manage queue
* manage reports
* manage notifications

3. Event Organizer

Permissions:

* view assigned events
* update permitted event information
* view participant information
* send approved event communication

4. Registration Officer

Permissions:

* view registrations
* approve registrations
* reject registrations
* update registration status
* search participants

5. Check-In Staff

Permissions:

* scan QR codes
* search registrations
* check-in participants
* view limited participant details

6. Viewer

Permissions:

* read-only access
* view reports
* view analytics

7. Participant

Permissions:

* register
* view own registration
* view own ticket
* view own queue position
* cancel own registration if enabled

All permissions must be enforced server-side.

Do not rely only on frontend permission hiding.

======================================================================
7. EVENT STATUS SYSTEM

Support the following event statuses:

* Draft
* Upcoming
* Registration Open
* Full
* Registration Closed
* Ongoing
* Completed

Optional administrative statuses:

* Cancelled
* Archived

Status behavior:

Draft:
Event is being prepared and not public.

Upcoming:
Event is published but registration has not started.

Registration Open:
Registration start date has been reached and capacity is available.

Full:
Confirmed capacity and available waitlist capacity have both reached their configured limits.

Registration Closed:
Registration closing date has passed or registration was manually closed.

Ongoing:
Current date/time is within event start and event end.

Completed:
Event end time has passed.

Cancelled:
Event has been cancelled.

Archived:
Event is stored for historical reference.

Where possible, automatically calculate event status from dates and capacity.

Authorized administrators must be able to manually override status.

Record every status change.

======================================================================
8. EVENT CREATION

Create a multi-step event creation wizard.

STEP 1
Basic Information

Fields:

* event title
* event short title
* event slug
* short description
* full description
* event category
* event type
* event visibility
* cover image
* banner image
* organizer name
* event owner
* contact person
* contact phone
* contact email

STEP 2
Date and Time

Fields:

* event start date
* event start time
* event end date
* event end time
* timezone
* registration opening date/time
* registration closing date/time

STEP 3
Location

Fields:

* physical event
* virtual event
* hybrid event
* venue name
* address
* city
* province/state
* country
* postal code
* latitude
* longitude
* map URL
* virtual meeting URL

STEP 4
Registration Settings

Fields:

* registration enabled
* registration approval mode
* maximum confirmed participants
* waitlist enabled
* maximum waitlist participants
* allow participant cancellation
* cancellation deadline
* duplicate registration rule
* require email verification
* require phone verification
* invitation-only mode
* registration code/password if required

STEP 5
Registration Form Builder

STEP 6
Capacity and Queue

STEP 7
QR Ticket Settings

STEP 8
Notification Settings

STEP 9
Event Team

STEP 10
Review and Publish

Allow saving as draft at every step.

======================================================================
9. EVENT VISIBILITY

Support:

* Public
* Private
* Invitation Only
* Internal Only
* Hidden Link

Public:
Visible in event listing.

Private:
Requires authentication.

Invitation Only:
Requires valid invitation token or invitation email.

Internal Only:
Requires authorized account.

Hidden Link:
Not shown in public event listing but accessible using direct URL.

======================================================================
10. EVENT CATEGORIES

Provide configurable categories.

Default examples:

* Corporate
* Internal
* Customer
* Marketing
* CSR
* Training
* Workshop
* Seminar
* Conference
* Townhall
* Blood Donation
* Sports
* Dinner
* Promotion
* Community
* Other

Administrators can add, edit and deactivate categories.

======================================================================
11. PUBLIC EVENT PORTAL

Create a public events page.

Route:

/events

Display sections:

* Featured Events
* Registration Open
* Upcoming
* Ongoing
* Completed

Provide filtering by:

* event status
* category
* location
* month
* date range
* organizer

Provide search by:

* event title
* organizer
* location
* keyword

Event cards should display:

* cover image
* event title
* date
* time
* venue
* category
* status
* registration availability

Possible event card badges:

REGISTRATION OPEN
UPCOMING
FULL
CLOSED
ONGOING
COMPLETED

======================================================================
12. EVENT DETAIL PAGE

Public route:

/events/[slug]

Display:

* event banner
* event title
* status
* organizer
* description
* date
* time
* timezone
* venue
* location map
* available capacity if enabled
* registration deadline
* contact details
* event attachments
* terms and conditions

CTA behavior:

If registration open:
REGISTER NOW

If confirmed capacity reached but waitlist is available:
JOIN WAITLIST

If full:
EVENT FULL

If registration closed:
REGISTRATION CLOSED

If upcoming:
REGISTRATION OPENS ON [DATE]

If completed:
EVENT COMPLETED

======================================================================
13. DYNAMIC REGISTRATION FORM BUILDER

Every event can have a different registration form.

Do not hard-code event registration forms.

Create a visual form builder.

Supported field types:

* single-line text
* multi-line text
* email
* phone
* number
* date
* time
* date/time
* dropdown
* radio buttons
* checkbox
* multi-select
* file upload
* image upload
* address
* country
* province
* city
* employee ID
* department
* organization
* job title
* consent
* terms acceptance
* custom question

Each field must support:

* field ID
* label
* placeholder
* help text
* required
* optional
* hidden
* field order
* validation
* minimum length
* maximum length
* allowed values
* default value
* visibility rules
* conditional logic

Example conditional logic:

Question:
Are you an employee?

If YES:
Show Employee ID
Show Department

If NO:
Hide those fields.

Allow drag-and-drop field ordering if technically practical.

======================================================================
14. REGISTRATION IDENTIFICATION

Every registration must have:

* internal UUID
* event ID
* registration sequence
* human-readable registration number

Registration numbers must be permanent.

Recommended format:

EVT-[EVENTCODE]-[YEAR]-000001

Example:

EVT-BD26-2026-000001

Alternative shorter format:

BD26-000001

Allow event administrators to configure an event code.

Registration numbers must never change.

Even if registration status changes:

Confirmed
→ Waitlisted
→ Confirmed
→ Cancelled

the registration number remains permanent.

======================================================================
15. PARTICIPANT DATA MODEL

Separate participant identity from event registration.

Participant represents the person.

Registration represents that person’s participation in a specific event.

Participant can potentially participate in multiple events.

Core participant fields:

* participant UUID
* full name
* email
* phone
* country
* created date
* updated date

Optional fields must be collected through event-specific registration forms.

Do not force every event to collect unnecessary data.

======================================================================
16. REGISTRATION STATUS

Support registration statuses:

* Pending
* Confirmed
* Waitlisted
* Approved
* Rejected
* Cancelled
* Checked In
* Attended
* No Show

Separate registration approval status from attendance status internally if required.

Recommended logical model:

Registration status:

* Pending
* Confirmed
* Waitlisted
* Rejected
* Cancelled

Attendance status:

* Not Checked In
* Checked In
* Attended
* No Show

======================================================================
17. CAPACITY MANAGEMENT

Every event can define:

Confirmed Capacity

Example:
100 participants

Waitlist Capacity

Example:
50 participants

or:

Unlimited Waitlist

If confirmed participant count is below capacity, eligible registrations can become Confirmed.

Example:

Capacity: 100

Registration #001:
Confirmed

Registration #099:
Confirmed

Registration #100:
Confirmed

When the 101st eligible registration is submitted:

Registration Number:
EVT-000101

Registration Status:
Waitlisted

Queue Position:
#1

102nd registration:

Status:
Waitlisted

Queue Position:
#2

103rd registration:

Status:
Waitlisted

Queue Position:
#3

======================================================================
18. WAITLIST / QUEUE SYSTEM

Implement a proper automated waitlist.

Default waitlist strategy:

FIFO

First In, First Out.

Queue ordering:

1. manual priority if configured
2. waitlisted_at timestamp
3. registration sequence

Queue positions must be dynamic.

Example:

Confirmed Capacity:
100

Confirmed:
100

Waitlisted:
15

Queue:

#1 Registration 101
#2 Registration 102
#3 Registration 103

If a confirmed participant cancels:

1. free one confirmed slot
2. identify queue #1
3. promote queue #1 to Confirmed
4. remove their queue position
5. recalculate remaining queue positions
6. record promotion
7. send confirmation notification

The participant’s registration number must remain unchanged.

Example:

Registration number:
EVT-000101

Before:
Status: Waitlisted
Queue Position: #1

After promotion:
Status: Confirmed
Queue Position: None

======================================================================
19. QUEUE POSITION RULES

Queue positions must never expose other participant personal details publicly.

Participant view:

Registration Number:
EVT-000125

Status:
WAITLISTED

Current Queue Position:
#7

Do not display names of other people in the queue.

Queue recalculates when:

* confirmed participant cancels
* confirmed participant is removed
* waitlisted participant cancels
* waitlisted participant is promoted
* registration is rejected
* administrator changes queue priority
* capacity increases

Do not leave gaps.

If queue is:

#1
#2
#3

and #2 cancels:

new queue:

#1
#2

======================================================================
20. CAPACITY INCREASE

If capacity changes:

100
to
110

and there are 15 people in the queue:

Automatically promote the first 10 eligible waitlisted registrations.

Result:

Confirmed:
110

Waitlisted:
5

Remaining waitlist positions:

#1
#2
#3
#4
#5

Send notifications to promoted participants.

======================================================================
21. CAPACITY DECREASE

If administrator reduces capacity below the number already confirmed:

Example:

Confirmed:
95

Capacity changed:
100 → 80

Do not automatically demote 15 confirmed participants.

Show warning:

THIS EVENT IS CURRENTLY 15 PARTICIPANTS OVER CAPACITY.

Require administrator action if they want to manually resolve the situation.

Record any manual removal or demotion in audit logs.

======================================================================
22. CONCURRENCY SAFETY

This requirement is critical.

Capacity allocation must happen server-side within a database transaction.

Example:

Event capacity:
100

Currently confirmed:
99

Five people register at exactly the same time.

Only one person must receive the final confirmed position.

The other four must become waitlisted.

Never calculate capacity only using frontend state.

Use database transactions, row locking, serializable transactions or another safe concurrency strategy.

Prevent overbooking.

======================================================================
23. REGISTRATION APPROVAL MODES

Support:

Automatic Approval

and

Manual Approval

Automatic Approval:

If capacity available:
Confirmed

If capacity unavailable:
Waitlisted

Manual Approval:

New registration:
Pending

Admin can:

Approve
Reject
Move to Waitlist

When approved:

If capacity available:
Confirmed

If capacity full:
Waitlisted

======================================================================
24. DUPLICATE REGISTRATION PREVENTION

Allow administrators to configure duplicate detection based on:

* email
* phone
* employee ID
* custom unique field

Example:

Prevent same email from registering twice.

Possible response:

You have already registered for this event.

Show existing registration reference if allowed.

Do not block legitimate users if administrator disables duplicate detection.

======================================================================
25. PARTICIPANT REGISTRATION FLOW

Participant selects:

REGISTER NOW

Flow:

Step 1:
Registration Form

Step 2:
Review Information

Step 3:
Accept Terms

Step 4:
Submit

Step 5:
Server validates registration

Step 6:
Capacity checked transactionally

Step 7:
Assign status

Step 8:
Generate registration number

Step 9:
Generate confirmation

Step 10:
Generate QR ticket if Confirmed

Step 11:
Send notification

======================================================================
26. REGISTRATION SUCCESS PAGE

Confirmed example:

REGISTRATION SUCCESSFUL

Event:
Blood Donation Drive 2026

Registration Number:
BD26-000086

Status:
CONFIRMED

Participant:
John Doe

Date:
29 September 2026

Venue:
Head Office

[VIEW QR TICKET]

[ADD TO CALENDAR]

Waitlisted example:

REGISTRATION RECEIVED

Registration Number:
BD26-000101

Status:
WAITLISTED

Queue Position:
#1

Message:

The event has reached its confirmed capacity. You have been added to the waiting list. We will notify you if a place becomes available.

======================================================================
27. REGISTRATION LOOKUP

Create:

/registration

Participant can search using:

* registration number
* email
* phone

For privacy, require appropriate verification.

Do not expose registration information using registration number alone without verification if sensitive data is displayed.

======================================================================
28. PARTICIPANT PORTAL

Participant can access:

/my-registration/[secure-token]

Display:

* event
* participant name
* registration number
* registration status
* queue position
* QR ticket
* event details
* cancellation option
* calendar option

Do not expose sequential IDs through insecure database routes.

Use secure random tokens for external participant access.

======================================================================
29. QR TICKET SYSTEM

Confirmed participants should receive a QR ticket.

The QR code must contain only:

* secure token
    or
* secure ticket URL

Do not embed:

* phone
* email
* employee ID
* personal data

Example:

https://domain.com/ticket/[secure-token]

Ticket page shows:

* event
* participant name
* registration number
* date
* venue
* status
* QR

QR token must be:

* unique
* unpredictable
* securely generated
* revocable

======================================================================
30. CHECK-IN SYSTEM

Create mobile-friendly check-in page:

/admin/events/[event-id]/check-in

Features:

* Scan QR
* Manual Registration Search
* Participant Search
* Check-In
* Undo Check-In with permission
* Show Previous Check-In

When QR scanned:

Display:

Participant Name
Registration Number
Registration Status
Event
Check-In Status

If valid:

CONFIRMED PARTICIPANT

[CHECK IN]

After check-in:

CHECK-IN SUCCESSFUL

Check-In Time:
08:45 AM

Checked-In By:
Staff Name

If already checked in:

ALREADY CHECKED IN

Previous Check-In:
08:45 AM

Do not create duplicate attendance records.

======================================================================
31. CHECK-IN SEARCH

Allow search by:

* registration number
* full name
* phone
* email
* employee ID

Results must be restricted to the selected event.

======================================================================
32. ATTENDANCE

Track:

* checked-in timestamp
* checked-in by
* attendance status
* check-in location/gate
* optional notes

After event completion:

Confirmed but never checked in:
No Show

Checked In:
Attended

Allow administrator adjustment with audit logging.

======================================================================
33. EVENT ADMIN DASHBOARD

Each event gets a dashboard.

Route:

/admin/events/[id]

Display KPI cards:

Event Capacity
Registrations
Confirmed
Pending
Waitlisted
Rejected
Cancelled
Checked In
No Show
Remaining Capacity

Example:

Capacity
100

Confirmed
100

Waitlist
18

Checked In
82

Attendance Rate
82%

======================================================================
34. EVENT ANALYTICS

Display:

Registrations Over Time

Registration Status Breakdown

Attendance Rate

Registration Sources

Participant Locations

Registration Conversion

Capacity Utilization

Waitlist Size

No-Show Rate

Charts must be responsive.

Do not overload dashboard with unnecessary charts.

======================================================================
35. GLOBAL ADMIN DASHBOARD

Global dashboard should show:

Total Events
Upcoming Events
Open Registration
Ongoing Events
Completed Events

Total Participants
Total Registrations
Total Confirmed
Total Waitlisted
Total Attendance

Show recent activity:

* event created
* registration received
* participant promoted
* event published
* participant checked in

======================================================================
36. PARTICIPANT MANAGEMENT

Admin participant table columns:

Registration Number
Participant Name
Phone
Email
Status
Queue Position
Registration Date
Attendance

Allow filtering:

* Confirmed
* Pending
* Waitlisted
* Rejected
* Cancelled
* Checked In
* No Show

Allow search.

Allow server-side pagination.

======================================================================
37. REGISTRATION DETAIL PAGE

Admin can open registration detail.

Show:

Registration Information
Participant Information
Form Responses
Registration History
Queue History
Notification History
Attendance History
Administrative Notes

Actions:

Approve
Reject
Confirm
Move to Waitlist
Cancel
Promote
Check In
Undo Check-In
Resend Confirmation
Resend Ticket

All sensitive actions must be permission controlled.

======================================================================
38. MANUAL REGISTRATION

Authorized administrators can manually register participants.

Use same capacity and queue logic as public registration.

Do not bypass capacity automatically.

If administrator wants to override capacity, require explicit permission and warning.

======================================================================
39. EVENT TEAM

Allow multiple users to be assigned to an event.

Event-level roles:

* Event Owner
* Event Manager
* Organizer
* Registration Officer
* Check-In Staff
* Viewer

Example:

Event:
Blood Donation Drive

Owner:
Human Resources

Co-Organizer:
Marketing & Communications

Check-In Team:
HR Staff

======================================================================
40. LOCATION

Event location fields:

Venue Name
Address
City
Province
Country
Latitude
Longitude

Display map when coordinates available.

Participant location collection must be optional.

Possible participant fields:

Country
Province
City
Branch
Office
GPS Location

Precise GPS location must require clear participant consent.

======================================================================
41. CALENDAR

Admin calendar view should display:

Upcoming Events
Ongoing Events
Registration Opening
Registration Closing

Provide:

Month View
Week View
List View

Participant event page should support:

ADD TO CALENDAR

Generate:

* Google Calendar link
* ICS download

======================================================================
42. EVENT TEMPLATES

Allow administrator to create reusable event templates.

Examples:

Blood Donation Template
Townhall Template
Customer Dinner Template
Training Template
Workshop Template

Template can include:

* category
* event settings
* registration form
* capacity settings
* waitlist settings
* notification templates
* staff structure
* QR settings

Create Event:

CREATE BLANK EVENT

or

CREATE FROM TEMPLATE

======================================================================
43. DUPLICATE EVENT

Allow administrators to duplicate an existing event.

Duplicated event should copy:

* event configuration
* form fields
* notification templates
* capacity settings
* event team if selected

Do not copy:

* registrations
* participants
* QR tickets
* attendance
* event history

======================================================================
44. NOTIFICATION SYSTEM

Create notification templates.

Required notifications:

Registration Received
Registration Confirmed
Registration Pending
Registration Approved
Registration Rejected
Waitlist Confirmation
Waitlist Promotion
Registration Cancelled
Event Reminder
Event Updated
Event Cancelled
Post-Event Thank-You

Support template variables:

{{participant_name}}
{{registration_number}}
{{event_name}}
{{event_date}}
{{event_time}}
{{event_location}}
{{registration_status}}
{{queue_position}}
{{ticket_url}}
{{organizer_name}}
{{contact_email}}
{{contact_phone}}

======================================================================
45. NOTIFICATION CHANNELS

Phase 1:

Email

Architecture should allow future support for:

SMS
Telegram
WhatsApp
Push Notifications

Do not tightly couple business logic to one provider.

Create notification service abstraction.

======================================================================
46. EVENT REMINDERS

Allow administrator to configure reminders:

1 Day Before
3 Days Before
7 Days Before
Custom Date

Send only to selected registration statuses.

Example:

Confirmed Participants Only

======================================================================
47. REPORTING

Event reports:

Registration Summary
Participant List
Confirmed List
Waitlist
Attendance
No Show
Cancellation
Location
Registration Source

Global reports:

All Events
Event Performance
Attendance Rate
Total Participation
Category Performance

======================================================================
48. EXPORT

Allow export to:

CSV
Excel
PDF

Participant export should support selected columns.

Example:

Full Name
Phone
Email
Department
Registration Number
Status
Queue Position
Registered Date
Attendance

Exports must respect user permissions.

======================================================================
49. AUDIT LOG

Create comprehensive audit logging.

Track:

* login
* event created
* event updated
* event deleted
* event published
* event status changed
* registration edited
* registration approved
* registration rejected
* queue priority changed
* participant promoted
* participant cancelled
* capacity changed
* check-in created
* check-in reversed
* user permission changed

Audit record:

ID
User
Action
Entity
Entity ID
Event ID
Timestamp
IP Address when appropriate
Previous Value
New Value

Audit logs cannot be edited by normal administrators.

======================================================================
50. DATABASE STRUCTURE

Create proper normalized MySQL / MariaDB tables.

Minimum suggested tables:

users

organizations

roles

permissions

user_roles

events

event_categories

event_locations

event_staff

event_status_history

event_templates

event_template_fields

registration_forms

form_fields

form_field_options

form_conditions

participants

registrations

registration_answers

registration_status_history

waitlist_history

tickets

checkins

attendance

notification_templates

notification_jobs

notification_logs

event_documents

event_files

audit_logs

system_settings

======================================================================
51. EVENTS TABLE

Suggested fields:

id UUID primary key

organization_id

title

short_title

slug

event_code

description

short_description

category_id

event_type

visibility

status

cover_image_url

banner_image_url

organizer_name

owner_user_id

contact_name

contact_phone

contact_email

start_at

end_at

timezone

registration_open_at

registration_close_at

capacity

waitlist_enabled

waitlist_capacity

approval_mode

allow_cancellation

cancellation_deadline

duplicate_rule

venue_name

address

city

province

country

latitude

longitude

meeting_url

created_by

created_at

updated_at

published_at

archived_at

======================================================================
52. REGISTRATIONS TABLE

Suggested fields:

id UUID primary key

event_id

participant_id

registration_number

registration_sequence

status

attendance_status

waitlist_priority

registered_at

confirmed_at

waitlisted_at

promoted_at

approved_at

rejected_at

cancelled_at

checked_in_at

source

secure_access_token

notes

created_at

updated_at

======================================================================
53. REGISTRATION ANSWERS

Dynamic registration answers should not all be stored as columns in registrations.

Use:

registration_answers

Fields:

id

registration_id

field_id

value_text

value_number

value_boolean

value_date

value_json when necessary

created_at

updated_at

Use relational types when practical.

======================================================================
54. WAITLIST POSITION

Do not permanently trust a queue_position integer because it becomes stale.

Queue position should normally be calculated from active waitlisted registrations.

Order by:

waitlist_priority DESC

waitlisted_at ASC

registration_sequence ASC

If cached queue positions are used for performance, recalculate them transactionally whenever queue structure changes.

======================================================================
55. EVENT COUNTERS

Provide server-side queries for:

Confirmed Count
Pending Count
Waitlisted Count
Cancelled Count
Available Capacity

Available Capacity:

capacity - confirmed count

Never calculate critical capacity only in browser code.

======================================================================
56. REGISTRATION TRANSACTION LOGIC

When a registration is submitted:

BEGIN DATABASE TRANSACTION

Validate event

Validate registration dates

Validate form

Check duplicate rules

Lock event capacity allocation

Count active confirmed registrations

If approval mode = manual:
status = Pending

Else:

If confirmed_count < capacity:
status = Confirmed

Else if waitlist_enabled and waitlist space available:
status = Waitlisted

Else:
Reject submission as Event Full

Generate registration sequence atomically

Generate permanent registration number

Save participant

Save registration

Save answers

Generate ticket if Confirmed

Create notification job

COMMIT TRANSACTION

Prevent duplicate sequence numbers.

Prevent overbooking.

======================================================================
57. WAITLIST PROMOTION LOGIC

Whenever confirmed capacity becomes available:

BEGIN TRANSACTION

Lock event

Calculate available seats

Select eligible active waitlisted registrations ordered by:

priority DESC
waitlisted_at ASC
registration_sequence ASC

Promote exactly number of available seats

Update status:
Waitlisted → Confirmed

Set:
promoted_at
confirmed_at

Create status history

Invalidate old queue position

Generate ticket if needed

Create promotion notification

COMMIT

======================================================================
58. API / SERVER ACTIONS

Implement clean server-side actions or API endpoints.

Examples:

POST /api/events

GET /api/events

GET /api/events/:id

PATCH /api/events/:id

DELETE /api/events/:id

POST /api/events/:id/publish

POST /api/events/:id/close-registration

POST /api/events/:id/reopen-registration

POST /api/events/:id/duplicate

GET /api/events/:id/registrations

POST /api/events/:id/register

GET /api/events/:id/waitlist

POST /api/registrations/:id/approve

POST /api/registrations/:id/reject

POST /api/registrations/:id/cancel

POST /api/registrations/:id/promote

POST /api/checkin

POST /api/checkin/undo

GET /api/reports/events/:id

Protect every administrative endpoint.

======================================================================
59. ADMIN NAVIGATION

Main sidebar:

Dashboard

Events

Calendar

Registrations

Participants

Templates

Reports

Notifications

Users

Roles & Permissions

Audit Logs

Settings

======================================================================
60. EVENT ADMIN NAVIGATION

Inside an event:

Overview

Event Details

Registration Form

Registrations

Participants

Queue

Check-In

Attendance

Notifications

Analytics

Team

Files

Settings

======================================================================
61. UI DESIGN

Build a premium professional corporate interface.

Design direction:

* clean
* modern
* minimal
* spacious
* strong typography
* information-focused
* enterprise quality

Use:

* cards
* tabs
* tables
* drawers
* dialogs
* badges
* progress indicators
* charts

Avoid:

* unnecessary gradients
* excessive animation
* excessive rounded cards
* playful Saa navigation
* distracting decorative elements

======================================================================
62. COLOR SYSTEM

Use a professional neutral design system.

Primary:
Deep Navy

Secondary:
Professional Blue

Accent:
Light Blue

Status colors:

Green:
Confirmed / Completed / Success

Amber:
Pending / Upcoming

Red:
Cancelled / Rejected / Error

Purple or Blue:
Waitlisted / Queue

Gray:
Archived / Closed

Maintain WCAG-compatible contrast.

======================================================================
63. RESPONSIVE DESIGN

Desktop:
Full admin experience

Tablet:
Responsive dashboard and tables

Mobile:
Event listing
Registration
Ticket
Participant portal
QR scanning
Check-in

Mobile QR check-in must be treated as a first-class experience.

======================================================================
64. TABLE RESPONSIVENESS

Desktop:
Use full tables.

Mobile:
Use responsive cards or horizontal table scrolling.

Do not make important administrative actions inaccessible on mobile.

======================================================================
65. SEARCH

Global admin search:

Event Title
Participant Name
Registration Number
Phone
Email

Event-level search:

Registration Number
Participant Name
Phone
Email
Employee ID

Use indexed queries.

======================================================================
66. PAGINATION

All large data sets must use server-side pagination.

Examples:

Participants
Registrations
Audit Logs
Notifications

Do not load thousands of rows into browser memory.

Default page size:

25

Allow:

25
50
100

======================================================================
67. DATABASE INDEXES

Create indexes for common searches.

Examples:

events.slug

events.status

events.start_at

registrations.event_id

registrations.participant_id

registrations.registration_number

registrations.status

registrations.registered_at

participants.email

participants.phone

checkins.registration_id

audit_logs.event_id

======================================================================
68. SECURITY

Implement:

Secure authentication

Secure password hashing if local passwords are used

Role-based access control

Server-side authorization

CSRF protection where necessary

XSS prevention

SQL injection protection

Input validation

Laravel Form Request / Validator validation

Rate limiting

Secure cookies

Session expiry

File upload validation

MIME validation

File size limits

Request size limits

Brute-force protection

Secure token generation

Sensitive data masking

HTTPS requirement

======================================================================
69. QR SECURITY

QR codes must never contain sensitive personal data.

Do not encode:

Name
Phone
Email
Employee ID
Location

QR should use secure random token.

Example:

ticket_token = cryptographically secure 256-bit random value

Support ticket revocation.

======================================================================
70. DATA PRIVACY

Use privacy-by-design.

Each event should collect only necessary participant information.

Provide:

Consent checkbox

Privacy notice

Terms acceptance

Optional retention period

Data deletion or anonymization workflow

Do not expose participant databases publicly.

======================================================================
71. FILE UPLOAD SECURITY

Validate:

MIME Type

Extension

File Size

Filename

Virus scanning hook architecture if possible

Do not execute uploaded files.

Use randomized storage filenames.

======================================================================
72. ERROR HANDLING

Create professional error states.

Examples:

Event Not Found

Registration Closed

Event Full

Duplicate Registration

Invalid Ticket

Ticket Revoked

Already Checked In

Unauthorized

Session Expired

Network Error

Never expose stack traces to normal users.

======================================================================
73. EMPTY STATES

Provide proper empty states.

Example:

NO EVENTS YET

Create your first event to start managing registrations.

NO REGISTRATIONS

Registrations will appear here after participants register.

WAITLIST EMPTY

There are currently no participants waiting.

======================================================================
74. LOADING STATES

Use:

Skeleton loaders

Button loading indicators

Submission state

Do not allow duplicate form submissions.

Disable submit button while registration is processing.

======================================================================
75. EVENT SETTINGS

Each event should include settings for:

Registration

Capacity

Waitlist

Notifications

Ticket

Cancellation

Privacy

Visibility

Branding

Advanced

======================================================================
76. ORGANIZATION SETTINGS

System settings:

Organization Name

Logo

Default Timezone

Default Country

Default Email Sender

Default Contact Information

Default Event Branding

Default Privacy Notice

Default Terms

======================================================================
77. MULTI-ORGANIZATION ARCHITECTURE

Design database architecture to optionally support multiple organizations in the future.

Do not necessarily expose multi-tenant functionality in Phase 1.

But include organization_id in core entities where appropriate.

======================================================================
78. EVENT BRANDING

Each event may configure:

Logo

Banner

Cover Image

Primary Color

Secondary Color

Organizer Logo

Do not allow branding configuration to break accessibility.

======================================================================
79. REGISTRATION SOURCES

Track source when possible.

Examples:

Direct

QR Poster

Facebook

Telegram

Email

Website

Admin Entry

Invitation

Allow URL parameters:

?source=facebook

Store source with registration.

======================================================================
80. EVENT QR CODE

In addition to participant tickets, allow administrator to generate a public event QR code.

Event QR should point to:

/events/[slug]

or:

/events/[slug]/register

Allow download as PNG or SVG.

======================================================================
81. QR CHECK-IN CAMERA

Requirements:

Use rear camera by default on mobile if available.

Request camera permission only when scanner opens.

Allow camera switching.

Provide manual input fallback.

Display clear success and error states.

Play optional vibration or sound after successful scan.

Avoid repeated scans of the same code within a short period.

======================================================================
82. ADMIN BULK ACTIONS

Allow authorized bulk actions:

Approve Selected

Reject Selected

Move to Waitlist

Send Notification

Export Selected

Do not allow dangerous bulk delete without strong confirmation.

======================================================================
83. IMPORT PARTICIPANTS

Phase 2 feature.

Allow CSV or Excel participant import.

Before import:

Validate columns

Preview records

Detect duplicates

Show errors

Require confirmation

Imported participants still follow event rules unless administrator explicitly chooses override mode.

======================================================================
84. EVENT FILES

Allow event attachments:

Agenda

Map

Brochure

Terms

Instructions

Images

PDF files

Allow administrators to control public/private visibility.

======================================================================
85. ACTIVITY LOG

Each event overview should show recent activity.

Example:

10:20 AM
Participant #BD26-0098 registered.

10:21 AM
Participant #BD26-0099 confirmed.

10:22 AM
Event reached capacity.

10:23 AM
Participant #BD26-0101 joined queue position #1.

======================================================================
86. ACCESSIBILITY

Follow WCAG best practices.

Requirements:

Keyboard navigation

Proper labels

Form accessibility

Focus states

Screen reader support

Readable error messages

Color contrast

Do not use color alone to indicate status.

======================================================================
87. PERFORMANCE

Optimize:

Database queries

Server-side rendering where useful

Caching where appropriate

Image optimization

Lazy-loading charts

Server-side pagination

Database indexes

Avoid unnecessary client-side data loading.

======================================================================
88. LOGGING

Create application logging for:

API errors

Authentication errors

Registration failures

Notification failures

Database errors

Do not log passwords or sensitive participant information unnecessarily.

======================================================================
89. BACKUP

Design system assuming production database backups.

Document:

Daily backup recommendation

Restore process

Retention

Do not hard-code provider-specific backup implementation unless selected.

======================================================================
90. ENVIRONMENT VARIABLES

Use .env configuration.

Example:

DB_CONNECTION

DB_HOST

DB_PORT

DB_DATABASE

DB_USERNAME

DB_PASSWORD

APP_KEY

EMAIL_PROVIDER

EMAIL_API_KEY

STORAGE_PROVIDER

STORAGE_BUCKET

STORAGE_ACCESS_KEY

STORAGE_SECRET

MAPS_API_KEY

APP_URL

Never commit secrets.

======================================================================
91. DEVELOPMENT PHASES

PHASE 1 — FOUNDATION

Build:

Project setup
Authentication
Database schema
Roles and permissions
Admin layout
Event CRUD
Event categories
Event creation wizard

PHASE 2 — PUBLIC EVENTS

Build:

Event listing
Event detail
Event filtering
Event search
Public registration availability

PHASE 3 — REGISTRATION

Build:

Dynamic form builder
Registration submission
Registration numbering
Duplicate detection
Participant records
Registration administration

PHASE 4 — CAPACITY AND QUEUE

Build:

Capacity logic
Waitlist
Queue position
Automatic promotion
Concurrency safety
Capacity increase behavior
Capacity decrease warning

PHASE 5 — TICKETS AND CHECK-IN

Build:

Secure QR tickets
Ticket page
QR scanner
Manual check-in
Attendance
No-show tracking

PHASE 6 — COMMUNICATION

Build:

Email templates
Registration confirmation
Waitlist notifications
Promotion notifications
Reminders
Notification logs

PHASE 7 — ANALYTICS AND REPORTING

Build:

Dashboard
Charts
Event analytics
CSV export
Excel export
PDF reporting

PHASE 8 — ADVANCED

Build:

Event templates
Event duplication
Bulk actions
Participant import
Files
Calendar
Audit logs
Advanced settings

======================================================================
92. TESTING REQUIREMENTS

Implement tests for critical workflows.

Test:

Create event

Publish event

Open registration

Register participant

Assign confirmed slot

Reach capacity

Assign queue position

Promote waitlisted participant

Cancel participant

Increase capacity

Decrease capacity

Duplicate registration

QR generation

QR scan

Check-in

Duplicate check-in

Authorization

======================================================================
93. CRITICAL CAPACITY TEST

Test scenario:

Capacity:
100

Confirmed:
99

Simulate 10 simultaneous registration requests.

Expected:

Confirmed becomes:
100

Waitlisted becomes:
9

Confirmed must never become:
101 or higher

======================================================================
94. WAITLIST TEST

Capacity:
3

Registrations:

A
B
C
D
E

Expected:

A Confirmed
B Confirmed
C Confirmed
D Waitlisted #1
E Waitlisted #2

Cancel B.

Expected:

A Confirmed
C Confirmed
D Confirmed
E Waitlisted #1

D registration number must not change.

======================================================================
95. ACCEPTANCE CRITERIA

The system is considered MVP-ready only when:

1. Admin can create multiple events.
2. Each event has independent registration settings.
3. Each event supports a unique registration form.
4. Public users can view and register for events.
5. Every registration receives a permanent registration number.
6. Capacity limits are enforced.
7. Registrations exceeding confirmed capacity automatically enter waitlist.
8. Queue positions are calculated correctly.
9. Queue #1 is automatically promoted when capacity becomes available.
10. Concurrent registration cannot exceed capacity.
11. QR tickets are generated securely.
12. Admin can scan tickets from mobile.
13. Attendance is recorded.
14. Admin can view event statistics.
15. Admin can export registration data.
16. Permissions are enforced server-side.
17. Audit logs record important administrative changes.
18. UI works on desktop, tablet and mobile.

======================================================================
96. SAMPLE EVENT SCENARIO

Create sample event:

Name:
Blood Donation Drive 2026

Event Code:
BD26

Capacity:
70

Waitlist:
Enabled

Waitlist Capacity:
30

Registration:
Automatic

Date:
29 September 2026

Registration opens:
1 September 2026

Registration closes:
25 September 2026

Sample registration fields:

Full Name

Employee ID

Department

Phone

Email

Blood Type

Previous Blood Donation

Preferred Donation Time

Consent

Expected behavior:

Registration #1–#70:
Confirmed

Registration #71:
Waitlisted Queue #1

Registration #72:
Waitlisted Queue #2

If registration #25 cancels:

Registration #71 becomes Confirmed.

Registration #72 becomes Queue #1.

======================================================================
97. SAMPLE ADMIN DASHBOARD

Display:

EVENTNEX

Dashboard

Total Events
18

Upcoming
5

Registration Open
3

Ongoing
1

Completed
9

Total Registrations
3,485

Confirmed
2,920

Waitlisted
145

Attendance
2,671

Recent Events

Blood Donation Drive
70 / 70 Confirmed
14 Waiting

Townhall Q3
320 / 500 Confirmed

Premier Client Dinner
98 / 120 Confirmed

======================================================================
98. SAMPLE EVENT DASHBOARD

Blood Donation Drive 2026

Status:
REGISTRATION OPEN

Capacity:
70

Confirmed:
70

Available:
0

Waitlist:
14

Checked In:
0

Registration Deadline:
25 September 2026

Tabs:

Overview
Registrations
Participants
Queue
Check-In
Attendance
Notifications
Analytics
Team
Settings

======================================================================
99. QUEUE ADMIN PAGE

Create dedicated Queue tab.

Columns:

Queue Position

Registration Number

Participant Name

Registered At

Waitlisted At

Priority

Status

Actions

Example:

#1
BD26-000071
Participant A
10:01 AM
10:01 AM
Normal
Waitlisted

#2
BD26-000072
Participant B
10:03 AM
10:03 AM
Normal
Waitlisted

Admin actions:

Promote

Change Priority

Cancel

View Registration

Manual priority change must require permission and audit logging.

======================================================================
100. REGISTRATION TABLE

Columns:

Registration Number

Participant

Email

Phone

Status

Confirmed Position

Queue Position

Registered At

Attendance

Actions

Example:

BD26-000069
Participant X
Confirmed
69

09:50

BD26-000070
Participant Y
Confirmed
70

09:52

BD26 Event 71
Participant Z
Waitlisted

1
09:53

======================================================================
101. DELETE RULES

Avoid hard deleting important transactional records.

Events:
Archive rather than delete if registrations exist.

Registrations:
Use Cancelled status rather than permanent deletion.

Audit Logs:
Never editable by normal users.

If hard deletion is required by privacy policy, implement controlled data deletion workflow.

======================================================================
102. TIMEZONE

Store timestamps in UTC.

Display according to event timezone.

Each event must have explicit timezone.

Default timezone may come from organization settings.

======================================================================
103. DATE VALIDATION

Validate:

Event end > event start

Registration close > registration open

Registration close should normally be <= event start

Cancellation deadline <= event start

Show warnings for unusual configurations.

======================================================================
104. FORM BUILDER VERSIONING

After an event has active registrations, changing form fields must not corrupt historical responses.

Use stable field IDs.

Do not delete historical form response definitions without preserving their labels and values.

If necessary, mark fields inactive rather than hard deleting.

======================================================================
105. REGISTRATION HISTORY

Track registration lifecycle.

Example:

10:00
Registration Created

10:00
Status Confirmed

15:00
Participant Cancelled

or:

10:00
Registration Created

10:00
Waitlisted

12:15
Promoted from Queue #1

12:15
Confirmed

======================================================================
106. SYSTEM VALIDATION

Before creating or updating database schema, verify relationships.

Before implementing critical workflow, define:

Input

Validation

Transaction Boundary

Database Mutation

Notification

Audit Log

Error State

Do not implement business-critical processes only inside frontend components.

======================================================================
107. CODE QUALITY REQUIREMENTS

Use:

PHP strict typing

PSR-12 / Laravel coding standards

Pint / PHP-CS-Fixer

Reusable services

Repository/service separation where useful

Proper error handling

Consistent naming

No duplicated business logic

No huge files

No hard-coded secrets

No hard-coded event IDs

No magic numbers

======================================================================
108. FOLDER STRUCTURE

Use a clean Laravel structure similar to:

app/

app/Http/Controllers/

app/Http/Middleware/

app/Http/Requests/

app/Models/

app/Services/

app/Mail/

app/Exports/

routes/

routes/web.php

routes/api.php

resources/

resources/views/

resources/views/admin/

resources/views/events/

resources/views/register/

resources/views/tickets/

resources/views/layouts/

resources/views/components/

resources/css/

resources/js/

database/

database/migrations/

database/seeders/

database/factories/

public/

config/

tests/

Adjust architecture if necessary but keep modules separated.

======================================================================
109. SEED DATA

Create development seed data.

Users:

Super Admin

Event Admin

Check-In Staff

Events:

Blood Donation Drive 2026

Corporate Townhall Q3

Premier Customer Dinner

Training Workshop

Include example participants and waitlisted registrations.

======================================================================
110. DEMO ACCOUNTS

For development environment only, provide demo accounts.

Example:

Super Admin

Event Manager

Check-In Staff

Do not use fixed passwords in production.

======================================================================
111. DEVELOPMENT DOCUMENTATION

Create:

README.md

Document:

Project setup

Environment variables

Database setup

Database migrations (php artisan migrate)

Seed command (php artisan db:seed)

Development command

Production build

Deployment

Architecture

Authentication

Roles

Queue logic

QR logic

Testing

======================================================================
112. DEPLOYMENT READINESS

The final system must support:

composer install

npm install

database migration (php artisan migrate)

database seed (php artisan db:seed)

npm run dev / npm run build

php artisan serve

Build must complete without errors.

No unresolved PHP or JavaScript errors.

No broken imports.

No placeholder APIs in production paths.

======================================================================
113. IMPLEMENTATION BEHAVIOR FOR ANTIGRAVITY

Do not attempt to generate the entire platform in one single file.

Work module by module.

Before implementing each major module:

1. inspect the existing project
2. understand existing architecture
3. identify required database changes
4. identify backend changes
5. identify frontend changes
6. implement
7. run lint
8. run type check
9. run tests
10. fix errors
11. verify UI
12. continue to next module

Never intentionally break previously completed functionality.

Do not replace working modules unnecessarily.

Prefer extending existing code over rewriting stable code.

======================================================================
114. DEVELOPMENT PRIORITY

Prioritize correctness over decorative UI.

Priority order:

1. Database architecture
2. Authentication
3. Authorization
4. Event CRUD
5. Registration
6. Capacity
7. Queue
8. Concurrency
9. QR
10. Check-In
11. Attendance
12. Notifications
13. Reporting
14. UI polish

Capacity and queue correctness are mission-critical.

======================================================================
115. MAIN BUSINESS RULE SUMMARY

Rule 1:
Every event is independent.

Rule 2:
Every registration belongs to exactly one event.

Rule 3:
Every registration receives a permanent registration number.

Rule 4:
Confirmed registrations cannot exceed configured capacity.

Rule 5:
Registrations beyond capacity enter the queue if waitlist is enabled.

Rule 6:
Queue uses FIFO by default.

Rule 7:
Queue position is dynamic.

Rule 8:
When a confirmed seat becomes available, queue #1 is promoted.

Rule 9:
Registration number never changes during promotion.

Rule 10:
Participant data must remain private.

Rule 11:
QR must not expose participant personal data.

Rule 12:
Administrative changes must be permission controlled.

Rule 13:
Important changes must be audit logged.

Rule 14:
Capacity allocation must be concurrency safe.

Rule 15:
The platform must support many different event types without changing source code for each event.

======================================================================
116. FINAL EXPECTED PRODUCT

The final result should feel like a professional enterprise event-management product rather than a simple registration form.

The user should be able to:

Create an event in minutes.

Configure registration without coding.

Set participant capacity.

Automatically handle waiting lists.

Know exactly who registered.

Know who is confirmed.

Know who is waiting.

Know each participant’s queue position.

Automatically promote people when seats become available.

Issue secure QR tickets.

Scan participants at the venue.

Track attendance.

View statistics.

Export reports.

Reuse event templates.

Manage multiple events from one dashboard.

The platform should support the complete event lifecycle:

PLAN
→ PUBLISH
→ REGISTER
→ QUEUE
→ CONFIRM
→ CHECK-IN
→ ATTEND
→ REPORT
→ ARCHIVE

======================================================================
117. FIRST BUILD INSTRUCTION

Start by creating the technical foundation.

Do not immediately build every feature.

First:

1. Initialize the Laravel PHP project.
2. Configure Tailwind CSS and Vite/Asset pipeline.
3. Configure MySQL / MariaDB and Eloquent ORM.
4. Design the complete database schema and migrations.
5. Implement authentication.
6. Implement role-based authorization.
7. Create the admin layout.
8. Create event CRUD.
9. Create event creation wizard.
10. Create the public event listing.
11. Create event detail page.
12. Implement dynamic registration forms.
13. Implement registration numbering.
14. Implement capacity allocation.
15. Implement waitlist queue logic with concurrency safety.

After these are completely functional and tested, continue with:

QR ticketing

Check-in

Attendance

Notifications

Analytics

Reporting

Templates

Audit logs

Do not skip testing of the capacity and queue system before continuing.

At every stage, maintain a working build.

The application should remain runnable after every completed implementation phase.

======================================================================
END OF PRODUCT REQUIREMENTS DOCUMENT