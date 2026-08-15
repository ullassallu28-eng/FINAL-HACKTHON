"""Additive multi-state demo seed for the current BioShield repository.

Run the normal seed.py first. This script only adds new states/districts/farms
and clearly labelled synthetic demo incidents/actions. It is idempotent and
does not delete or replace existing Jharkhand data.

Usage:
    cd backend
    python -m scripts.seed_multistate
"""

from datetime import date, datetime, timezone

from app.database.session import SessionLocal
from app.models.corrective_action import CorrectiveAction
from app.models.enums import (
    ActionPriority,
    ComplianceStatus,
    CorrectiveActionStatus,
    FarmType,
    IncidentSeverity,
    IncidentStatus,
    RegistrationStatus,
    RiskFactorCategory,
    RiskLevel,
    RiskTrend,
    VerificationStatus,
)
from app.models.farm import Farm
from app.models.health import ChecklistItem
from app.models.incident import Incident
from app.models.passport import BiosecurityPassport
from app.models.risk import RiskFactor, RiskScoreHistory
from app.models.user import District, User, UserFarmAssignment

STATE_NAMES = {
    "KA": "Karnataka",
    "KL": "Kerala",
    "TN": "Tamil Nadu",
    "AP": "Andhra Pradesh",
}

NEW_DISTRICTS = {
    "KA": [
        ("district-ka-mysuru", "Mysuru"),
        ("district-ka-hassan", "Hassan"),
    ],
    "KL": [
        ("district-kl-wayanad", "Wayanad"),
        ("district-kl-thrissur", "Thrissur"),
        ("district-kl-palakkad", "Palakkad"),
    ],
    "TN": [
        ("district-tn-namakkal", "Namakkal"),
        ("district-tn-coimbatore", "Coimbatore"),
    ],
    "AP": [
        ("district-ap-chittoor", "Chittoor"),
        ("district-ap-guntur", "Guntur"),
        ("district-ap-west-godavari", "West Godavari"),
    ],
}

