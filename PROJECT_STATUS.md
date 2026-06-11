# ExpenseTracker Project Analysis

## Overview

This repository is split into:

- `backend`: Express + TypeScript + MongoDB API
- `frontend`: React + TypeScript + Vite UI

The project is beyond the initial setup stage. The backend already contains real authentication, profile, food catalog, daily expense logging, and summary logic. The frontend is currently strongest in landing/auth flows, while the main expense-tracking dashboard is still at a placeholder/scaffold stage.

---

## Backend: What It Does

### Stack

- Express 5 with TypeScript
- MongoDB via Mongoose
- JWT access tokens
- Refresh tokens stored in MongoDB and sent via cookie
- Password reset flow with token email support
- Optional Google sign-in endpoint

Main API bootstrapping happens in `backend/src/index.ts`.

### Server behavior

The backend:

- loads environment variables
- connects to MongoDB
- enables JSON parsing and cookie parsing
- configures CORS for localhost, Netlify, Render, and env-provided origins
- mounts 4 route groups:
  - `/auth`
  - `/foods`
  - `/days`
  - `/summary`

Important source:

- `backend/src/index.ts:15-64` for CORS and route mounting
- `backend/src/index.ts:70-73` for DB connection and server startup

### Authentication and user management

The auth system is the most complete part of the backend.

Implemented features:

- `POST /auth/register`
  - creates local users with name, email, password
- `POST /auth/login`
  - validates credentials
  - returns a 15-minute JWT access token
  - creates a refresh token stored in MongoDB
  - sends refresh token in an HTTP-only cookie
- `POST /auth/refresh`
  - exchanges refresh cookie for a new access token
- `POST /auth/logout`
  - deletes the user’s refresh tokens
- `GET /auth/me`
  - returns profile data for authenticated user
- `PATCH /auth/me`
  - updates name, monthly budget, age, and phone
- `POST /auth/forgot-password`
  - generates a reset token
  - stores only the hashed token
  - triggers reset email sending
- `POST /auth/validate-reset-token`
  - checks whether a reset token is still valid
- `POST /auth/reset-password`
  - updates password if token is valid
- `POST /auth/google`
  - verifies Google ID token and logs in or creates Google-based users

Important source:

- `backend/src/routes/auth-routes.ts:16-45` register
- `backend/src/routes/auth-routes.ts:48-99` profile read/update
- `backend/src/routes/auth-routes.ts:105-171` login and refresh
- `backend/src/routes/auth-routes.ts:177-183` logout
- `backend/src/routes/auth-routes.ts:185-285` forgot/reset password flow
- `backend/src/routes/auth-routes.ts:287-365` Google auth

### Access control

Protected routes require a bearer token in the `Authorization` header. The middleware:

- verifies JWT
- loads the user from MongoDB
- injects `req.user` with user id, email, and monthly budget

Important source:

- `backend/src/middleware/auth.ts`

### Data model

#### User

The user model supports:

- local auth users
- Google auth users
- optional profile fields:
  - `monthlyBudget`
  - `age`
  - `phone`

Passwords are hashed before save.

Important source:

- `backend/src/models/user.model.ts:16-29` fields
- `backend/src/models/user.model.ts:101-120` local vs Google auth model
- `backend/src/models/user.model.ts:143-159` password hashing and comparison

#### Food

Food entries are reusable items used to calculate expense cost per unit.

Stored fields include:

- numeric `id`
- `name`
- `packageCost`
- `packageQuantity`
- `unit` (`g`, `ml`, `pcs`)
- `costPerUnit`
- `isActive`
- `userId`

The numeric `id` is auto-generated through a counter.

Important source:

- `backend/src/models/food.model.ts:4-27`
- `backend/src/models/food.model.ts:31-35`

#### Day log

A day log represents expense activity for a date.

Stored fields include:

- `date` in `ddmmyyyy`
- `dateISO` for range queries
- `items[]` containing `foodId`, `quantity`, `cost`
- `extraCost`
- `totalCost`
- `userId`

