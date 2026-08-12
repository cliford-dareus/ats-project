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
| File storage | Supabase Storage |
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
- Accounts/API keys for: Clerk, Supabase, Resend, Google Cloud (Generative AI + Calendar API)
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

5. Add the required values to `.env`.

   ```env
   # TODO: Replace with the environment variables your project uses
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open the local URL shown in your terminal.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts the development server |
| `npm run build` | Creates a production build |
| `npm run preview` | Runs the production build locally |
| `npm run lint` | Checks code quality and style |
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

Do not commit secrets or real API keys. Create a `.env.example` file containing variable names only:

```env
# Database
DATABASE_URL=
MONGODB_URI=

# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Redis / Queue
REDIS_URL=

# Email (Resend)
RESEND_API_KEY=

# AI (Google Generative AI)
GOOGLE_GENERATIVE_AI_API_KEY=

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

<!--If you use Supabase, ensure your Row Level Security policies are configured before deploying.-->

<!--## Screenshots

Add screenshots or a short demo GIF here so visitors can understand the product before installing it.

```md

```

> **TODO:** Add real screenshots under `docs/images/`.-->

## Roadmap

- [X] Improve candidate search and filtering
- [ ] Add role-based access control
- [ ] Add interview scheduling
- [ ] Add candidate notes and activity history
- [ ] Add reporting and hiring analytics
- [ ] Add automated email 
- [ ] Dockerize the application
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
