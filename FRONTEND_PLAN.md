# HealthTrack Web — Frontend Architecture & Build Plan

A four-role Next.js client for the HealthTrack API. This document is the blueprint;
we build against it phase by phase (mirroring how DECISIONS.md/ROADMAP.md guided the
backend).

---

## 1. Roles & access model

The API defines four user types (`UserType`): **patient**, **caregiver**, **lab**,
**admin**. Each logs in through the same endpoint and receives a JWT; the frontend
reads `user_type` from `GET /auth/me` and routes the user into their role's area.

| Role | Primary job | Lands on |
|------|-------------|----------|
| patient | View own results, advisor guidance, trends; manage reminders, sharing, profile | `/app` (patient dashboard) |
| caregiver | View results patients have shared with them | `/care` (caregiver dashboard) |
| lab | Upload results, run extraction, draft summaries, view lab's results | `/lab` (lab console) |
| admin | Approve labs, verify caregivers, manage users, view analytics | `/admin` (admin console) |

**Role-based routing.** After login, redirect by `user_type`. Each role area is a
Next.js route group with a layout that guards access (a patient hitting `/admin` is
redirected to `/app`; an unauthenticated user to `/login`).

---

## 2. Per-role feature map (screens → endpoints)

### Patient  (`/app`)
- **Dashboard** — snapshot: latest results, active reminders, one trend spark → `GET /test-results?limit`, `GET /reminders`, `GET /test-results/trends`
- **Results list** — `GET /test-results` ✅ built
- **Result detail + advisor** — `GET /test-results/{id}`, `POST /advisor/results/{id}` ✅ built
- **Trends** — `GET /test-results/trends` ✅ built (zone-band chart)
- **Whole-picture advisor** — `GET /advisor/recommendations` (across all results)
- **Reminders** — list/create/complete/edit/delete + `.ics` → `GET/POST/PUT/DELETE /reminders`, `POST /reminders/{id}/complete`, `GET /reminders/{id}/calendar.ics`
- **Advisor-suggested reminders** — accept a suggested reminder → `POST /advisor/reminders/accept`
- **Sharing** — share a result with a caregiver, list/revoke → `POST /sharing`, `GET /sharing/my-shares`, `DELETE /sharing/{id}`
- **Profile** — view/edit (genotype, conditions) → `GET/PUT /profile/me`

### Caregiver  (`/care`)

Caregiver access is **strictly result-scoped and backend-enforced.** Caregivers
reach only the results a patient has explicitly shared — measurements and flags.
Trends (`RoleChecker([PATIENT])`) and advisor (`RoleChecker([PATIENT])`) are
patient-only at the API, so caregivers cannot access aggregate history or
profile-derived guidance. Sharing grants result-level visibility, not profile- or
history-level. (Captured as a design decision — D-44.)

- **Dashboard** — results shared with me → `GET /sharing/shared-with-me`
- **Shared results list** — `GET /sharing` (List[TestResultOut])
- **Result detail** — reuses the patient result-detail view, but **read-only:
  measurements + flags only, NO advisor, NO trends** (both are patient-only at the API)
- (Caregiver registration + admin license verification handled in auth/admin flows)

### Lab  (`/lab`)
- **Console/dashboard** — lab's uploaded results → `GET /test-results/lab/me/results`
- **Upload result** — structured analyte form (numeric/titer/qualitative) → `POST /test-results`
- **Draft summary** — generate a draft summary for a result (stateless) → `POST /test-results/draft-summary`
- **Extraction pipeline** — upload a lab PDF, run extraction, review candidate analytes, confirm/edit → `POST /test-results/{id}/extract`, `GET /test-results/{id}/extraction`, `POST /test-results/{id}/extraction/confirm`, `GET /test-results/{id}/file`
- **Add lab user** — `POST /auth/add-lab-user` (lab admin adds colleagues)

### Admin  (`/admin`)
- **Analytics dashboard** — system metrics → `GET /auth/admin/analytics`
- **Pending labs** — list + approve/reject → `GET /auth/admin/labs/pending`, `PUT /auth/admin/labs/{id}/status`
- **Caregiver verification** — verify licenses → `PUT /auth/admin/caregivers/{id}/verify-license`
- **User management** — inactive users, activate/deactivate → `GET /auth/admin/users/inactive`, `PUT /auth/admin/users/{id}/status`