Important source:

- `backend/src/models/day.model.ts:4-39`
- `backend/src/models/day.model.ts:42-47`

### Food management

The backend allows authenticated users to manage their own food catalog:

- `POST /foods`
  - create food item
  - automatically computes `costPerUnit`
- `GET /foods`
  - fetch only active foods for current user
- `PUT /foods/:id`
  - update owned food item
  - recomputes `costPerUnit` if package values change
- `DELETE /foods/:id`
  - soft deletes food by setting `isActive = false`

Important source:

- `backend/src/routes/food-routes.ts:9-43`
- `backend/src/routes/food-routes.ts:48-69`
- `backend/src/routes/food-routes.ts:74-118`
- `backend/src/routes/food-routes.ts:123-159`

### Daily expense logging

The backend supports daily expense storage:

- `POST /days`
  - creates or overwrites a day log
  - validates date format
  - validates referenced food IDs belong to the same user
  - computes line-item cost from `food.costPerUnit * quantity`
  - computes `totalCost` from food costs + `extraCost`
- `GET /days`
  - returns all day logs for current user
- `GET /days/:date`
  - returns a single day log by date
- `DELETE /days/:date`
  - deletes a day log

Important source:

- `backend/src/routes/day-routes.ts:18-97`
- `backend/src/routes/day-routes.ts:102-119`
- `backend/src/routes/day-routes.ts:124-158`
- `backend/src/routes/day-routes.ts:163-189`

### Summary and reporting

The backend can generate aggregate summaries from day logs:

- `GET /summary`
  - supports preset ranges:
    - `weekly`
    - `monthly`
    - `quarterly`
    - `halfyear`
    - `yearly`
  - also supports custom `from` + `to` date range
  - calculates:
    - total cost
    - day count
    - average cost per day
    - date-wise breakdown
  - optionally calculates budget status if `dailyBudget` is provided

Important source:

- `backend/src/routes/summary-routes.ts:7-144`

### Backend maturity summary

Backend status is best described as:

- authentication: implemented
- user profile: implemented
- reusable food catalog: implemented
- daily expense logging: implemented
- summary analytics: implemented
- email reset workflow: implemented
- Google auth endpoint: implemented at API level

This means the backend already contains the core domain logic for an expense tracker.

---

## Frontend: How Far It Has Reached

### Routing that exists today

The frontend currently exposes these routes:

- `/` landing page
- `/login`
- `/forgot-password`
- `/reset-password`
- `/dashboard`

Important source:

- `frontend/src/App.tsx:12-24`

### What is already built in the UI

#### 1. Landing page

The landing page is visually built and includes:

- hero section
- feature cards
- call-to-action buttons
- header and footer

Important source:

- `frontend/src/components/HomePage.tsx:19-79`

#### 2. Login flow

The login UI is implemented and connected to the backend:

- form fields and validation
- remember-me support
- calls `POST /auth/login`
- stores returned access token in `localStorage`
- redirects to `/dashboard`

Important source:

- `frontend/src/components/LoginCard.tsx:30-44`
- `frontend/src/services/authService.ts:9-12`

#### 3. Sign-up flow

The sign-up UI is implemented and connected to the backend:

- name/email/password/confirm-password inputs
- client-side validation
- calls `POST /auth/register`
- shows success/error state

Important source:

- `frontend/src/components/SignUpCard.tsx:36-60`
- `frontend/src/services/authService.ts:4-7`

#### 4. Forgot password flow

The forgot-password page is implemented and connected:

- accepts email
- calls backend forgot-password endpoint
- shows submitted state

Important source:

- `frontend/src/components/ForgotPassword.tsx:13-31`
- `frontend/src/services/authService.ts:14-17`

#### 5. Reset password flow

The reset-password page is implemented and connected:

- reads reset token from query string
- validates token with backend
- submits new password to backend
- handles invalid/expired token state

Important source:

- `frontend/src/components/ResetPassword.tsx:37-43`
- `frontend/src/components/ResetPassword.tsx:45-62`
- `frontend/src/services/authService.ts:19-29`

