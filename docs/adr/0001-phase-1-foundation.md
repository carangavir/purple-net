# ADR 0001: Phase 1 application and environment foundation

## Status

Accepted — Phase 1

## Context

Purple Net will contain private recruiting information, including future student and minor data. It needs a small, deployable private application now without prematurely modeling recruiting records.

## Decision

- Use **Next.js App Router with TypeScript** for a typed full-stack application, server-rendered protected routes, and Netlify-compatible deployment.
- Use **Drizzle ORM** plus reviewed, explicit SQL migrations for typed parameterized database access and transparent schema changes; do not use Prisma.
- Use **Supabase PostgreSQL** as managed PostgreSQL. The application connects only from server-side code using a direct database URL; no Supabase service-role key is exposed to the browser.
- Use **Netlify** for hosting and deploy previews, with the official Next.js plugin. Builds never migrate a database.
- Use **app-managed single-user authentication**: one administrator seeded from server environment values, Argon2id hashes, PostgreSQL session records, and audit events. There is no public registration.
- Keep **development, staging, production, and test** databases separate. Previews use staging/disposable resources; automated testing must never use production data or URLs. Production migrations require explicit controlled execution.

## Consequences

Phase 1 has a small security-only schema (`users`, `password_credentials`, `sessions`, `login_attempts`, and `audit_events`). Future recruiting domains will be introduced only in later phases. Provider projects and protected environment variables require manual setup before deployment.
