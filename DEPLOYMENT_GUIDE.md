# BioShield — Complete Setup & Deployment Guide

**Project:** SIH260487 — Digital Farm Management Portal (BioShield)  
**Repo:** https://github.com/ullassallu28-eng/BACKEND-FARM-  
**Stack:** React (Vite) frontend · FastAPI backend · PostgreSQL

This file is the **single checklist** for running locally and deploying to production (Render + Vercel).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Run Locally (Development)](#3-run-locally-development)
4. [Deploy Database on Render](#4-deploy-database-on-render)
5. [Deploy Backend on Render](#5-deploy-backend-on-render)
6. [Seed Production Database](#6-seed-production-database)
7. [Connect Vercel Frontend](#7-connect-vercel-frontend)
8. [Environment Variables Reference](#8-environment-variables-reference)
9. [Verification Checklist](#9-verification-checklist)
10. [Demo Credentials](#10-demo-credentials)
11. [API Endpoints Summary](#11-api-endpoints-summary)
12. [Troubleshooting](#12-troubleshooting)
13. [Team Responsibilities](#13-team-responsibilities)

---

## 1. Architecture Overview

```
┌─────────────────────┐       HTTPS        ┌──────────────────────┐       SQL        ┌─────────────────┐
│  Vercel             │  ───────────────►  │  Render Web Service  │  ───────────►  │  Render         │
│  (React Frontend)   │  /api/v1/*         │  (FastAPI Backend)   │                │  PostgreSQL     │
└─────────────────────┘                    └──────────────────────┘                └─────────────────┘
```

| Component | Technology | Where it runs |
|-----------|------------|---------------|
| Frontend | React 19 + TypeScript + Vite | **Vercel** (already deployed) |
| Backend API | Python FastAPI | **Render Web Service** |
| Database | PostgreSQL 16 | **Render PostgreSQL** |
| Auth | JWT tokens | Backend |

**Connection rule:** Frontend reads `VITE_API_BASE_URL` → calls `{URL}/api/v1/*` → backend reads `DATABASE_URL` → PostgreSQL.

---

## 2. Prerequisites

### On your PC (local development)

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ (you have v22) | Frontend |
| Python | 3.11+ | Backend |
| Docker Desktop | Latest | Local PostgreSQL |
| Git | Any | Clone/push repo |

### Accounts (production)

| Service | Purpose | URL |
|---------|---------|-----|
| GitHub | Source code | https://github.com/ullassallu28-eng/BACKEND-FARM- |
| Render | Backend + Database | https://render.com |
| Vercel | Frontend | https://vercel.com |

---

## 3. Run Locally (Development)

Use this when testing on your laptop before or after deploy.

### Terminal 1 — Database (Docker)

```powershell
cd backend
docker compose up -d
```

### Terminal 2 — Backend (one-time setup + run)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m scripts.seed
uvicorn app.main:app --reload --port 8000
```

**Verify backend:**
- http://localhost:8000/health
- http://localhost:8000/docs
- http://localhost:8000/api/v1/farms

### Terminal 3 — Frontend

```powershell
cd ..   # project root (where package.json is)
npm install
copy .env.example .env
npm run dev
```

**Verify frontend:**
- http://localhost:5173
- Open DevTools → Network → requests go to `http://localhost:8000/api/v1/*`

### Local `.env` files

**Frontend** (project root `.env`):
```env
VITE_API_BASE_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://bioshield:bioshield@localhost:5432/bioshield
JWT_SECRET=change-me-to-a-long-random-secret-in-production
DEBUG=true
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
STORAGE_BASE_URL=http://localhost:8000/uploads
```

> **Never commit `.env` files.** Only `.env.example` is in Git.

---

## 4. Deploy Database on Render

> **You must create this first.** Without PostgreSQL, the backend cannot store or return real data.

### Steps

1. Log in to https://dashboard.render.com
2. Click **New +** → **PostgreSQL**
3. Configure:

| Field | Value |
|-------|--------|
| Name | `bioshield-db` |
| Region | **Oregon (US West)** — use same region for backend |
| PostgreSQL Version | 16 |
| Plan | **Free** (demo) or Starter (production) |

4. Click **Create Database**
5. Wait until status = **Available**

### Save these URLs (Connections tab)

| URL | Used by |
|-----|---------|
| **Internal Database URL** | Render backend (`DATABASE_URL` env var) |
| **External Database URL** | Your PC when running seed script |

Example format:
```
postgresql://bioshield_user:PASSWORD@dpg-xxxxx-a/bioshield_abc1
```

---

## 5. Deploy Backend on Render

### Steps

1. **New +** → **Web Service**
2. Connect repo: `ullassallu28-eng/BACKEND-FARM-`
3. Configure **exactly** as below (Render may auto-detect Node — **change to Python**):

| Field | Value |
|-------|--------|
| Name | `bioshield-api` |
| Language | **Python 3** |
| Branch | `main` |
| Region | Oregon (US West) |
| Root Directory | `backend` |
| Build Command | `pip install -r requirements.txt && alembic upgrade head` |
| Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Instance Type | Free (demo) or Starter (always-on) |

> **Root Directory = `backend`** is required because the repo contains both frontend (Node) and backend (Python).

### Environment Variables (Render → backend service → Environment)

Replace placeholders with your real values:

```env
DATABASE_URL=<Internal Database URL from Step 4>
JWT_SECRET=<long-random-secret-min-32-chars>
JWT_ALGORITHM=HS256
JWT_ACCESS_EXPIRE_MINUTES=60
JWT_REFRESH_EXPIRE_DAYS=7
APP_NAME=BioShield API
APP_ENV=production
DEBUG=false
CORS_ORIGINS=https://YOUR-VERCEL-APP.vercel.app,http://localhost:5173
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=10
STORAGE_BASE_URL=https://bioshield-api.onrender.com/uploads
DEFAULT_DISTRICT_ID=district-ranchi
```

| Variable | Important notes |
|----------|-----------------|
| `DEBUG` | **Must be `false` in production** — `true` bypasses authentication |
| `CORS_ORIGINS` | Must include your **exact** Vercel URL (no trailing slash) |
| `STORAGE_BASE_URL` | Use your actual Render service URL |
| `DATABASE_URL` | Use **Internal** URL (not External) |

4. Click **Deploy Web Service**
5. Wait for green **Live** status

### Verify backend deploy

Open in browser:

| URL | Expected result |
|-----|-----------------|
| `https://bioshield-api.onrender.com/health` | `{"status":"ok","service":"BioShield API"}` |
| `https://bioshield-api.onrender.com/docs` | Swagger API documentation |
| `https://bioshield-api.onrender.com/api/v1/farms` | `[]` until seeded (Step 6) |

> **Free tier note:** First request after idle period may take 30–60 seconds (cold start).

---

## 6. Seed Production Database

Migrations create **empty tables**. Seed fills demo farms, users, incidents, checklist items.

Render **Free** plan has no Shell — run seed **once from your PC** using the **External Database URL**.

```powershell
cd backend
.venv\Scripts\activate
pip install -r requirements.txt

# Paste External Database URL from Render Postgres dashboard
$env:DATABASE_URL="postgresql://user:password@host/dbname"

python -m scripts.seed
```

Expected output:
```
Seed completed successfully.
Demo credentials:
  farmer@bioshield.local / farmer123
  vet@bioshield.local / vet123
  officer@bioshield.local / officer123
```

**Verify:** Open `https://bioshield-api.onrender.com/api/v1/farms` — should show JSON with 4 farms.

> Run seed only **once**. Running again is skipped automatically if data exists.

---

## 7. Connect Vercel Frontend

Frontend is already on Vercel. You only need to point it at the Render backend.

### Steps

1. Open https://vercel.com → your BioShield project
2. **Settings** → **Environment Variables**
3. Add (or update):

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_API_BASE_URL` | `https://bioshield-api.onrender.com` | Production, Preview, Development |

> Do **not** add `/api/v1` — the frontend code appends that automatically.

4. **Deployments** → latest → **⋯** → **Redeploy**

Vite bakes env vars at **build time** — redeploy is mandatory after changing them.

### Update Render CORS (if not done yet)

On Render backend → Environment → update:

```env
CORS_ORIGINS=https://your-actual-vercel-url.vercel.app,http://localhost:5173
```

Save → backend redeploys automatically.

### Verify full connection

1. Open your Vercel site
2. Press **F12** → **Network** tab → refresh
3. Confirm requests to `https://bioshield-api.onrender.com/api/v1/farms`
4. Farm dropdown shows: GreenValley Bio-Farm, SunRise Poultry Haven, etc.
5. Test: Report Incident → switch to Vet role → see incident in queue

---

## 8. Environment Variables Reference

### Frontend (Vercel / local `.env`)

| Variable | Local | Production |
|----------|-------|------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | `https://bioshield-api.onrender.com` |

### Backend (Render / local `backend/.env`)

| Variable | Local | Production |
|----------|-------|------------|
| `DATABASE_URL` | Docker postgres URL | Render Internal Postgres URL |
| `JWT_SECRET` | any dev string | strong random secret (32+ chars) |
| `DEBUG` | `true` | **`false`** |
| `APP_ENV` | `development` | `production` |
| `CORS_ORIGINS` | `http://localhost:5173` | Vercel URL + localhost |
| `STORAGE_BASE_URL` | `http://localhost:8000/uploads` | `https://YOUR-API.onrender.com/uploads` |

---

## 9. Verification Checklist

Copy this checklist and tick each item:

### Local
- [ ] Docker Desktop running
- [ ] `docker compose up -d` in `backend/`
- [ ] Backend `/health` returns OK
- [ ] Frontend loads at localhost:5173
- [ ] Network tab shows API calls to localhost:8000

### Production
- [ ] Render PostgreSQL created and Available
- [ ] Render Web Service deployed (Python 3, root `backend/`)
- [ ] `DEBUG=false` on Render
- [ ] `CORS_ORIGINS` includes Vercel URL
- [ ] Database seeded from PC
- [ ] `https://YOUR-API.onrender.com/health` returns OK
- [ ] `https://YOUR-API.onrender.com/api/v1/farms` returns farm JSON
- [ ] Vercel has `VITE_API_BASE_URL` set
- [ ] Vercel redeployed after env change
- [ ] Live site farm dropdown shows real farms
- [ ] Incident report → vet verify flow works on live site

---

## 10. Demo Credentials

After seeding (local or production):

| Role | Email | Password |
|------|-------|----------|
| Farmer | `farmer@bioshield.local` | `farmer123` |
| Veterinarian | `vet@bioshield.local` | `vet123` |
| Officer | `officer@bioshield.local` | `officer123` |

> UI currently uses the **role switcher** in the navbar. JWT login is available at `POST /api/v1/auth/login` and via Swagger `/docs`.

---

## 11. API Endpoints Summary

Base URL: `https://YOUR-API.onrender.com/api/v1`

| Module | Key endpoints | Used by frontend |
|--------|---------------|------------------|
| Health | `GET /health` (no prefix) | Render monitoring |
| Auth | `POST /auth/login`, `/auth/register` | Available, UI uses role switcher |
| Farms | `GET /farms`, `GET /farms/{id}` | Navbar farm list, dashboards |
| Passport | `GET /farms/{id}/passport` | Biosecurity passport modal |
| Checklist | `GET/PATCH /farms/{id}/checklist` | Farmer dashboard |
| Incidents | `GET/POST /incidents`, `POST /incidents/{id}/verify` | Report + vet workflow |
| Corrective Actions | `GET /corrective-actions`, evidence, verify | Actions tab |
| Risk | `GET /risk/factors`, `/risk/farms/{id}/history` | Risk dashboard, Aarohi tips |
| GIS | `GET /gis/nodes`, `/gis/spatial-risk` | Farm map |
| Officer | `GET /officer/stats`, `POST /officer/inspections` | Officer dashboard |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read` | Bell icon |
| Health Records | `GET/POST /health-records/farms/{id}` | Available via API |

Full interactive docs: `https://YOUR-API.onrender.com/docs`

---

## 12. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Render shows Node, build fails | Wrong language detected | Set Language = **Python 3**, Root Directory = `backend` |
| `yarn start` / npm build error | Node defaults | Use uvicorn start command (see Step 5) |
| Backend crashes on start | No `DATABASE_URL` | Create Render Postgres, set Internal URL |
| `/farms` returns `[]` | DB not seeded | Run seed from PC with External URL |
| CORS error in browser | Frontend URL not allowed | Add exact Vercel URL to `CORS_ORIGINS`, redeploy backend |
| Frontend still calls localhost | Env not applied | Set `VITE_API_BASE_URL` on Vercel, **redeploy** |
| First request very slow | Render free cold start | Wait 30–60 sec or upgrade to Starter |
| `docker` not recognized | Docker Desktop not running | Open Docker Desktop, restart terminal |
| Seed enum error | Old bcrypt issue | `pip install bcrypt==4.0.1` then retry |
| Uploaded files disappear | Render free has no persistent disk | OK for demo; use S3 for production |
| Auth returns 401 in production | `DEBUG=false` requires JWT | Use Swagger login or implement login UI |

---

## 13. Team Responsibilities

| Area | Owner | Status in this repo |
|------|-------|---------------------|
| Frontend UI | Frontend teammate | Deployed on Vercel |
| Backend API | You | FastAPI in `backend/` — deploy on Render |
| Database schema | DB teammate | Alembic migrations in `backend/alembic/` |
| AI / Risk ML engine | AI teammate | Rule-based engine in `backend/app/services/risk_service.py` for now |
| IoT / live telemetry | Hardware teammate | Not in scope — incidents/checklist use real API |
| Simulation button | Removed | Farmer dashboard uses real backend data |

---

## Quick Command Reference

```powershell
# Local — start database
cd backend && docker compose up -d

# Local — start backend
cd backend && .venv\Scripts\activate && uvicorn app.main:app --reload --port 8000

# Local — start frontend
npm run dev

# Production — seed cloud database (run once)
cd backend && .venv\Scripts\activate
$env:DATABASE_URL="<Render External Database URL>"
python -m scripts.seed

# Test production API
curl.exe https://bioshield-api.onrender.com/health
curl.exe https://bioshield-api.onrender.com/api/v1/farms
```

---

## Replace These Placeholders

When following this guide, replace:

| Placeholder | Your value |
|-------------|------------|
| `bioshield-api.onrender.com` | Your Render backend URL |
| `YOUR-VERCEL-APP.vercel.app` | Your Vercel deployment URL |
| `DATABASE_URL` | From Render PostgreSQL dashboard |

---

*Last updated: August 2026 — BioShield SIH260487*
