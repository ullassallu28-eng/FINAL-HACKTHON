from datetime import datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.health import ChecklistItem, HealthRecord
from app.schemas.health import HealthRecordCreate
from app.services.farm_service import FarmService
from app.utils.helpers import generate_id


class HealthRecordService:
    @staticmethod
    def list_records(db: Session, farm_id: str, user=None) -> list[HealthRecord]:
        FarmService.get_farm(db, farm_id, user)
        return (
            db.query(HealthRecord)
            .filter(HealthRecord.farm_id == farm_id)
            .order_by(HealthRecord.recorded_at.desc())
            .all()
        )

    @staticmethod
    def create_record(db: Session, farm_id: str, payload: HealthRecordCreate, user=None) -> HealthRecord:
        FarmService.get_farm(db, farm_id, user)
        vaccination_date = None
        if payload.vaccination_date:
            vaccination_date = datetime.fromisoformat(payload.vaccination_date).date()

        record = HealthRecord(
            id=generate_id("HR"),
            farm_id=farm_id,
            animal_type=payload.animal_type,
            batch_name=payload.batch_name,
            zone_id=payload.zone_id,
            health_status=payload.health_status,
            mortality_count=payload.mortality_count,
            morbidity_count=payload.morbidity_count,
            vaccination_date=vaccination_date,
            notes=payload.notes,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record


DEFAULT_CHECKLIST_TITLES = [
    "Entry gate vehicle dip disinfected",
    "Water chlorination level verified (2.5 ppm)",
    "Daily mortality & morbidity logged",
    "Visitor digital check-in records verified",
    "Shed deep sanitation protocol check",
]


def _preview_checklist_items(farm_id: str) -> list[ChecklistItem]:
    """In-memory checklist for demo when DB has no rows — never persisted."""
    return [
        ChecklistItem(
            id=f"{farm_id}-preview-{index}",
            farm_id=farm_id,
            title=title,
            completed=index <= 2,
            priority="important" if index == len(DEFAULT_CHECKLIST_TITLES) else "normal",
        )
        for index, title in enumerate(DEFAULT_CHECKLIST_TITLES, start=1)
    ]


def _is_preview_checklist_id(item_id: str) -> bool:
    return "-preview-" in item_id


class ChecklistService:
    @staticmethod
    def list_items(db: Session, farm_id: str, user=None) -> list[ChecklistItem]:
        FarmService.get_farm(db, farm_id, user)
        items = db.query(ChecklistItem).filter(ChecklistItem.farm_id == farm_id).all()
        if items:
            return items
        return _preview_checklist_items(farm_id)

    @staticmethod
    def update_item(db: Session, farm_id: str, item_id: str, completed: bool, user=None) -> ChecklistItem:
        FarmService.get_farm(db, farm_id, user)
        item = (
            db.query(ChecklistItem)
            .filter(ChecklistItem.farm_id == farm_id, ChecklistItem.id == item_id)
            .first()
        )
        if not item:
            if _is_preview_checklist_id(item_id):
                for preview in _preview_checklist_items(farm_id):
                    if preview.id == item_id:
                        preview.completed = completed
                        return preview
            raise NotFoundError("ChecklistItem", item_id)
        item.completed = completed
        db.commit()
        db.refresh(item)
        return item
