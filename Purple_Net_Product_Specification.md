# Purple Net
## Product Requirements, Architecture, Roadmap, and Codex Launch Prompt

Version 1.0  
Prepared for Carlos  
Initial release target: private, single-user recruiting CRM for SFA double bass recruiting

---

## 1. Product vision

Purple Net is a private, mobile-responsive recruiting CRM for managing the complete SFA double bass recruiting process:

**Director outreach → school visit or masterclass → student inquiry → follow-up → audition → application → scholarship → enrollment or closed outcome**

The application will replace disconnected spreadsheets, email notes, calendars, and informal tracking with one secure system. It will be designed for one user, deployed through Netlify, backed by Supabase PostgreSQL, and optimized for desktop planning and phone use during school visits.

Purple Net must not send email automatically. It may create Outlook drafts, tasks, reminders, recommendations, and reports, but all external communication remains under the user’s control.

---

## 2. Confirmed product decisions

### 2.1 User and access model

- Single user only
- No public registration
- App-managed email and password authentication
- One administrator account created during setup
- Optional two-factor authentication, strongly recommended
- Secure password hashing
- Password reset flow
- Session expiration
- Sign out from all devices
- Login rate limiting and temporary lockout
- Audit records for authentication and sensitive actions

### 2.2 Deployment model

- Private web application
- Netlify hosting and deployment
- Supabase PostgreSQL database
- Supabase private object storage
- Private GitHub repository
- Separate development, staging, and production environments
- Netlify deploy previews for pull requests
- No production database access from automated tests
- Explicit migration approval before production deployment

### 2.3 Technical stack

- Next.js with TypeScript
- Tailwind CSS
- Restrained component library suitable for accessible CRM interfaces
- Drizzle ORM
- PostgreSQL through Supabase
- Zod validation
- Vitest
- React Testing Library
- Playwright
- Supabase private storage for direct uploads
- OneDrive and SharePoint links
- Microsoft Graph for Outlook draft creation when approved
- Outlook web compose fallback
- Provider-neutral AI abstraction, starting with OpenAI
- IndexedDB and synchronization queue in the later offline phase

### 2.4 Scope

- Double bass recruiting only
- Schools and directors persist across recruiting cycles
- Prospect records are organized by expected entry term
- Fall, Spring, and Summer cycles
- Transfer prospects supported
- Active cycles begin four years before the entry term and remain active through the enrollment census date
- Cycles may be archived or reopened manually

---

## 3. Initial source workbook

File: `TX_Metro_Orchestra_Directors_Phase2.xlsx`

### 3.1 Verified workbook structure

The workbook contains three sheets:

1. **Directors**
   - 260 data rows plus header
   - 14 columns
2. **Summary**
   - Confidence-tier totals and project notes
3. **Needs Manual Search**
   - 87 unresolved data rows plus instruction and header rows
   - Manual verification columns for email, phone, source, date, and notes

### 3.2 Directors sheet columns

- Metro
- School
- District
- UIL Conf
- Director (UIL)
- Email
- Confidence / Source Note
- School Phone
- School Address
- City
- Zip
- School Website
- Tier
- Outreach Notes

### 3.3 Confidence-tier totals

- A - Verified: 19
- B - High-confidence inferred: 154
- C - Needs manual match: 24
- D - Not found: 63
- Total: 260

### 3.4 Import requirements

Purple Net must never import this workbook directly into live records without review.

The import process must:

1. Upload Excel or CSV files into an import batch.
2. Preserve every original row and cell value in immutable staging records.
3. Identify the source workbook, sheet, row number, import timestamp, and file hash.
4. Map recognized columns to normalized fields.
5. Preserve unmapped columns.
6. Detect likely duplicate schools and directors.
7. compare incoming values with existing live values field by field.
8. Place all proposed creates, updates, conflicts, and unresolved rows in a review queue.
9. Require explicit approval before changing live records.
10. Never silently overwrite verified data.
11. Produce counts for accepted, rejected, duplicate, unresolved, and unchanged rows.
12. Preserve the original row and approval history after import completion.