NEW_FARMS = [
    # Existing 8 farms already added by the first run are kept here so the
    # idempotent script will simply skip them.
    # Karnataka (2)
    {
        "id": "FARM-KA-2026-0001", "name": "Cauvery Dairy Enterprise",
        "location": "Mysuru, Karnataka", "owner_name": "Mukesh Rao",
        "farm_type": FarmType.MIXED, "capacity": 250, "animal_count": 210,
        "biosecurity_score": 82, "previous_score": 79, "risk_level": RiskLevel.SAFE,
        "compliance_rate": 91.0, "vaccination_coverage": 94.0, "visitors_today": 5,
        "vehicles_today": 3, "active_incidents": 0, "active_alerts": 0,
        "latitude": 12.2958, "longitude": 76.6394, "owner_phone": "+91 90000 10001",
        "district_id": "district-ka-mysuru",
    },
    {
        "id": "FARM-KA-2026-0002", "name": "Deccan Poultry Estate",
        "location": "Hassan, Karnataka", "owner_name": "Manjunath Gowda",
        "farm_type": FarmType.POULTRY, "capacity": 12000, "animal_count": 11500,
        "biosecurity_score": 76, "previous_score": 73, "risk_level": RiskLevel.SAFE,
        "compliance_rate": 87.0, "vaccination_coverage": 92.0, "visitors_today": 7,
        "vehicles_today": 4, "active_incidents": 0, "active_alerts": 1,
        "latitude": 13.0033, "longitude": 76.1004, "owner_phone": "+91 90000 10002",
        "district_id": "district-ka-hassan",
    },

    # Kerala (existing 2 + 2 new)
    {
        "id": "FARM-KL-2026-0001", "name": "Malabar Bio-Livestock Haven",
        "location": "Wayanad, Kerala", "owner_name": "Anil Kumar",
        "farm_type": FarmType.MIXED, "capacity": 180, "animal_count": 150,
        "biosecurity_score": 62, "previous_score": 68, "risk_level": RiskLevel.CAUTION,
        "compliance_rate": 74.0, "vaccination_coverage": 88.0, "visitors_today": 6,
        "vehicles_today": 3, "active_incidents": 1, "active_alerts": 2,
        "latitude": 11.6854, "longitude": 76.1320, "owner_phone": "+91 90000 20001",
        "district_id": "district-kl-wayanad",
    },
    {
        "id": "FARM-KL-2026-0002", "name": "Thrissur Pig & Agri Complex",
        "location": "Thrissur, Kerala", "owner_name": "Mohan Kumar",
        "farm_type": FarmType.PIG, "capacity": 300, "animal_count": 270,
        "biosecurity_score": 69, "previous_score": 72, "risk_level": RiskLevel.CAUTION,
        "compliance_rate": 81.0, "vaccination_coverage": 90.0, "visitors_today": 4,
        "vehicles_today": 2, "active_incidents": 0, "active_alerts": 1,
        "latitude": 10.5276, "longitude": 76.2144, "owner_phone": "+91 90000 20002",
        "district_id": "district-kl-thrissur",
    },
    {
        "id": "FARM-KL-2026-0003", "name": "Palakkad Green Livestock Farm",
        "location": "Palakkad, Kerala", "owner_name": "Keshava Kumar",
        "farm_type": FarmType.MIXED, "capacity": 220, "animal_count": 185,
        "biosecurity_score": 80, "previous_score": 77, "risk_level": RiskLevel.SAFE,
        "compliance_rate": 89.0, "vaccination_coverage": 93.0, "visitors_today": 3,
        "vehicles_today": 2, "active_incidents": 0, "active_alerts": 0,
        "latitude": 10.7867, "longitude": 76.6548, "owner_phone": "+91 90000 20003",
        "district_id": "district-kl-palakkad",
    },
    {
        "id": "FARM-KL-2026-0004", "name": "Wayanad Highland Poultry Unit",
        "location": "Wayanad, Kerala", "owner_name": "Gopala Iyer",
        "farm_type": FarmType.POULTRY, "capacity": 9000, "animal_count": 8500,
        "biosecurity_score": 73, "previous_score": 70, "risk_level": RiskLevel.SAFE,
        "compliance_rate": 84.0, "vaccination_coverage": 91.0, "visitors_today": 5,
        "vehicles_today": 3, "active_incidents": 0, "active_alerts": 1,
        "latitude": 11.6854, "longitude": 76.1320, "owner_phone": "+91 90000 20004",
        "district_id": "district-kl-wayanad",
    },

    # Tamil Nadu (2)
    {
        "id": "FARM-TN-2026-0001", "name": "Kongu Belt Poultry Hub",
        "location": "Namakkal, Tamil Nadu", "owner_name": "Murugesha Raman",
        "farm_type": FarmType.POULTRY, "capacity": 25000, "animal_count": 24200,
        "biosecurity_score": 84, "previous_score": 80, "risk_level": RiskLevel.SAFE,
        "compliance_rate": 93.0, "vaccination_coverage": 96.0, "visitors_today": 8,
        "vehicles_today": 5, "active_incidents": 0, "active_alerts": 0,
        "latitude": 11.2189, "longitude": 78.1674, "owner_phone": "+91 90000 30001",
        "district_id": "district-tn-namakkal",
    },
    {
        "id": "FARM-TN-2026-0002", "name": "Western Ghats Dairy Cooperative",
        "location": "Coimbatore, Tamil Nadu", "owner_name": "Subbaih chenna",
        "farm_type": FarmType.MIXED, "capacity": 400, "animal_count": 380,
        "biosecurity_score": 79, "previous_score": 77, "risk_level": RiskLevel.SAFE,
        "compliance_rate": 89.0, "vaccination_coverage": 94.0, "visitors_today": 5,
        "vehicles_today": 3, "active_incidents": 0, "active_alerts": 0,
        "latitude": 11.0168, "longitude": 76.9558, "owner_phone": "+91 90000 30002",
        "district_id": "district-tn-coimbatore",
    },

    # Andhra Pradesh (existing 2 + 1 new)
    {
        "id": "FARM-AP-2026-0001", "name": "Rayalaseema Cattle Station",
        "location": "Chittoor, Andhra Pradesh", "owner_name": "Ravi Reddy",
        "farm_type": FarmType.MIXED, "capacity": 500, "animal_count": 460,
        "biosecurity_score": 77, "previous_score": 74, "risk_level": RiskLevel.SAFE,
        "compliance_rate": 88.0, "vaccination_coverage": 93.0, "visitors_today": 6,
        "vehicles_today": 3, "active_incidents": 0, "active_alerts": 0,
        "latitude": 13.2172, "longitude": 79.1003, "owner_phone": "+91 90000 40001",
        "district_id": "district-ap-chittoor",
    },
    {
        "id": "FARM-AP-2026-0002", "name": "Krishna Delta Bio-Poultry",
        "location": "Guntur, Andhra Pradesh", "owner_name": "Suresh Reddy",
        "farm_type": FarmType.POULTRY, "capacity": 18000, "animal_count": 17500,
        "biosecurity_score": 58, "previous_score": 63, "risk_level": RiskLevel.CAUTION,
        "compliance_rate": 72.0, "vaccination_coverage": 86.0, "visitors_today": 10,
        "vehicles_today": 6, "active_incidents": 1, "active_alerts": 2,
        "latitude": 16.3067, "longitude": 80.4365, "owner_phone": "+91 90000 40002",
        "district_id": "district-ap-guntur",
    },
    {
        "id": "FARM-AP-2026-0003", "name": "Coastal Godavari Dairy Farm",
        "location": "West Godavari, Andhra Pradesh", "owner_name": "Mahesha shetty",
        "farm_type": FarmType.MIXED, "capacity": 350, "animal_count": 310,
        "biosecurity_score": 75, "previous_score": 71, "risk_level": RiskLevel.SAFE,
        "compliance_rate": 86.0, "vaccination_coverage": 92.0, "visitors_today": 4,
        "vehicles_today": 2, "active_incidents": 0, "active_alerts": 0,
        "latitude": 16.7107, "longitude": 81.0952, "owner_phone": "+91 90000 40003",
        "district_id": "district-ap-west-godavari",
    },
]