#### 6. Basic route protection

`/dashboard` is protected in the frontend by checking whether an access token exists in `localStorage`.

Important source:

- `frontend/src/components/ProtectedRoute.tsx:4-11`

#### 7. Axios API setup

The frontend has a shared API client that:

- uses `VITE_API_BASE_URL`
- sends cookies
- automatically attaches access token from `localStorage`

Important source:

- `frontend/src/services/api.ts:4-19`

### What the frontend has NOT reached yet

This is the main gap in the project today.

The frontend does **not** currently use the expense-tracking backend features for:

- food creation/edit/delete
- day log creation/read/delete
- summary/analytics fetching
- profile read/update
- token refresh flow
- Google login

Evidence:

- frontend service layer only contains auth methods in `frontend/src/services/authService.ts`
- route search shows no active usage of `foods`, `days`, `summary`, `/auth/me`, or profile update APIs
- the only Google auth reference in frontend is commented out code in `frontend/src/components/SignUpCard.tsx:74-96`

### Dashboard status

The dashboard route exists, but it is still only a UI skeleton.

Current dashboard behavior:

- renders header and footer
- shows static cards like:
  - `Track your Expenses`
  - `Track your Inflow`
  - `Track your Outflow`
  - `Add your expense details`
  - `AI Insights`
- does not fetch backend data
- does not render charts
- does not submit expense records

Important source:

- `frontend/src/components/Dashboard.tsx:11-30`
- `frontend/src/components/DashboardCards.tsx:1-17`

### Frontend maturity summary

Frontend status is best described as:

- marketing pages: mostly built
- auth UI: built and integrated
- password reset UI: built and integrated
- protected routing: basic implementation present
- core expense tracker product UI: not implemented yet
- analytics UI: not implemented yet
- CRUD screens for actual finance data: not implemented yet

So the frontend has reached the **authentication stage**, but not yet the **core expense-tracking product stage**.

---

## Backend vs Frontend Alignment

### Backend already supports

- account creation and login
- profile storage
- food master catalog
- daily cost calculation
- summary analytics
- budget-related calculations

### Frontend currently exposes

- landing/marketing experience
- login/signup
- forgot/reset password
- placeholder dashboard shell

### Biggest current mismatch

The backend already contains the main business logic of the expense tracker, but the frontend is still not consuming most of it.

In practical terms:

- API capability is ahead
- UI product capability is behind

---

## Observations and Gaps

### 1. Dashboard is not connected yet

There is no frontend service/module yet for:

- `/foods`
- `/days`
- `/summary`
- `/auth/me`

This is the clearest next implementation area.

### 2. Token refresh exists in backend but is not wired in frontend

The backend exposes `POST /auth/refresh`, but the frontend API client does not automatically refresh expired access tokens.

This means a user may appear logged in locally while API requests fail after token expiry.

### 3. Google auth is backend-ready but frontend-disabled

Google auth endpoint exists in backend, but the frontend implementation is commented out.

### 4. Dashboard cards are placeholders

`DashboardCards` currently renders only title, empty chart container, and placeholder text.

### 5. Multi-user day log uniqueness may need review

The `Day` model sets `date` as globally unique in `backend/src/models/day.model.ts:6-11`, while route logic treats day logs as user-scoped using `date + userId`.

That likely means two different users cannot save logs for the same date, which is probably unintended.

---

## Overall Project Status

### Backend completion level

The backend is already at a functional MVP level for:

- auth
- data persistence
- expense calculation
- summary generation

### Frontend completion level

The frontend is currently at:

- polished landing page stage
- working auth flow stage
- early dashboard scaffold stage

### Short final assessment

If described simply:

- backend: core expense tracker logic is already built
- frontend: auth is built, but expense tracking screens and analytics are still mostly pending

The next major milestone should be connecting the dashboard to:

1. user profile (`/auth/me`)
2. food CRUD (`/foods`)
3. day entry flows (`/days`)
4. summary widgets/charts (`/summary`)
