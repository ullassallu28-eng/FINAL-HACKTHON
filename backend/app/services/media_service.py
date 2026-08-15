import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.file_upload import FileUpload


class MediaService:
    @staticmethod
    def resolve_url(db: Session | None, url: str | None) -> str:
        if not url:
            return ""
        cleaned = url.strip()
        if not cleaned or cleaned == "#":
            return ""

        if cleaned.startswith("data:"):
            return cleaned

        api_base = settings.public_api_base

        if "/api/v1/media/" in cleaned:
            if cleaned.startswith("http"):
                return cleaned
            idx = cleaned.index("/api/v1/media/")
            return f"{api_base}{cleaned[idx:]}"

        if cleaned.startswith("http://localhost") or cleaned.startswith("https://localhost"):
            try:
                from urllib.parse import urlparse

                path = urlparse(cleaned).path
                if "/api/v1/media/" in path:
                    return f"{api_base}{path[path.index('/api/v1/media/'):]}"
                cleaned = path
            except ValueError:
                pass

        if db and "/uploads/" in cleaned:
            stored_name = cleaned.split("/uploads/")[-1].split("?")[0]
            record = (
                db.query(FileUpload)
                .filter(FileUpload.file_path.like(f"%{stored_name}"))
                .order_by(FileUpload.uploaded_at.desc())
                .first()
            )
            if record:
                return f"{api_base}/api/v1/media/{record.id}"

        if cleaned.startswith("/api/v1/media/"):
            return f"{api_base}{cleaned}"

        if cleaned.startswith("http://") or cleaned.startswith("https://"):
            return cleaned

        if cleaned.startswith("/"):
            return f"{api_base}{cleaned}"

        return cleaned