### Shared (all roles)
- Login, logout, token refresh → `POST /auth/login`, `/logout`, `/refresh`, `GET /auth/me`
- Registration (patient, caregiver, lab) → `POST /auth/register/{patient|caregiver|lab}`
- Email verification, password reset → `POST /auth/verify-email/*`, `/password-reset/*`

---

## 3. Frontend architecture

### Routing (Next.js App Router, route groups)
```
app/
  (auth)/            # public: login, register, verify, reset
    login/
    register/
    verify-email/
    reset-password/
  (patient)/         # guard: user_type === patient
    app/             # dashboard
    results/         # list + [id] detail
    trends/
    reminders/
    sharing/
    profile/
  (caregiver)/       # guard: caregiver
    care/
  (lab)/             # guard: lab
    lab/             # console, upload, extraction
  (admin)/           # guard: admin
    admin/           # analytics, labs, users, caregivers
  layout.tsx         # root: AuthProvider + Toaster
```
Each group's `layout.tsx` runs the role guard (redirect if wrong role).

### Shared component library  (`components/`)
- `ui/` — shadcn primitives (button, input, card, label, sonner, + table, dialog, select, badge, tabs as needed)
- `StatusBadge`, `AnalyteTable`, `AdvisorCard`, `TrendChart`, `ResultCard` — domain components reused across roles (e.g. caregiver reuses ResultCard + AnalyteTable)
- `AppShell` / `NavBar` — role-aware navigation

### Data layer  (`lib/`)
- `api.ts` — typed client, extended with ALL endpoints grouped by domain (auth, results, advisor, trends, reminders, sharing, profile, lab, admin)
- `auth-context.tsx` — user + role, guards, redirect-by-role
- `types.ts` — shared response types

### State & fetching
- React state + effects for now (no heavy state lib). Consider a light fetch hook (`useApi`) for loading/error/empty consistency.
- Auth token in localStorage (current approach).

### Cross-cutting
- Loading / error / empty states standardized (a small set of shared components)
- Responsive down to mobile
- Tonal, clinical design system (current look), extended consistently

---

## 4. Phased build plan (~2–4 weeks)

**Phase 1 — Patient app complete + foundation  (largest, highest value)**
- Role-based routing + guards + auth-context redirect
- Nav/shell (role-aware)
- Finish patient: dashboard, whole-picture advisor, reminders (+.ics), sharing, profile
- Polish patient (loading/error/empty, responsive)
- (Advisor, trends, results, detail already done)
- **Milestone:** patient app fully usable, deployable

**Phase 2 — Caregiver  (small; heavy reuse of patient components)**
- Caregiver guard + `/care` dashboard (shared-with-me)
- Reuse ResultCard + result-detail (read-only, no advisor)
- Registration flow for caregiver
- **Milestone:** caregiver can log in and view shared results

**Phase 3 — Lab console  (most complex new flows)**
- Lab guard + `/lab` console (lab's results)
- Upload-result form (numeric/titer/qualitative analyte builder)
- Draft-summary
- Extraction pipeline UI (upload PDF → poll job → review candidate → confirm/edit)
- Add-lab-user
- **Milestone:** lab can upload + extract + confirm results

**Phase 4 — Admin console**
- Admin guard + `/admin`
- Analytics dashboard
- Pending-labs approve/reject
- Caregiver license verification
- User management (activate/deactivate)
- **Milestone:** admin can run the platform

**Phase 5 — Cross-role polish & deploy**
- Registration + email verification + password reset flows (shared)
- Consistent empty/error/loading, responsive pass, a11y
- Deploy to Vercel; wire CORS on the API (add Vercel origin); switch envs
- **Milestone:** full four-role app live

---

## 5. Key architectural decisions (to confirm as we go)
- **Route groups + per-group role guard** (vs. a single guarded layout with conditionals) — cleaner separation.
- **Reuse domain components across roles** (caregiver reuses patient's result views) — less duplication.
- **localStorage JWT** (current) — simple; revisit if we add refresh-on-expiry UX.
- **No heavy state library** — React state + a light fetch hook; add one only if needed.
- **Design system stays clinical/tonal**, extended with a few more shadcn components (table, dialog, select, tabs).