### 3.5 Initial mapping rules

| Workbook field | Proposed destination |
|---|---|
| Metro | `metros.name` and school geography |
| School | `schools.name` |
| District | `districts.name` |
| UIL Conf | `schools.uil_conference` |
| Director (UIL) | director candidate parsing and employment proposal |
| Email | `director_contact_methods` |
| Confidence / Source Note | verification evidence and rationale |
| School Phone | `school_contact_methods` |
| School Address | school address line |
| City | school city |
| Zip | school postal code |
| School Website | school website contact method |
| Tier | verification status and confidence mapping |
| Outreach Notes | school or director outreach note proposal |

Director cells containing multiple names must not be treated as one person. They must generate multiple proposed person records or an unresolved parsing item for review.

---

## 4. Primary navigation

Purple Net will use this exact top-level navigation:

- Dashboard
- Prospects
- Schools
- Directors
- Visits
- Campaigns
- Tasks
- Reports
- Imports
- Templates
- Settings

After sign-in, the user lands directly on the Dashboard.

---

## 5. Dashboard requirements

The dashboard defaults to all active recruiting cycles combined. A visible cycle filter allows narrowing to a specific term.

Priority order:

1. Tasks due or overdue
2. Student prospects by recruiting stage
3. Upcoming visits, auditions, and deadlines
4. Directors needing follow-up
5. Recent communications and notes
6. Recruiting results
7. Geographic opportunities
8. Data-quality issues

### 5.1 Dashboard widgets

- Overdue tasks
- Tasks due today
- Upcoming tasks
- Prospects by pipeline stage
- Hot prospects needing action
- Upcoming visits and masterclasses
- Upcoming auditions and deadlines
- Directors awaiting follow-up
- Inactive or at-risk prospects
- Incomplete applications
- Recent activity
- Recently added prospects
- Data verification review items
- Import review items

---

## 6. Schools and directors CRM

### 6.1 School capabilities

- Search, filter, sort, and archive schools
- Metro and geographic region organization
- District association
- UIL conference
- Priority tier
- Custom tags
- Website, phone, and address
- Verification status and evidence
- Related directors and employment history
- Related prospects
- Visits and masterclasses
- Campaign memberships
- Tasks and communications
- Outreach notes
- Nearby-school grouping and route planning

### 6.2 Director capabilities

Store and manage:

- Name
- Preferred name
- Current title
- Current school and district
- Work email
- Work phone
- Public professional contact sources
- Verification status
- Confidence and rationale
- Source URL or source document
- Last verified date
- Future review date
- Contact preferences and notes
- Interest status: interested, neutral, declined, no response
- Opportunities: masterclass, sectional, visit, referral, concert, other
- Communication history
- Follow-up dates and tasks
- Campaign history

### 6.3 Director employment model

A director is a persistent person record. Employment is stored separately.

Each employment record includes:

- School
- District
- Title
- Start date
- End date
- Current-employment flag
- Verification status
- Source
- Last verified date
- Confidence
- Notes

Changing schools must never erase prior communications, visits, campaign participation, or relationship history.

### 6.4 Verification statuses

- Verified
- Likely
- Needs review
- Outdated
- Not found

Every verification record stores:

- source URL or document
- verification date
- notes
- confidence level
- provenance
- future review date

---

## 7. Prospect CRM

### 7.1 Minimum required fields at creation

- Full name
- School
- Recruiting cycle
- Information source
- Initial pipeline stage

### 7.2 Full prospect information

