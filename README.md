# Purple Net

Purple Net is a private, single-user recruiting CRM. This repository contains **Phases 1–8**: authentication, import staging, schools/directors, prospects, tasks/dashboard, visits, templates/campaigns, and launch-readiness hardening.

## Prerequisites

- Node.js 24 or later and npm
- PostgreSQL 16+ locally, or a dedicated Supabase **development** project
- A separate disposable PostgreSQL database for tests and E2E runs

## Install and configure

```bash
npm install
copy .env.example .env.local
```

Set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (16+ characters), and `APP_URL` in `.env.local`. Do not commit this file. Database and administrator values are server-only; do not use `NEXT_PUBLIC_` for them.

## Development database and migrations

Create an empty development database, then run:

```bash
npm run db:validate
npm run db:migrate
npm run admin:setup
npm run dev
```

Migrations are explicit SQL files in `drizzle/`. `db:migrate` keeps a checksum ledger in `purple_net_migrations` and refuses database URLs that look production-oriented. The administrator command is idempotent: it creates the first administrator only, never prints its password, and makes no change when one already exists.

`npm run db:generate` is available for future schema authoring, but review and commit generated SQL before applying it. Production migrations are a controlled manual command, never part of a Netlify build or deploy preview.

## Phase 2 import staging

The Imports page accepts `.xlsx` and `.csv` files up to 10 MB. A staged batch preserves the original file bytes, SHA-256 hash, sheet order, every source row/cell, display value, and formula. It maps the known Directors columns, splits multi-name director cells into separate proposals, identifies repeated in-batch candidates for conflict review, and preserves unmapped data in its original cells.

```bash
npm run import:verify-source
```

This read-only command verifies the supplied Phase 2 workbook has the expected sheets, 260 Director data rows, and 19/154/24/63 tier totals. The supplied workbook is gitignored and never auto-imported.

Reviewing a proposal records an audited approval or rejection only. It **does not** create or update schools, directors, or any other live records; transactional live-record application is deferred until the CRM schema exists in Phase 3.

## Authentication and security

There is no registration route or API. Login input is Zod-validated, passwords use Argon2id, and only password hashes are stored. Sessions are random, server-side PostgreSQL records whose browser cookie is HttpOnly, SameSite=Lax, explicitly expires after seven days, and is Secure in production. Logout deletes the database session.

Five failed attempts for a known account within 15 minutes create a 15-minute lockout. Responses always say `Invalid email or password.` to avoid account enumeration. Security audit events cover administrator creation, successful and failed logins, lockout, and logout. A CSP and practical browser security headers are configured in `next.config.ts`.

## Testing

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

For end-to-end tests, use only a disposable database, set `NODE_ENV=test`, and use a non-production-looking test `DATABASE_URL`:

```bash
npm run db:migrate
npm run admin:setup
npx playwright install chromium
npm run test:e2e
```

The E2E smoke test covers login, dashboard access, navigation, narrow width, logout, and post-logout route rejection. Never use production data or a production database for tests. `npm run guard:database` and migrations/setup reject production-looking URLs.

## Environment model and Netlify

| Environment | Database | Required setup |
| --- | --- | --- |
| Local | dedicated local or Supabase dev project | `.env.local` only |
| Automated tests | disposable test database | CI/test-only variables |
| Deploy previews | staging or disposable project only | Netlify deploy-preview variables |
| Staging | separate Supabase staging project | Netlify staging variables |
| Production | separate Supabase production project | Netlify production variables; manual migrations |

`netlify.toml` uses the Next.js Netlify plugin. In Netlify, install dependencies with npm, set `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `APP_URL` independently per context, and do not set production database values for deploy previews. Use a staging Supabase project first. Configure production secrets only in Netlify’s protected production context and run reviewed production migrations manually from a controlled environment.

## Manual provider setup

1. Create separate Supabase development/staging and production projects, retrieve their direct PostgreSQL URLs, and keep each secret server-side.
2. Create a private GitHub repository, add required CI/branch protections and secret scanning, then push this local repository.
3. Create a Netlify site connected to that repository, install the Next.js plugin, and define environment variables by deploy context.
4. Create the administrator using a secure value in the target environment; never place credentials in GitHub variables, client code, or logs.

## Production launch and restore checklist

1. Apply the reviewed migrations to staging first and validate the application there. Production migration remains a manual, controlled action from a protected environment; Netlify builds and deploy previews must never migrate it.
2. Create a separate Supabase production project and set only protected production environment variables in Netlify.
3. Enable Supabase backups for the selected plan, document the owner and restore contact, and schedule a restore rehearsal.
4. Before launch, export the PostgreSQL schema/data and retain a verified restore record. Future file storage must include an attachment manifest.
5. Confirm HTTPS, security headers, database access controls, administrator sign-in, logout, import review, and no-send Outlook behavior on desktop and narrow mobile screens.
6. Require CI, review, and explicit production approval before deployment.

## Current limitations

There is no public sign-up, password reset, MFA, provider-backed Microsoft Graph integration, file storage, offline synchronization, or AI. The Outlook path only prepares a user-reviewed compose window; it never sends email.

## Phase 3 schools and directors

Schools and directors are now live records with protected list/detail views, searchable lists, archive/restore controls, current and historical employment, contact methods, verification structures, tags, interests, and opportunities. Approved Phase 2 `create` proposals can be applied explicitly and transactionally; matching records block application for manual resolution, and imported fields retain proposal provenance.

## Phase 4 prospect pipeline

Prospects belong to a recruiting cycle and retain source, school, stage, interest level, history, and score snapshots. Scores are transparent: each calculation saves its factor contributions and missing-data list. Name-and-cycle matches become duplicate candidates for manual review only; Purple Net never merges prospects automatically.

## Phase 5 tasks and daily dashboard

Tasks support due dates, priority, status, reminder/recurrence data, and future automation-rule provenance. The dashboard prioritizes overdue, due-today, and upcoming open work without changing assigned priority.

## Phase 6 visits and travel

Visits support trip grouping, multi-school stops, school/director/prospect links, outcomes, mileage, expenses, notes, and explicit follow-up task generation. Creating a visit never sends communications.

## Phase 7 templates, campaigns, and drafts

Templates are versioned. Campaign and recipient state is preserved, while draft requests require review. The Outlook fallback opens a compose window only after the user asks for it; Purple Net never sends email automatically.

Phase 8 is the current release-readiness phase. Remaining provider-owned work is the manual Supabase, Netlify, GitHub, backup, and restore setup listed above.
