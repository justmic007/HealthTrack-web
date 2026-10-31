# HealthTrack Web

Frontend for **HealthTrack**, a multi-role health-records platform with AI-assisted, non-diagnostic guidance on lab results.

**Live demo:** https://healthtrack-app.vercel.app

> Portfolio build on **synthetic data only**. HealthTrack is not a medical device and does not give medical advice.

## Try it

Open the live demo and click a role on the landing page. No sign-up or credentials are needed.

| Role | What you can explore |
|---|---|
| Patient | Results, trends, AI guidance, reminders, sharing with a caregiver |
| Caregiver | Results that patients have shared with you |
| Lab | Result uploads and PDF extraction |
| Admin | Lab and document review, user management, platform analytics |

Demo sessions are issued by the API, so the browser never holds a demo email or password. The demo admin is read-only and sees demo data only. The first sign-in can take up to a minute while the free-tier API wakes up.

## Features

- Role-based areas for patients, caregivers, labs and admins
- Email verification before sign-in, with resend and password reset flows
- Lab self-registration with a document-onboarding step: labs upload verification documents, and admins approve or reject each one before the lab goes live
- Caregiver license approval by admins
- Lab results with flags, trends over time and shareable access for caregivers
- AI-assisted guidance grounded in sourced references (MedlinePlus, WHO, CDC and others), kept separate from the deterministic trend analysis
- Mobile-friendly navigation across all four role layouts

## Stack

Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui, Yarn. Deployed on Vercel.

The API is a separate FastAPI service (private repository), deployed on Render with Postgres on Neon and object storage on Cloudflare R2.

## Project structure

```
app/
  (patient)/      patient area: home, results, trends, advisor, reminders, sharing, profile
  (caregiver)/    caregiver area: results shared with you
  (lab)/          lab area: results, upload, onboarding gate
  (admin)/        admin area: overview, labs, users
  login/ register/ forgot-password/ reset-password/ verify-email/   public auth pages
  page.tsx        landing page with one-click demo access
components/
  DemoAccess.tsx      one-click demo sign-in (sends only a role to the API)
  LabOnboarding.tsx   document upload and review status for unapproved labs
  RequireRole.tsx     role guard for protected routes
  ui/                 shadcn/ui primitives
lib/
  api.ts              typed API client and auth calls
  auth-context.tsx    session state and role-based routing
  demo-accounts.ts    demo role labels (no credentials)
```

Each role has its own route group and layout with its own navigation.

## Routes

| Area | Routes |
|---|---|
| Public | `/`, `/login`, `/register`, `/register/lab`, `/forgot-password`, `/reset-password`, `/verify-email` |
| Patient | `/app`, `/results`, `/results/[id]`, `/trends`, `/advisor`, `/reminders`, `/sharing`, `/profile` |
| Caregiver | `/care`, `/care/results/[id]` |
| Lab | `/lab`, `/lab/upload`, `/lab/results/[id]` |
| Admin | `/admin`, `/admin/labs`, `/admin/users` |

## Auth and role gating

- **Session tokens.** `lib/api.ts` stores the access token and the refresh token in `localStorage` and attaches the access token to API calls. Demo access uses the same token flow through the API's demo endpoint.
- **Refresh.** On a 401 the client exchanges the refresh token for a new pair. Refresh tokens are single-use (rotated), so one shared in-flight request is reused across concurrent 401s instead of firing two refreshes at once.
- **Current user and routing.** `lib/auth-context.tsx` loads the current user from `/auth/me` on startup, clears the session if that fails, and maps each role to its home route (`patient` to `/app`, `caregiver` to `/care`, `lab` to `/lab`, `admin` to `/admin`).
- **Route guards.** `RequireRole` wraps all four role layouts (patient, caregiver, lab and admin) and sends a signed-in user with the wrong role to their own home.
- **Sign-in gates.** The API enforces them, and the UI branches on the error codes: `email_not_verified` offers a resend, and `account_pending_approval` explains that an admin must approve the account.
- **Lab onboarding.** Labs can sign in before approval. Until an admin approves the lab, the lab area shows the onboarding view instead of the dashboard.
- **Demo mode.** The demo admin gets `demo_read_only` on any write, which the UI shows as a read-only notice.

## Environment variables

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the HealthTrack API |

Variables prefixed `NEXT_PUBLIC_` are bundled into the browser build, so they must never hold secrets. Copy `.env.example` to `.env.local` to set it.

## Scripts

| Command | What it does |
|---|---|
| `yarn dev` | Development server (webpack) on http://localhost:3000 |
| `yarn build` | Production build |
| `yarn start` | Serve the production build |
| `yarn lint` | ESLint |

## Run locally

Requires Node 24 (`nvm use 24`) and Yarn.

```bash
yarn install
cp .env.example .env.local
yarn dev
```

To use the demo buttons against a local API, run the API with `DEMO_LOGIN_ENABLED=true` and seed the demo accounts with `python seed_data.py demo`.

## Deployment

Pushes to `main` deploy to Vercel automatically. Set `NEXT_PUBLIC_API_BASE_URL` in the Vercel project to the hosted API.

## Design decisions

- **No credentials in the frontend.** The repository is public, so demo access is a role request to the API, which only issues sessions for dedicated demo accounts.
- **Token storage trade-off.** Tokens are kept in `localStorage` for simplicity. That exposes them to any script injected into the page, so a production system would prefer httpOnly cookies with short-lived access tokens. This build limits the risk by running on synthetic data, and refresh tokens rotate on every use.
- **Server-side gates, client-side messaging.** Access rules live in the API. The UI only explains them and routes accordingly.
- **Deterministic trends, separate AI guidance.** Trend analysis is computed without a language model, and the AI-assisted explanation is kept separate and clearly labelled non-diagnostic.

## Safety note

All data in this project is synthetic. The guidance shown is informational and non-diagnostic, and it is not a substitute for a clinician.
