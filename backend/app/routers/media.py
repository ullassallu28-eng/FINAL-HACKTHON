import base64
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.database.session import get_db
from app.models.file_upload import FileUpload

router = APIRouter(tags=["Media"])


@router.get("/media/{file_id}")
def get_media_file(file_id: uuid.UUID, db: Session = Depends(get_db)):
    record = db.query(FileUpload).filter(FileUpload.id == file_id).first()
    if not record:
        raise NotFoundError("Media", str(file_id))

    if record.content_base64:
        data = base64.b64decode(record.content_base64)
        media_type = record.mime_type or "application/octet-stream"
        return Response(
            content=data,
            media_type=media_type,
            headers={"Cache-Control": "public, max-age=86400"},
        )

    file_path = Path(record.file_path)
    if file_path.is_file():
        return FileResponse(
            path=str(file_path),
            media_type=record.mime_type or "application/octet-stream",
            filename=record.file_name,
        )

    raise NotFoundError("Media", str(file_id))
