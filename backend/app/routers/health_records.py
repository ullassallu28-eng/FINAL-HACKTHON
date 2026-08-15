from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_optional_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.health import HealthRecordCreate, HealthRecordResponse
from app.services.file_service import save_upload_file
from app.services.health_service import HealthRecordService

router = APIRouter(prefix="/health-records", tags=["Health Records"])


@router.get("/farms/{farm_id}", response_model=list[HealthRecordResponse])
def list_health_records(
    farm_id: str,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    records = HealthRecordService.list_records(db, farm_id, current_user)
    return [
        HealthRecordResponse(
            id=r.id,
            farm_id=r.farm_id,
            animal_type=r.animal_type,
            batch_name=r.batch_name,
            zone_id=r.zone_id,
            health_status=r.health_status,
            mortality_count=r.mortality_count,
            morbidity_count=r.morbidity_count,
            vaccination_date=r.vaccination_date.isoformat() if r.vaccination_date else None,
            notes=r.notes,
            recorded_at=r.recorded_at.isoformat(),
        )
        for r in records
    ]


@router.post("/farms/{farm_id}", response_model=HealthRecordResponse, status_code=201)
def create_health_record(
    farm_id: str,
    payload: HealthRecordCreate,
    db: Session = Depends(get_db),
    current_user: Annotated[User | None, Depends(get_optional_user)] = None,
):
    record = HealthRecordService.create_record(db, farm_id, payload, current_user)
    return HealthRecordResponse(
        id=record.id,
        farm_id=record.farm_id,
        animal_type=record.animal_type,
        batch_name=record.batch_name,
        zone_id=record.zone_id,
        health_status=record.health_status,
        mortality_count=record.mortality_count,
        morbidity_count=record.morbidity_count,
        vaccination_date=record.vaccination_date.isoformat() if record.vaccination_date else None,
        notes=record.notes,
        recorded_at=record.recorded_at.isoformat(),
    )


@router.post("/files/upload")
async def upload_file(
    file: UploadFile,
    db: Session = Depends(get_db),
    _: Annotated[User | None, Depends(get_optional_user)] = None,
):
    record = await save_upload_file(db, file)
    db.commit()
    return {
        "fileId": str(record.id),
        "fileName": record.file_name,
        "url": record.file_url,
        "mimeType": record.mime_type,
        "sizeBytes": record.size_bytes,
        "uploadedAt": record.uploaded_at.isoformat(),
    }