DEMO_INCIDENTS = [
    {
        "id": "INC-DEMO-KL-001", "farm_id": "FARM-KL-2026-0001",
        "title": "[DEMO] Routine respiratory screening flag",
        "description": "SYNTHETIC DEMO DATA: Routine inspection flagged mild respiratory signs for follow-up.",
        "incident_type": "Respiratory screening",
        "animal_type": "Mixed livestock", "number_affected": 6,
        "location": "Isolation area", "status": IncidentStatus.UNDER_REVIEW,
        "severity": IncidentSeverity.MEDIUM,
        "veterinarian_notes": "Synthetic hackathon record; not a real-world incident.",
        "action_id": "ACT-DEMO-KL-001",
        "action_title": "Review isolation and sanitation procedure",
        "action_description": "SYNTHETIC DEMO ACTION: Review isolation and document sanitation completion.",
        "priority": ActionPriority.HIGH,
    },
    {
        "id": "INC-DEMO-KA-001", "farm_id": "FARM-KA-2026-0002",
        "title": "[DEMO] Entry vehicle disinfection check",
        "description": "SYNTHETIC DEMO DATA: Entry gate disinfection pressure was below the demonstration threshold.",
        "incident_type": "Biosecurity equipment check",
        "animal_type": "Poultry", "number_affected": 0,
        "location": "Main entry gate", "status": IncidentStatus.REPORTED,
        "severity": IncidentSeverity.LOW,
        "veterinarian_notes": "Synthetic hackathon record; not a real-world incident.",
        "action_id": "ACT-DEMO-KA-001",
        "action_title": "Verify vehicle disinfection gate",
        "action_description": "SYNTHETIC DEMO ACTION: Inspect and document gate operation.",
        "priority": ActionPriority.MEDIUM,
    },
    {
        "id": "INC-DEMO-TN-001", "farm_id": "FARM-TN-2026-0001",
        "title": "[DEMO] Feed storage hygiene observation",
        "description": "SYNTHETIC DEMO DATA: Routine observation flagged a minor feed-storage hygiene issue.",
        "incident_type": "Feed storage observation",
        "animal_type": "Poultry", "number_affected": 0,
        "location": "Feed storage", "status": IncidentStatus.REPORTED,
        "severity": IncidentSeverity.LOW,
        "veterinarian_notes": "Synthetic hackathon record; not a real-world incident.",
        "action_id": "ACT-DEMO-TN-001",
        "action_title": "Refresh feed storage sanitation",
        "action_description": "SYNTHETIC DEMO ACTION: Clean storage area and record completion.",
        "priority": ActionPriority.LOW,
    },
    {
        "id": "INC-DEMO-AP-001", "farm_id": "FARM-AP-2026-0002",
        "title": "[DEMO] Vehicle wash-bay defect",
        "description": "SYNTHETIC DEMO DATA: Reduced spray pressure detected at the vehicle disinfection gate.",
        "incident_type": "Equipment failure",
        "animal_type": "Poultry", "number_affected": 0,
        "location": "Vehicle entry", "status": IncidentStatus.REPORTED,
        "severity": IncidentSeverity.MEDIUM,
        "veterinarian_notes": "Synthetic hackathon record; not a real-world incident.",
        "action_id": "ACT-DEMO-AP-001",
        "action_title": "Repair vehicle disinfection gate",
        "action_description": "SYNTHETIC DEMO ACTION: Service the spray gate and verify pressure.",
        "priority": ActionPriority.HIGH,
    },
    {
        "id": "INC-DEMO-AP-002", "farm_id": "FARM-AP-2026-0003",
        "title": "[DEMO] Visitor log verification",
        "description": "SYNTHETIC DEMO DATA: Visitor records required a routine completeness check.",
        "incident_type": "Visitor control observation",
        "animal_type": "Mixed livestock", "number_affected": 0,
        "location": "Visitor entry", "status": IncidentStatus.REPORTED,
        "severity": IncidentSeverity.LOW,
        "veterinarian_notes": "Synthetic hackathon record; not a real-world incident.",
        "action_id": "ACT-DEMO-AP-002",
        "action_title": "Complete visitor log verification",
        "action_description": "SYNTHETIC DEMO ACTION: Verify and complete the visitor log.",
        "priority": ActionPriority.LOW,
    },
]