- Full name
- Preferred name
- School
- Graduation year
- Recruiting cycle
- Transfer status
- Student email and phone
- Parent or guardian contacts
- Director referral
- Information source and consent provenance
- Academic interests
- Intended major
- Playing level
- Repertoire
- Audition status
- Application status
- Admission status
- Scholarship status
- Campus visit history
- School-visit history
- Communication history
- Notes
- Financial concerns relevant to recruiting
- Competing-school interest
- Enrollment decision
- Closed reason
- Reasons for enrollment, decline, or loss of contact
- Attachments and OneDrive or SharePoint links

### 7.3 Pipeline stages

Active pipeline:

1. New lead
2. Contacted
3. Engaged
4. Visit scheduled
5. Audition planned
6. Audition completed
7. Applied
8. Admitted
9. Scholarship offered
10. Committed
11. Enrolled

Closed outcomes:

- Declined SFA
- Chose another school
- Not eligible
- No longer interested
- Lost contact

Closed outcomes are separate from active pipeline stages.

### 7.4 Interest levels

- Hot
- Warm
- Cool
- Inactive

Interest is separate from pipeline stage.

### 7.5 Recruiting score

Each prospect has a transparent rule-based score.

Factors:

- responsiveness
- audition intent
- application progress
- school or campus visit engagement
- playing level
- academic fit
- director recommendation
- recency of activity
- stated interest in SFA
- scholarship competitiveness
- distance or travel barriers
- financial concerns
- competing-school interest
- missed deadlines
- repeated nonresponse

Requirements:

- total score
- factor-level contribution
- adjustable weights in Settings
- last calculated timestamp
- missing-data explanation
- manual override with required note
- AI may recommend but never apply score changes automatically

### 7.6 Duplicate detection

Likely duplicate prospects are identified using:

- legal and preferred name
- school
- graduation year
- recruiting cycle
- email
- phone
- parent information

Duplicates enter a review screen. Purple Net never merges automatically.

---

## 8. Tasks and reminders

Purple Net automatically creates tasks and reminders but never sends communication automatically.

### 8.1 Task sources

- Manual
- Pipeline rule
- Communication follow-up
- Visit
- Campaign
- School
- Director
- Prospect
- Import issue
- Missing-data or verification warning
- Recurring rule

### 8.2 Task fields

- Title
- Description or notes
- Due date
- Optional reminder date
- Priority
- Status
- Related entity
- Source
- Recurrence rule
- Created date
- Completed date
- Dismissal or cancellation reason

### 8.3 Priorities

- Urgent
- High
- Normal
- Low

Overdue tasks rise to the top without changing their assigned priority.

### 8.4 Statuses

Active:

- Open
- In progress
- Waiting
- Completed

Terminal alternatives:

- Dismissed
- Canceled

### 8.5 Initial automation rules

- Director has not replied after seven days
- Second director follow-up after fourteen days
- Contact referred student after a visit
- Incomplete application reminder
- Upcoming audition deadline
- Post-scholarship-offer check-in
- Inactivity warning
- Verification review due
- Import issue awaiting decision

All rules must be configurable later.

---

## 9. Visits, masterclasses, and travel

A visit or trip may include multiple schools.

Each record supports:

- School or schools
- Director or directors
- Date and time
- Location
- Visit type
- Goals
- Students met
- Notes
- Outcomes
- Photos
- Documents
- Follow-up tasks
- Travel notes
- Mileage
- Expenses
- Prospect-generation results

Visit types include:

- Masterclass
- Sectional
- Individual lesson
- Concert
- Recruiting presentation
- School visit
- Other

Mobile entry must make it quick to add notes, prospects, photos, director updates, and follow-up tasks.

---

## 10. Campaigns and outreach

Campaigns support:

- Name
- Objective
- Selected schools or directors
- Saved outreach lists
- Tags
- Metro, region, tier, and geography filters
- Email template
- Personalized merge fields
- Planned contact dates
- Campaign-specific tasks
- Batch draft generation
- Individual review and sending
- Results and conversion reporting

Campaign recipient statuses:

- Not started
- Draft prepared
- Sent
- Replied
- Declined
- Follow-up due

