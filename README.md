# Purple Net

Purple Net is a private, single-user recruiting CRM. This repository currently contains **Phase 1 only**: the application foundation, authentication, security, audit trail, and navigation shell. It deliberately contains no workbook import or recruiting-domain records.

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

## Current limitations

This phase intentionally has no public sign-up, password reset, MFA, email, file storage, imports, workbook handling, or recruiting-domain tables/features. The supplied Excel workbook is ignored and untouched.

The recommended next step is Phase 2: immutable Excel import staging, mapping, review, duplicate detection, and explicit approval—without writing directly to live records.
