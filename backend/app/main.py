from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.exceptions import AppError
from app.middleware.error_handler import app_error_handler
from app.routers import (
    auth,
    corrective_actions,
    farms,
    gis,
    health_records,
    incidents,
    media,
    notifications,
    officer,
    risk,
    users,
)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        description="AgriSentinel — Digital Farm Biosecurity Platform API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_exception_handler(AppError, app_error_handler)

    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")

    prefix = settings.API_V1_PREFIX
    app.include_router(auth.router, prefix=prefix)
    app.include_router(users.router, prefix=prefix)
    app.include_router(farms.router, prefix=prefix)
    app.include_router(incidents.router, prefix=prefix)
    app.include_router(corrective_actions.router, prefix=prefix)
    app.include_router(media.router, prefix=prefix)
    app.include_router(risk.router, prefix=prefix)
    app.include_router(gis.router, prefix=prefix)
    app.include_router(officer.router, prefix=prefix)
    app.include_router(notifications.router, prefix=prefix)
    app.include_router(health_records.router, prefix=prefix)

    @app.get("/health")
    def health_check():
        return {"status": "ok", "service": settings.APP_NAME}

    return app


app = create_app()