No automatic sending is permitted.

---

## 11. Email templates and Outlook drafts

### 11.1 Template features

- Categories
- Merge fields
- Multiple versions
- Reusable subject lines
- Attachments
- OneDrive and SharePoint links
- Preview
- Version history
- AI-assisted personalization
- Mandatory review before draft creation

Suggested categories:

- Director introduction
- Visit request
- Masterclass proposal
- Student follow-up
- Audition reminder
- Application reminder
- Scholarship follow-up
- Post-visit thank-you

### 11.2 Outlook workflow

Preferred path:

1. Use Microsoft Graph to create a draft in the SFA Outlook mailbox.
2. The user reviews, edits, attaches files, and sends from Outlook.
3. Purple Net records that a draft was created.
4. The user manually marks the communication as sent and records replies.

Fallback:

- Open a pre-addressed Outlook web compose window with subject and body populated.

Future compatibility:

- Store optional external message IDs and synchronization metadata.
- Allow Microsoft 365 sent-message and reply synchronization later.

---

## 12. Documents and file storage

Purple Net supports both:

- Direct private uploads
- OneDrive or SharePoint links

File categories include:

- Audition materials
- Scholarship letters
- Visit photos
- Scanned notes
- Student résumés
- Repertoire lists
- Recommendation letters
- Application documents
- Other recruiting material

File metadata:

- Category
- Related entity
- Original filename
- MIME type
- Size
- Storage location or external link
- Uploaded date
- Notes
- Retention status

No public file URLs.

---

## 13. Privacy, security, and retention

### 13.1 Student information

Purple Net may store information for minors, including parent-approved contact information. Data collection must remain limited to legitimate recruiting needs.

Required controls:

- HTTPS only
- Secure cookies
- CSRF protection where applicable
- Content Security Policy
- Input validation
- Output encoding
- Rate limiting
- Strong password hashing
- Optional two-factor authentication
- Private object storage
- Least-privilege database access
- Secrets only in server-side environment variables
- Audit logging
- Backup and export controls
- No production data in development or automated tests

### 13.2 Retention

Inactive or lost prospect records:

- Retain for four years after closure or inactivity
- Flag before the retention deadline
- Allow extension, anonymization, or permanent deletion
- Preserve aggregated reporting after anonymization

Active, committed, and enrolled records may use separate retention rules.

### 13.3 AI privacy rules

- No provider training on recruiting data where provider controls allow opt-out or API no-training terms
- Minimum necessary fields sent
- Redact sensitive fields when not needed
- Show what data was used
- Log prompt, model, output, approval, and resulting action
- No automatic messages, merges, deletions, score changes, or pipeline changes
- Global AI disable switch

---

## 14. Reporting and analytics

Reports include:

- Prospects by pipeline stage
- Conversion rates between stages
- Results by school
- Results by district
- Results by metro
- Results by priority tier
- Results by tag
- Results by campaign
- Director response rates
- Visits and masterclasses producing prospects
- Applications
- Auditions
- Admissions
- Scholarships
- Commitments
- Enrollments
- Results by recruiting cycle
- Lost-prospect reasons
- Follow-up completion
- Overdue-task trends
- Mileage
- Expenses
- Year-over-year comparisons

Reports must support filters and export where practical.

---

## 15. Geographic planning

Purple Net supports:

- Metro areas
- Geographic regions
- Priority tiers
- Custom tags
- Saved outreach lists
- Campaigns
- Nearby-school grouping
- Visit routes

Advanced route optimization may be deferred, but the data model must support latitude, longitude, and ordered trip stops.

---

## 16. Offline mobile phase

Offline functionality is not part of the first usable release, but the architecture must not prevent it.

Later support:

- Cache selected school, director, visit, and prospect records
- Create visit notes offline
- Add prospects offline
- Attach photos offline
- Update contact information offline
- Create tasks offline
- Mark activities complete offline
- Synchronize when connectivity returns
- Review conflicts instead of overwriting silently