def seed_multistate() -> None:
    db = SessionLocal()
    try:
        farmer = db.query(User).filter(User.email == "farmer@bioshield.local").first()
        if not farmer:
            raise RuntimeError(
                "The existing demo farmer was not found. Run the existing "
                "python -m scripts.seed first, then run this script."
            )

        # 1. Add only the new districts. Existing Jharkhand districts are untouched.
        for code, districts in NEW_DISTRICTS.items():
            for district_id, name in districts:
                if not db.query(District).filter(District.id == district_id).first():
                    db.add(District(id=district_id, name=name, state=STATE_NAMES[code]))
        db.flush()

        # 2. Add the 11 new farms. Existing farms are never modified.
        for data in NEW_FARMS:
            farm = db.query(Farm).filter(Farm.id == data["id"]).first()

            if not farm:
                farm = Farm(
                    district_id=data["district_id"],
                    registration_status=RegistrationStatus.REGISTERED,
                    **{k: v for k, v in data.items() if k != "district_id"},
                )
                db.add(farm)
                db.flush()
            else:
                # Update existing farm details
                farm.name = data["name"]
                farm.owner_name = data["owner_name"]
                farm.location = data["location"]
                farm.owner_phone = data["owner_phone"]
                farm.farm_type = data["farm_type"]

            # Repair only missing related demo records if a previous run stopped midway.
            if not db.query(UserFarmAssignment).filter(
                UserFarmAssignment.user_id == farmer.id,
                UserFarmAssignment.farm_id == farm.id,
            ).first():
                db.add(UserFarmAssignment(user_id=farmer.id, farm_id=farm.id, is_owner=True))

            if not db.query(BiosecurityPassport).filter(BiosecurityPassport.farm_id == farm.id).first():
                db.add(
                    BiosecurityPassport(
                        id=f"PASS-{farm.id}",
                        farm_id=farm.id,
                        hygiene_score=min(100, data["biosecurity_score"] + 6),
                        visitor_control_score=max(0, data["biosecurity_score"] - 1),
                        quarantine_protocol_score=min(100, data["biosecurity_score"] + 7),
                        waste_management_score=max(0, data["biosecurity_score"] - 8),
                        compliance_status=(
                            ComplianceStatus.COMPLIANT
                            if data["biosecurity_score"] >= 75
                            else ComplianceStatus.ATTENTION_REQUIRED
                        ),
                        risk_trend=(
                            RiskTrend.IMPROVING
                            if data["risk_level"] == RiskLevel.SAFE
                            else RiskTrend.DETERIORATING
                        ),
                        passport_qr_code=f"BS-PASSPORT-{farm.id}-DEMO",
                        issue_date=date(2026, 8, 12),
                        last_inspection_date=date(2026, 8, 12),
                    )
                )

            if not db.query(ChecklistItem).filter(ChecklistItem.id == f"check-demo-{farm.id}").first():
                db.add(
                    ChecklistItem(
                        id=f"check-demo-{farm.id}",
                        farm_id=farm.id,
                        title="Entry gate biosecurity check completed",
                        completed=True,
                    )
                )

            if not db.query(RiskFactor).filter(RiskFactor.id == f"rf-demo-{farm.id}").first():
                db.add(
                    RiskFactor(
                        id=f"rf-demo-{farm.id}",
                        farm_id=farm.id,
                        label="[DEMO] Routine monitoring factor",
                        delta=5 if data["active_incidents"] else 2,
                        category=RiskFactorCategory.INCIDENT if data["active_incidents"] else RiskFactorCategory.VISITOR,
                        description="SYNTHETIC DEMO DATA for hackathon risk visualization.",
                    )
                )

            if not db.query(RiskScoreHistory).filter(RiskScoreHistory.id == f"RH-DEMO-{farm.id}").first():
                db.add(
                    RiskScoreHistory(
                        id=f"RH-DEMO-{farm.id}",
                        farm_id=farm.id,
                        score=data["biosecurity_score"],
                        recorded_at=datetime(2026, 8, 12, 12, 0, tzinfo=timezone.utc),
                    )
                )

        db.flush()

        # 3. Add a small number of clearly synthetic incidents/actions.
        for item in DEMO_INCIDENTS:
            if not db.query(Incident).filter(Incident.id == item["id"]).first():
                incident = Incident(
                    id=item["id"], farm_id=item["farm_id"],
                    description=item["description"],
                    incident_type=item["incident_type"], severity=item["severity"],
                    status=item["status"], reported_by_id=farmer.id,
                    animal_type=item["animal_type"], number_affected=item["number_affected"],
                    location=item["location"], veterinarian_notes=item["veterinarian_notes"],
                    observed_at=datetime(2026, 8, 12, 10, 0, tzinfo=timezone.utc),
                )
                db.add(incident)
                db.flush()

                db.add(
                    CorrectiveAction(
                        id=item["action_id"], farm_id=item["farm_id"], incident_id=incident.id,
                        title=item["action_title"], description=item["action_description"],
                        priority=item["priority"], assigned_person="Demo Farm Manager",
                        deadline=date(2026, 8, 15),
                        status=CorrectiveActionStatus.PENDING,
                        evidence_required=True,
                        verification_status=VerificationStatus.UNVERIFIED,
                    )
                )

        db.commit()

        print("Multi-state seed completed successfully.")
        print("Existing Jharkhand data was preserved.")
        print("Farm distribution:")
        print("  Jharkhand       4 existing")
        print("  Karnataka       2 new")
        print("  Kerala          4 new")
        print("  Tamil Nadu      2 new")
        print("  Andhra Pradesh  3 new")
        print("  TOTAL          15")
        print("Synthetic demo incidents added: 5")
        print("Synthetic demo corrective actions added: 5")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_multistate()
