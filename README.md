# ATS Project

> A modern applicant tracking system built to help teams organize job openings, candidates, and hiring workflows in one place.

[![GitHub repo](https://img.shields.io/badge/GitHub-Repository-181717?logo=github)](https://github.com/cliford-dareus/ats-project)
[![Status](https://img.shields.io/badge/status-in%20development-yellow)](https://github.com/cliford-dareus/ats-project)

## Overview

ATS Project is an applicant tracking system (ATS) designed to streamline recruitment workflows. It provides a central workspace for managing candidates, job postings, application progress, and hiring decisions.

Post jobs, move candidates through a drag-and-drop pipeline, auto-parse resumes, trigger automated emails and calendar invites, and generate hiring reports — all in one app.

## Features

- Job listings — multi-step job creation, department tagging, tech-stack requirements, and status tracking (Open / Closed / Draft / Archived / Pending)
- Candidate pipeline — Kanban-style drag-and-drop board for moving candidates through custom hiring stages
- Resume intelligence — AI-assisted resume parsing and candidate summaries (Google Gemini + pdf-parse)
- Bulk import — CSV candidate import with history and validation guidelines
- Smart triggers — automation engine that fires actions (move stage, send email/message, schedule interview, add note, tag, score) on stage-change conditions
- Communication — templated interview-invite and organization-invite emails via Resend / React Email
- Calendar integration — Google Calendar sync for interview scheduling
- Reports & analytics — dashboard charts, performance metrics, and downloadable hiring reports (PDF/CSV)
- Multi-tenant organizations — organization and department management, role-based access, member invites
- Plugin system — extensible plugin architecture (analytics, external job board syndication, smart triggers) that organizations can enable/configure per-tenant
- Authentication — Clerk-powered sign-in/sign-up with webhook-synced user records

<!--> **TODO:** Remove features that are not implemented and add your actual features.-->

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 |
| Language | TypeScript |
| Styling / UI | Tailwind CSS, shadcn/ui, Radix UI |
| Auth | Clerk |
| Relational DB | MySQL via Drizzle ORM |
| Document DB | MongoDB via Mongoose (notes, attachments, email, experience, smart-task history) |
| File storage | Cloudflare R2 (S3-compatible) |
| Queue / cache | Redis + BullMQ |
| Email | Resend + React Email |
| AI | Google Generative AI (Gemini) |
| Calendar | Google Calendar API |
| Charts / exports |  Chart.js, Recharts, jsPDF |

## Getting Started

### Prerequisites

Before running the project locally, install:

- [Node.js](https://nodejs.org/) (LTS recommended)
- Node.js 18+
- A MySQL database
- A MongoDB database
- Redis instance
- Accounts/API keys for: Clerk, Cloudflare R2, Resend, Google Cloud (Generative AI + Calendar API)
<!--- **TODO:** Any additional tools, such as Expo CLI, Docker, or the Supabase CLI-->

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/cliford-dareus/ats-project.git
   ```

2. Open the project directory:

   ```bash
   cd ats-project
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Create your environment file:

   ```bash
   cp .env.example .env
   ```

5. Add the required values to `.env`. See [Environment Variables](#environment-variables) for the full list — at minimum Clerk keys, `DB_*` + `DATABASE_URL`, `MONGODB_URI`, `REDIS_URL`, `RESEND_API_KEY`, `INTERNAL_TRIGGER_SECRET` (server-only; never `NEXT_PUBLIC_*`), and `PLUGIN_ENCRYPTION_KEY` (server-only; required before any plugin API key can be saved — see [Plugin API key encryption](#plugin-api-key-encryption)).

6. Apply the database migrations:

   ```bash
   npm run db:migrate
   ```

7. Start the development server:

   ```bash
   npm run dev
   ```

8. Open the local URL shown in your terminal.

### Local subdomains

The app routes by hostname (`src/middleware.ts`): marketing on the apex, the
dashboard on `app.<domain>`, and org career pages on `<org-subdomain>.<domain>`.
For local development, add these to `/etc/hosts`:

```text
127.0.0.1 aplico.localhost app.aplico.localhost
```

Then use `http://app.aplico.localhost:3000` for the dashboard and
`http://aplico.localhost:3000` for marketing. `NEXT_PUBLIC_LOCAL_DOMAIN`
(default `aplico.localhost`) controls the local root domain.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Runs `drizzle-kit migrate`, then creates a production build |
| `npm run start` | Runs the production build locally |
| `npm run worker` | Starts the BullMQ worker (`src/worker/index.ts`) |
| `npm run socket` | Starts the socket server (`src/socket/socket.ts`) |
| `npm run db:generate` | Generates a Drizzle migration from schema changes |
| `npm run db:migrate` | Applies pending Drizzle migrations to MySQL |
| `npm run db:push` | Pushes the Drizzle schema directly to MySQL (dev only) |
| `npm run db:check` | Checks Drizzle migrations against the schema |
| `npm run db:studio` | Opens Drizzle Studio |
| `npm run lint` | Checks code quality and style |
| `npm run email` | Previews React Email templates |
<!--| `npm test` | Runs the test suite |-->

## Project Structure

```text
src/
├── app/
│   ├── (auth)/           # Sign-in / sign-up
│   ├── (dashboard)/      # Main app: jobs, candidates, applications, reports, settings
│   ├── (site)/           # Public-facing marketing pages
│   ├── api/               # Route handlers (uploads, webhooks, reports, triggers)
│   └── onboarding/        # Organization onboarding flow
├── components/             # Shared UI + feature components (kanban, modals, tables)
├── drizzle/                 # MySQL schema & migrations
├── emails/                  # React Email templates
├── lib/                     # Integrations: Supabase, Redis, Resend, PDF, caching, plugins
├── models/                   # Mongoose models
├── plugins/                  # Plugin implementations (analytics, external-job-board, smart-trigger)
├── providers/                  # React context providers
└── server/
    ├── actions/                # Server actions
    └── queries/                 # Drizzle & Mongo query layers
```

## Environment Variables

Do not commit secrets or real API keys. Copy `.env.example` to `.env` and fill
in real values. The full list with comments lives in `.env.example`; the
required groups are:

| Group | Variables |
| --- | --- |
| Domains | `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_LOCAL_DOMAIN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` |
| Auth (Clerk) | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET` |
| MySQL (Drizzle) | `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (app pool) + `DATABASE_URL` (drizzle-kit migrations) |
| MongoDB | `MONGODB_URI` |
| Redis / Queue | `REDIS_URL` |
| Storage (R2) | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` |
| Email (Resend) | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| Google Calendar | `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URL` |
| Triggers | `INTERNAL_TRIGGER_SECRET` (server-only — never `NEXT_PUBLIC_*`) |
| Plugin key encryption | `PLUGIN_ENCRYPTION_KEY` (server-only — see [Plugin API key encryption](#plugin-api-key-encryption)) |
| AI (optional) | `GOOGLE_GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` |
| Plugins (optional) | `CALENDLY_TOKEN`, `CHECKR_API_KEY`, `SLACK_WEBHOOK_URL`, `TWILIO_FROM` |

## Plugin API key encryption

Per-org plugin API keys (Resend, Google/Gemini, …) live in the `plugins` JSON
column of the `organization` table. They are **encrypted at rest** and **never
sent to the browser in full**:

- **At rest — AES-256-GCM.** Implemented in `src/lib/plugin-encryption.ts`
  (server-only; it imports `node:crypto`, so client code cannot import it).
  Ciphertext is prefixed `enc:v1:` (`enc:v1:<iv>.<ciphertext>.<tag>`,
  base64 segments, random 12-byte IV per value). The key comes from the
  server-only env var `PLUGIN_ENCRYPTION_KEY` — 32 bytes, base64 or hex;
  generate one with `openssl rand -base64 32`. Saving a **new** plugin API
  key fails loudly (the save errors, nothing is stored) when the key is
  missing or malformed — plaintext is never stored silently. The BullMQ
  worker needs the same value in its environment to decrypt keys at use time.
- **To the client — masked.** Server actions return `••••` + last 4
  characters only (`db_get_org_plugin_state_for_client`,
  `get_organization_plugins`). The settings UI shows the masked value while
  connected; a key the user types is sent once, for validation + save, and
  the client then adopts the masked settings the server returns. Masked
  values echoed back by the client (e.g. toggling a plugin active) are
  never re-saved as keys — the stored key is preserved server-side.
- **At use — decrypted server-side only.** The worker, the server-side
  plugin init, and server actions that send email read decrypted keys via
  `db_get_org_plugin_state` / `db_get_organization_plugins`. Client-side
  providers hold only masked values and cannot execute integrations.
- **Validation.** Connecting a provider verifies the key against the vendor
  first: Resend via `verifyResend`, Google/Gemini via `verifyGoogle`
  (`GET https://generativelanguage.googleapis.com/v1beta/models` — 200 means the
  key is valid). Unverified keys are never saved.

**Migration of pre-existing keys.** Keys stored before encryption existed
have no `enc:v1:` prefix. They keep working (read as legacy plaintext at
point of use) and are lazily re-encrypted the next time the org's plugin
settings are saved — any plugin save re-encrypts the whole `plugins` blob,
so one re-save migrates every key for that org.

**Key rotation.** There is no automatic rotation. To rotate:
1. With the **old** key still configured, decrypt every stored plugin key
   and re-encrypt it with the new key (a re-encryption pass over the
   `plugins` column).
2. Only then swap `PLUGIN_ENCRYPTION_KEY` to the new value (app + worker).

Rotating the env var first makes every stored key undecryptable: point-of-use
reads throw (integrations/email fail loudly rather than running with a
garbage key) and the settings UI shows a generic mask until each key is
re-entered.

## Organization deletion — full org data removal

When an organization is deleted in Clerk, the `organization.deleted` webhook
(verified via Svix) permanently removes all of that organization's data: in
MySQL, its score cards, interviews, applications, job–technology links,
automation rules, pipeline stages, attachments, job listings, candidates,
department links, memberships, and the organization row itself, deleted in
foreign-key-safe order inside a single transaction; in Mongo, its
smart-trigger tasks, candidate details, attachments, notes, threads,
communication logs, and email templates. Every delete is scoped to the
deleted org's Clerk id, so other organizations are never affected, and the
deletes are idempotent — if the webhook is retried after a partial failure,
already-removed rows simply count as zero. Shared global data is kept: the
`departments` and `technologies` lookup tables and `users_table` (users may
belong to other organizations). The webhook logs a per-table/per-collection
deletion summary, and the org's cached query tags are revalidated so no stale
data is served. Note: files in R2 (resumes/attachments) are not deleted by
the webhook — orphaned blobs remain until cleaned up separately.

<!--## Screenshots

Add screenshots or a short demo GIF here so visitors can understand the product before installing it.

```md

```

> **TODO:** Add real screenshots under `docs/images/`.-->

## Roadmap

- [x] Candidate search and filtering
- [x] Role-based access control (Clerk org roles: admin / recruiter / hiring manager / member)
- [x] Interview scheduling + Smart Interview Holds (tentative calendar holds, candidate confirm/decline)
- [x] Candidate notes and activity history (+ @mentions)
- [x] Reporting and hiring analytics
- [x] Automated email (Resend templates, communication log)
- [x] Docker Compose (app, worker, socket — see `docker-compose.yml`)
- [ ] E2E / integration tests for authorization (wrong org → 404/403)
- [ ] Demo seed script
- [ ] Deploy a public demo

## Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork this repository.
2. Create a feature branch:

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make and test your changes.
4. Commit your work:

   ```bash
   git commit -m "feat: describe your change"
   ```

5. Push the branch and open a pull request.

<!--## License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

> **TODO:** Add a `LICENSE` file, or change this section to match your chosen license.-->

## Author

Created by [Cliford Dareus](https://github.com/cliford-dareus).

If you found this project useful, consider starring the repository.