Use IndexedDB and an explicit synchronization queue.

---

## 17. AI roadmap

The provider-neutral AI layer will eventually support:

1. Summarizing visit notes and communications
2. Suggesting next actions
3. Drafting follow-up messages
4. Identifying inactive or at-risk prospects
5. Recommending schools for travel
6. Detecting missing or inconsistent data
7. Generating reports and narrative summaries
8. Estimating advancement likelihood
9. Natural-language database search
10. Email personalization

Every AI-generated output requires review.

---

## 18. Proposed normalized data model

The schema should use UUID primary keys, UTC timestamps, explicit foreign keys, and soft deletion or archival where appropriate.

### 18.1 Identity and security

- `users`
- `password_credentials`
- `sessions`
- `password_reset_tokens`
- `two_factor_methods`
- `login_attempts`
- `audit_events`

### 18.2 Geography and institutions

- `metros`
- `regions`
- `districts`
- `schools`
- `school_addresses`
- `school_contact_methods`
- `school_tags`
- `tags`
- `school_verifications`

### 18.3 Directors

- `directors`
- `director_employments`
- `director_contact_methods`
- `director_verifications`
- `director_interests`
- `director_opportunities`

### 18.4 Recruiting cycles and prospects

- `recruiting_cycles`
- `prospects`
- `prospect_contacts`
- `guardians`
- `prospect_guardians`
- `prospect_sources`
- `prospect_stage_history`
- `prospect_interest_history`
- `prospect_score_snapshots`
- `prospect_score_factors`
- `prospect_closed_outcomes`
- `duplicate_candidates`
- `duplicate_reviews`

### 18.5 Academic and recruiting details

- `prospect_academic_interests`
- `prospect_repertoire`
- `prospect_statuses`
- `auditions`
- `applications`
- `admissions`
- `scholarships`
- `enrollment_decisions`
- `competing_schools`

### 18.6 Activities and communication

- `communications`
- `communication_participants`
- `communication_external_refs`
- `notes`
- `activities`
- `tasks`
- `task_recurrences`
- `automation_rules`
- `automation_runs`

### 18.7 Visits and travel

- `trips`
- `trip_stops`
- `visits`
- `visit_schools`
- `visit_directors`
- `visit_prospects`
- `visit_outcomes`
- `expenses`
- `mileage_entries`

### 18.8 Campaigns and templates

- `campaigns`
- `campaign_members`
- `campaign_member_status_history`
- `email_templates`
- `email_template_versions`
- `draft_requests`
- `outlook_draft_refs`

### 18.9 Files

- `files`
- `file_links`
- `file_relationships`
- `file_retention_actions`

### 18.10 Imports

- `import_batches`
- `import_files`
- `import_sheets`
- `import_rows`
- `import_cells`
- `import_mappings`
- `import_proposals`
- `import_field_changes`
- `import_reviews`
- `import_errors`

### 18.11 AI

- `ai_providers`
- `ai_feature_settings`
- `ai_requests`
- `ai_request_fields`
- `ai_outputs`
- `ai_approvals`

---

## 19. Data integrity rules

- A school with related records is archived by default, not hard deleted.
- A director with employment or communication history is archived by default.
- Historical employment remains immutable except through an audited correction.
- A prospect stage change creates a history record.
- A manual score override requires a note.
- A communication marked sent requires a sent timestamp.
- A campaign draft may not be marked sent automatically.
- Import approval must be transactional.
- Every live field originating from an import must retain provenance.
- Duplicate merges require explicit user action and an audit event.
- Attachments must not have public access.
- Destructive actions require explicit confirmation and audit logging.

---

## 20. Eight-phase implementation roadmap

### Phase 1: Repository, environments, authentication, and database foundation

Deliverables:

