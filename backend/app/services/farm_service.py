from datetime import date

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.models.enums import (
    ComplianceStatus,
    FarmType,
    RegistrationStatus,
    RiskTrend,
    UserRole,
)
from app.models.farm import Farm, Zone
from app.models.passport import BiosecurityPassport
from app.models.user import User, UserFarmAssignment
from app.schemas.farm import FarmCreate, FarmUpdate
from app.utils.helpers import farm_risk_level, generate_id


DEMO_FARMER_EMAIL = "farmer@bioshield.local"


class FarmService:
    @staticmethod
    def _is_demo_farmer(user: User | None) -> bool:
        return user is not None and user.role == UserRole.FARMER and user.email == DEMO_FARMER_EMAIL

    @staticmethod
    def _accessible_farm_ids(user: User | None) -> list[str] | None:
        if user is None:
            return None
        if user.role in (UserRole.VETERINARIAN, UserRole.OFFICER):
            return None
        if FarmService._is_demo_farmer(user):
            return None
        return [a.farm_id for a in user.farm_assignments]

    @staticmethod
    def list_farms(db: Session, user: User | None = None) -> list[Farm]:
        query = db.query(Farm).filter(Farm.registration_status == RegistrationStatus.REGISTERED)
        farm_ids = FarmService._accessible_farm_ids(user)
        if farm_ids is not None:
            if not farm_ids:
                return []
            query = query.filter(Farm.id.in_(farm_ids))
        elif user and user.district_id and not FarmService._is_demo_farmer(user):
            if user.role != UserRole.OFFICER:
                query = query.filter(Farm.district_id == user.district_id)
        return query.order_by(Farm.biosecurity_score.asc()).all()

    @staticmethod
    def get_farm(db: Session, farm_id: str, user: User | None = None) -> Farm:
        farm = db.query(Farm).filter(Farm.id == farm_id).first()
        if not farm:
            raise NotFoundError("Farm", farm_id)
        FarmService.ensure_farm_access(farm, user)
        return farm

    @staticmethod
    def ensure_farm_access(farm: Farm, user: User | None) -> None:
        if user is None:
            return
        if user.role == UserRole.FARMER:
            if FarmService._is_demo_farmer(user):
                return
            allowed = {a.farm_id for a in user.farm_assignments}
            if farm.id not in allowed:
                raise ForbiddenError("You do not have access to this farm.")
        elif user.role == UserRole.OFFICER:
            return
        elif user.district_id and farm.district_id != user.district_id:
            raise ForbiddenError("Farm is outside your district.")

    @staticmethod
    def create_farm(db: Session, payload: FarmCreate, user: User | None = None) -> Farm:
        farm_id = generate_id("FARM-JH")
        district_id = payload.district_id or settings.DEFAULT_DISTRICT_ID
        farm = Farm(
            id=farm_id,
            name=payload.name,
            owner_name=payload.owner_name,
            location=payload.location,
            farm_type=FarmType(payload.farm_type),
            capacity=payload.capacity,
            animal_count=payload.animal_count,
            latitude=payload.coordinates.lat if payload.coordinates else None,
            longitude=payload.coordinates.lng if payload.coordinates else None,
            owner_phone=payload.owner_phone,
            district_id=district_id,
            biosecurity_score=0,
            previous_score=0,
            risk_level=farm_risk_level(0),
            registration_status=RegistrationStatus.REGISTERED,
        )
        db.add(farm)
        db.flush()

        passport = BiosecurityPassport(
            id=generate_id("PASS"),
            farm_id=farm.id,
            passport_qr_code=f"BS-PASSPORT-{farm.id}-VERIFIED",
            issue_date=date.today(),
            compliance_status=ComplianceStatus.ATTENTION_REQUIRED,
            risk_trend=RiskTrend.STABLE,
        )
        db.add(passport)

        default_zones = [
            ("gate", "Entry Gate", "entry_gate"),
            ("disinfection", "Disinfection Bay", "disinfection"),
            ("shed-01", "Shed 01", "shed"),
            ("feed", "Feed Storage", "feed_storage"),
        ]
        for zone_id, name, ztype in default_zones:
            db.add(
                Zone(
                    id=f"{farm.id}-{zone_id}",
                    farm_id=farm.id,
                    name=name,
                    zone_type=ztype,
                    risk_score=50,
                    risk_level=farm_risk_level(50),
                    compliance_rate=70.0,
                )
            )

        if user and user.role == UserRole.FARMER:
            db.add(UserFarmAssignment(user_id=user.id, farm_id=farm.id, is_owner=True))

        db.commit()
        db.refresh(farm)
        return farm

    @staticmethod
    def update_farm(db: Session, farm_id: str, payload: FarmUpdate, user: User) -> Farm:
        farm = FarmService.get_farm(db, farm_id, user)
        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(farm, key, value)
        db.commit()
        db.refresh(farm)
        return farm
