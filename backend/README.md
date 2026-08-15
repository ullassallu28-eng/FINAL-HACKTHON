# AgriSentinel Backend API

FastAPI + PostgreSQL backend for the AgriSentinel SIH260487 frontend.

## Stack

- Python 3.11+
- FastAPI
- SQLAlchemy 2
- Pydantic v2
- PostgreSQL
- Alembic migrations
- JWT authentication

## Quick Start

### 1. Start PostgreSQL

```bash
cd backend
docker compose up -d
```

### 2. Configure environment

```bash
cp .env.example .env
```

### 3. Install dependencies

```bash
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
```

### 4. Run migrations

```bash
alembic upgrade head
```

### 5. Seed demo data (optional, dev only)

```bash
python -m scripts.seed
```

### 6. Start API server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Frontend Integration

Set in frontend `.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

The frontend `src/services/api.ts` consumes `/api/v1/*` endpoints.

## Demo Credentials (after seed)

| Role | Email | Password |
|------|-------|----------|
| Farmer | farmer@bioshield.local | farmer123 |
| Veterinarian | vet@bioshield.local | vet123 |
| Officer | officer@bioshield.local | officer123 |

## API Modules

| Module | Prefix |
|--------|--------|
| Authentication | `/api/v1/auth` |
| Users | `/api/v1/users` |
| Farms & Passport | `/api/v1/farms` |
| Incidents | `/api/v1/incidents` |
| Corrective Actions | `/api/v1/corrective-actions` |
| Risk Analytics | `/api/v1/risk` |
| GIS | `/api/v1/gis` |
| Officer Dashboard | `/api/v1/officer` |
| Notifications | `/api/v1/notifications` |
| Health Records | `/api/v1/health-records` |

## Project Structure

```
backend/
  app/
    main.py
    core/          # config, security, dependencies
    database/      # SQLAlchemy session
    models/        # ORM entities
    schemas/       # Pydantic request/response models
    routers/       # FastAPI route handlers
    services/      # Business logic
    middleware/    # Error handling
    utils/         # Helpers & serializers
  alembic/         # Database migrations
  scripts/seed.py  # Demo data seeder (separate from production)
```

## Production Notes

- Change `JWT_SECRET` in `.env`
- Set `DEBUG=false`
- Use real object storage for uploads (S3/Azure) instead of local `uploads/`
- Require JWT on all mutation endpoints