- Fresh private repository
- Next.js TypeScript project
- Tailwind and component foundation
- Drizzle configuration
- Initial Supabase connection setup
- Environment validation
- Development, staging, and production configuration documentation
- Core auth tables and single-user authentication
- Protected application shell
- Primary navigation
- SFA-inspired visual tokens
- Unit and end-to-end test foundations
- Netlify configuration
- CI checks

Acceptance criteria:

- Fresh install succeeds from documented commands.
- Local application runs without production credentials.
- Database migrations apply to an empty development database.
- No public registration route exists.
- Seed command creates exactly one administrator account using environment-provided credentials.
- Login and logout work.
- Protected routes redirect unauthenticated users.
- Passwords are never stored in plaintext.
- Session cookie settings are secure in production.
- Navigation renders on desktop and mobile.
- Tests, lint, typecheck, build, and migration validation pass.
- No workbook data is imported yet.

### Phase 2: Excel import staging, mapping, review, and approval

Deliverables:

- Workbook upload
- Directors sheet parser
- Summary display
- Manual-search sheet parser
- Immutable staging storage
- Mapping interface
- Duplicate detection
- Field-level comparison
- Review and approval queue
- Import summary
- Provenance

Acceptance criteria:

- The supplied workbook produces 260 staged director rows.
- Tier totals equal 19, 154, 24, and 63.
- Original rows and cells are preserved.
- Multiple director names are not collapsed into one person.
- No live record changes occur before approval.
- Approved changes commit transactionally.
- Rejected proposals remain auditable.

### Phase 3: Schools and directors CRM

Deliverables:

- School list and detail views
- Director list and detail views
- Filters, tags, tiers, and regions
- Employment history
- Verification evidence
- Archive and restore
- Contact history
- Opportunities and interest

### Phase 4: Prospect pipeline and duplicate review

Deliverables:

- Prospect list and detail
- Pipeline board
- Recruiting cycles
- Closed outcomes
- Interest levels
- Rule-based score
- Stage history
- Duplicate candidate review
- Quick mobile prospect form

### Phase 5: Tasks and daily dashboard

Deliverables:

- Task CRUD
- Rule-generated tasks
- Recurring tasks
- Daily dashboard
- Cycle filters
- Priority ordering
- Director and prospect follow-up indicators

### Phase 6: Visits and masterclasses

Deliverables:

- Trips and multi-school visits
- Visit types
- Students met
- Notes and outcomes
- Follow-up task creation
- Photos and documents
- Mileage and expenses

### Phase 7: Templates, campaigns, and Outlook draft workflow

Deliverables:

- Template management and versions
- Merge fields
- Campaign membership and statuses
- Batch draft preparation
- Microsoft Graph integration
- Outlook compose fallback
- Manual sent and reply tracking

### Phase 8: Mobile refinement, testing, and production launch

Deliverables:

- Mobile usability review
- Accessibility review
- Security hardening
- Production migrations
- Backup and export
- Restore documentation
- Full test suite
- Netlify and production Supabase launch

---

## 21. First-release exclusions

Unless required by a dependency, do not implement these in the first release:

- Full offline synchronization
- AI features
- Automatic Microsoft 365 inbox or sent-message synchronization
- Automatic email sending
- Advanced route optimization
- Direct SFA system integration
- Advanced year-over-year analytics beyond the launch reporting scope

The schema and service boundaries should allow these later.

---

## 22. Backup and export requirements

- Supabase automated backups where supported by the selected plan
- Manual full export from Settings
- CSV exports for schools, directors, prospects, tasks, visits, and campaigns
- Complete JSON disaster-recovery export
- Attachment manifest
- Audit-log export
- Restore procedures documented in the repository
- Periodic in-app reminder to test a restore

---

## 23. Production launch definition

Production launch is successful when:

