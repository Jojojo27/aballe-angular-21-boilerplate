# Angular 21 Auth Boilerplate — Joan Aballe

A complete Angular 21 authentication boilerplate with glassmorphism UI, email verification, JWT + refresh-token cookie auth, role-based access control (Admin / User), and a PHP + MySQL backend.

## Live Deployments

| Service | URL |
|---------|-----|
| **Frontend** (Angular SPA) | https://ipt-2026-frontend-aballe.onrender.com |
| **Backend** (PHP REST API) | https://ipt-2026-backend-aballe.onrender.com |
| **API Docs** (Swagger UI) | https://ipt-2026-backend-aballe.onrender.com/api-docs |

## Repositories

| Repo | URL |
|------|-----|
| **Frontend** (this repo) | https://github.com/Jojojo27/aballe-angular-21-boilerplate |
| **Backend** | https://github.com/Jojojo27/aballe-angular-21-boilerplate (inside `/backend` folder) |

## Features

- Email sign up + 6-digit email verification code
- Login + logout
- JWT (`jwtToken`) in memory / localStorage — confirmed via browser Application tab
- Refresh token (`refreshToken`) stored as **HttpOnly cookie** — confirmed via browser Application tab
- Auto token-refresh before JWT expiry
- Forgot password + reset password
- Role-based authorization (User & Admin)
- Admin panel for account management
- Profile area for updating your own account
- Built-in **fake backend** (Stage A demo — no API needed)
- Glassmorphism UI design with Poppins font

## Table of contents

- [Prerequisites](#prerequisites)
- [Stage A — Run with Fake Backend (no API)](#stage-a--run-with-fake-backend-no-api)
- [Stage B — Run with Real API](#stage-b--run-with-real-api)
- [Environment Variables (Backend)](#environment-variables-backend)
- [Authentication Flow](#authentication-flow)
- [RBAC — Roles](#rbac--roles)
- [Project Structure](#project-structure)

## Prerequisites

- Node.js 20+ (LTS)
- npm (comes with Node.js)
- Angular CLI (optional): `npm i -g @angular/cli`

---

## Stage A — Run with Fake Backend (no API)

Use the built-in fake backend to demo all Angular logic without any external service.

### 1. Enable the fake backend

Open `src/app/app.module.ts` and **uncomment** the `FakeBackendInterceptor` provider:

```ts
// STAGE A: Uncomment the line below
{ provide: HTTP_INTERCEPTORS, useClass: FakeBackendInterceptor, multi: true }
```

### 2. Install and run

```bash
npm install
npm start
```

The app opens at `http://localhost:4200`.

### 3. What the fake backend does

| Feature | Behavior |
|---------|----------|
| Accounts | Stored in browser `localStorage` |
| Verification code | Shown in the green alert after registration — enter it on the Verify Email page |
| First registered account | Gets `Admin` role automatically |
| All subsequent accounts | Get `User` role |
| Emails | Not sent — code is displayed in UI |

> **To reset:** open DevTools → Application → Local Storage → delete the `accounts` key.

---

## Stage B — Run with Real API

### 1. Comment out the fake backend

In `src/app/app.module.ts`, **comment out** the `FakeBackendInterceptor` line again.

### 2. Point to local backend (XAMPP)

`src/environments/environment.ts` already uses `/api` (proxied via `proxy.conf.json` to `http://localhost`).  
Start XAMPP, place the `/backend` folder at `C:/xampp/htdocs/api/`, and run:

```bash
npm start
```

### 3. Point to production backend (Render)

`src/environments/environment.prod.ts` is already set to:

```ts
apiUrl: 'https://ipt-2026-backend-aballe.onrender.com'
```

Build for production:

```bash
npm run build
```

---

## Environment Variables (Backend)

Set these in the Render dashboard for the backend service:

| Variable | Example |
|----------|---------|
| `DB_HOST` | `kodama.proxy.rlwy.net` |
| `DB_PORT` | `52187` |
| `DB_USER` | `root` |
| `DB_PASS` | `<railway password>` |
| `DB_NAME` | `railway` |
| `JWT_SECRET` | `<random secret>` |
| `SMTP_HOST` | `sandbox.smtp.mailtrap.io` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `<mailtrap username>` |
| `SMTP_PASS` | `<mailtrap password>` |

No secrets are hardcoded in source code — all sensitive values are read from environment variables at runtime.

---

## Authentication Flow

```
Register → 6-digit code emailed → Verify Email → Login
         ↓
    jwtToken (in memory/localStorage)   ← inspect in Application → Local Storage
    refreshToken (HttpOnly cookie)      ← inspect in Application → Cookies
         ↓
    Auto-refresh before JWT expiry
         ↓
    Logout → cookie cleared
```

**SPA Routing Fix:** `render.yaml` includes a rewrite rule `/* → /index.html` so deep links (e.g. `/account/verify-email`) work correctly.

---

## RBAC — Roles

| Role | Access |
|------|--------|
| **Admin** | Home, Profile, **Admin panel** (manage all accounts) |
| **User** | Home, Profile only — redirected away from Admin |

The first account registered is always `Admin`. All subsequent accounts are `User`.

---

## Project Structure

```
src/
├── app/
│   ├── _components/        # Shared UI components (Alert)
│   ├── _helpers/           # Guards, interceptors, fake-backend, validators
│   ├── _models/            # TypeScript models (Account, Role, Alert)
│   ├── _services/          # AccountService, AlertService
│   ├── account/            # Login, Register, Forgot/Reset Password, Verify Email
│   ├── admin/              # Admin layout + account management panel
│   ├── home/               # Home page (authenticated users)
│   ├── profile/            # Profile view and update
│   ├── app.module.ts       # Root module — enable/disable fake backend here
│   └── app-routing.module.ts
├── environments/
│   ├── environment.ts          # Local dev (proxy to XAMPP)
│   └── environment.prod.ts     # Production (Render backend URL)
└── styles.less                 # Global styles (glassmorphism, auth layout)

backend/
├── accounts/index.php      # All /accounts/* REST endpoints
├── api-docs/index.php      # Swagger UI documentation page
├── config.php              # DB connection, JWT helpers, SMTP sendEmail()
├── init.sql                # Database schema
├── .htaccess               # CORS headers + URL rewrite rules
└── Dockerfile              # PHP 8.2 Apache container for Render
```