- Secure sign-in works on desktop and phone.
- The workbook imports through staging and review without source-data loss.
- Schools and directors are searchable, filterable, editable, and historically accurate.
- Double bass prospects move through the full pipeline.
- Likely duplicates are flagged for review.
- The dashboard correctly prioritizes overdue and current tasks.
- Visits, students met, notes, documents, mileage, and follow-up actions can be recorded.
- Campaigns generate personalized Outlook drafts without sending automatically.
- Critical workflows have automated tests.
- Production data is backed up and exportable.
- Netlify and production Supabase operate reliably.
- No known critical or high-severity security defects remain.

---

## 24. Codex operating rules

Codex must follow these rules throughout the project:

1. Work in small, reviewable phases.
2. Do not begin the next phase until the current phase acceptance criteria pass.
3. Inspect the repository before making changes.
4. Explain the intended change set before broad modifications.
5. Prefer explicit schemas, migrations, and service boundaries.
6. Never connect automated tests to production.
7. Never expose service-role keys or database credentials to the browser.
8. Never add public registration.
9. Never send email automatically.
10. Never merge duplicate records automatically.
11. Never silently overwrite imported or verified data.
12. Preserve source evidence, provenance, history, and audit records.
13. Treat student and minor data as private.
14. Use transactions for multi-record approval, merge, stage change, and import operations.
15. Add or update tests with every behavior change.
16. Run lint, typecheck, unit tests, integration tests, and build before each milestone commit.
17. Do not commit secrets, generated credentials, local database dumps, or production exports.
18. Keep environment variables documented in `.env.example` without real values.
19. Use intentional commit messages tied to the current phase.
20. Stop and report blockers rather than inventing credentials or bypassing provider controls.

---

## 25. Exact Phase 1 Codex prompt

Copy the following prompt into Codex after creating or selecting an empty local folder for the new project.

```text
Create a completely new application called Purple Net in this empty project directory. Do not reuse code, migrations, configuration, or database files from any previous recruiting project.

Product purpose:
Purple Net is a private, single-user CRM for SFA double bass recruiting. It will eventually manage schools, orchestra directors, student prospects, visits, tasks, campaigns, Outlook drafts, imports, reports, files, and later AI and offline features. This task is Phase 1 only. Do not implement the Excel import or recruiting CRM entities yet.

Required stack:
- Next.js with TypeScript
- App Router
- Tailwind CSS
- An accessible, restrained component foundation
- Drizzle ORM
- PostgreSQL, configured for Supabase
- Zod validation
- Vitest
- React Testing Library
- Playwright
- Netlify deployment configuration
- npm as the package manager unless the existing environment requires another choice

Visual direction:
Use a modern CRM layout with restrained SFA-inspired purple accents. Prioritize readability, compact information density, keyboard accessibility, responsive behavior, and strong contrast. Do not make the interface heavily decorative.

Phase 1 scope:
1. Initialize the repository and application.
2. Add a clear project structure for app routes, server-only services, database schema, authentication, validation, tests, and shared UI.
3. Configure Drizzle for PostgreSQL with explicit SQL migrations.
4. Create development-safe environment validation. Supply `.env.example` without secrets.
5. Implement app-managed, single-user email/password authentication.
6. Do not add public registration.
7. Add a setup or seed command that creates exactly one administrator account from environment-provided email and password values. Hash the password securely. The command must be idempotent and must not print the password.
8. Implement secure session handling using a server-side session store or an equivalently secure design. Use HttpOnly cookies, SameSite protection, Secure cookies in production, rotation or renewal where appropriate, and explicit expiration.
9. Add login, logout, and protected-route middleware or guards.
10. Create an authenticated application shell with this navigation:
   Dashboard, Prospects, Schools, Directors, Visits, Campaigns, Tasks, Reports, Imports, Templates, Settings.
11. After login, open Dashboard directly.
12. Build placeholder pages for each navigation destination. Clearly label them as Phase 1 placeholders rather than implementing business features.
13. Add database tables needed only for Phase 1 authentication and auditing, such as users, password credentials, sessions, login attempts, password reset tokens if implemented, and audit events.
14. Add basic login rate limiting and temporary lockout. Keep the implementation deployable on Netlify and compatible with Supabase PostgreSQL.
15. Add audit events for successful login, failed login, logout, administrator seed creation, and password changes if password change is implemented.
16. Add unit and integration tests for authentication behavior and protected routes.
17. Add a Playwright smoke test covering login, dashboard access, navigation, and logout.
18. Add lint, typecheck, test, build, and migration-validation scripts.
19. Add GitHub Actions CI for install, lint, typecheck, tests, and build. CI must not require production credentials and must never connect to production.
20. Add Netlify configuration and document the expected environment variables and deployment process.
21. Add README documentation for local setup, development database setup, migrations, creating the administrator, testing, and deployment.
22. Add an architecture decision record explaining why the project uses Next.js, Drizzle, Supabase PostgreSQL, Netlify, app-managed single-user authentication, and separate development/staging/production environments.

Security constraints:
- Never expose database credentials or Supabase service-role credentials to client-side code.
- Never commit secrets.
- Never add public sign-up.
- Do not add automatic email sending.
- Do not use production data in tests.
- Validate all authentication input with Zod.
- Use parameterized database access through Drizzle.
- Add appropriate security headers, including a practical Content Security Policy.
- Avoid storing sensitive values in logs.

Environment model:
- Local development
- Netlify deploy previews connected only to a staging or disposable database
- Staging Supabase project
- Production Supabase project
- Automated tests use an isolated test database or mocks and must fail safely if a production-looking database URL is supplied

Acceptance criteria:
- A clean checkout can be installed and started from documented commands.
- Migrations apply successfully to an empty development database.
- The administrator seed command creates one user and is safe to run repeatedly.
- There is no registration route or registration API.
- Valid credentials allow login.
- Invalid credentials fail without revealing whether the account exists.
- Repeated failed logins trigger the documented lockout behavior.
- Unauthenticated access to application routes redirects to login.
- Authenticated access opens the Dashboard.
- Logout invalidates the session.
- The full primary navigation renders and works on desktop and narrow mobile widths.
- Passwords are securely hashed and never stored or logged in plaintext.
- Tests cover the core authentication flows.
- Lint, typecheck, tests, build, and migration validation all pass.
- No Excel workbook data or recruiting-domain tables are implemented in this phase.

Working method:
- First inspect the directory and state your implementation plan.
- Make changes in small, coherent steps.
- Do not create a commit until every Phase 1 acceptance criterion that can be tested locally passes.
- If Supabase, Netlify, or GitHub credentials are unavailable, complete all local code and documentation without inventing credentials. Clearly list the exact manual setup steps that remain.
- Before finishing, run and report the exact results of lint, typecheck, tests, build, and migration validation.
- Provide a concise summary of files and architecture created, known limitations, and the recommended commit message.
```

---

## 26. Recommended repository safeguards

Add these early:

- Branch protection for `main`
- Pull request required before production deployment
- Required CI checks
- Dependabot or equivalent dependency alerts
- Secret scanning
- Private repository visibility
- Separate Netlify environment variables by context
- Separate Supabase projects for staging and production
- Production database password stored only in provider secrets
- Manual production migration step

---

## 27. Immediate setup checklist for Carlos

Before or during Phase 1:

1. Create a new private GitHub repository named `purple-net`.
2. Create a new Supabase staging project.
3. Create a separate Supabase production project, or defer production until Phase 8.
4. Create a new Netlify site linked to the repository.
5. Ensure deploy previews do not use production database credentials.
6. Decide the administrator email address to use for Purple Net login.
7. Store real secrets only in local `.env.local`, Netlify environment variables, and provider secret managers.
8. Keep `TX_Metro_Orchestra_Directors_Phase2.xlsx` outside the repository until Phase 2, or place it in a gitignored local import folder.

