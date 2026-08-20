from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.enums import (
    ComplianceStatus,
    CorrectiveActionStatus,
    IncidentStatus,
    InspectionStatus,
    RiskTrend,
    VerificationStatus,
)
from app.models.farm import Farm
from app.models.inspection import Inspection
from app.models.passport import BiosecurityAssessment, BiosecurityPassport, AssessmentResponse
from app.schemas.farm import AssessmentCreate, InspectionHistoryItem
from app.services.farm_service import FarmService
from app.services.risk_service import RiskEngine
from app.utils.helpers import generate_id


ASSESSMENT_QUESTIONS = {
    "Q001": ("hygiene", 10),
    "Q002": ("visitor_control", 10),
    "Q003": ("quarantine", 10),
    "Q004": ("waste", 10),
    "Q005": ("vaccination", 10),
}


class PassportService:
    @staticmethod
    def get_passport(db: Session, farm_id: str, user=None):
        farm = FarmService.get_farm(db, farm_id, user)
        passport = db.query(BiosecurityPassport).filter(BiosecurityPassport.farm_id == farm_id).first()
        if not passport:
            raise NotFoundError("BiosecurityPassport", farm_id)

        inspections = (
            db.query(Inspection)
            .filter(Inspection.farm_id == farm_id, Inspection.status == InspectionStatus.COMPLETED)
            .order_by(Inspection.inspection_date.desc())
            .limit(10)
            .all()
        )
        history = [
            InspectionHistoryItem(
                id=i.id,
                date=i.inspection_date.isoformat(),
                inspector_name=i.inspector_name,
                result=i.result.value if i.result else "Needs Improvement",
                notes=i.notes or "",
            )
            for i in inspections
        ]
        return farm, passport, history

    @staticmethod
    def submit_assessment(db: Session, farm_id: str, payload: AssessmentCreate, user=None):
        farm = FarmService.get_farm(db, farm_id, user)
        if not payload.responses:
            raise ValidationAppError("Assessment requires at least one response.")

        component_totals = {"hygiene": 0, "visitor_control": 0, "quarantine": 0, "waste": 0, "vaccination": 0}
        component_counts = {k: 0 for k in component_totals}

        assessment_id = generate_id("ASSESS")
        assessment = BiosecurityAssessment(
            id=assessment_id,
            farm_id=farm_id,
            overall_score=0,
            assessed_by_id=str(user.id) if user else None,
            notes=payload.notes,
        )
        db.add(assessment)
        db.flush()

        total_score = 0
        for response in payload.responses:
            meta = ASSESSMENT_QUESTIONS.get(response.question_id)
            category = meta[0] if meta else "hygiene"
            db.add(
                AssessmentResponse(
                    id=generate_id("AR"),
                    assessment_id=assessment_id,
                    question_id=response.question_id,
                    answer=response.answer,
                    score=response.score,
                )
            )
            total_score += response.score
            if category in component_totals:
                component_totals[category] += response.score
                component_counts[category] += 1

        max_possible = len(payload.responses) * 10
        overall = round((total_score / max_possible) * 100) if max_possible else 0
        assessment.overall_score = overall
        assessment.hygiene_score = _avg(component_totals["hygiene"], component_counts["hygiene"])
        assessment.visitor_control_score = _avg(component_totals["visitor_control"], component_counts["visitor_control"])
        assessment.quarantine_protocol_score = _avg(component_totals["quarantine"], component_counts["quarantine"])
        assessment.waste_management_score = _avg(component_totals["waste"], component_counts["waste"])

        passport = db.query(BiosecurityPassport).filter(BiosecurityPassport.farm_id == farm_id).first()
        if passport:
            passport.hygiene_score = assessment.hygiene_score
            passport.visitor_control_score = assessment.visitor_control_score
            passport.quarantine_protocol_score = assessment.quarantine_protocol_score
            passport.waste_management_score = assessment.waste_management_score
            passport.compliance_status = (
                ComplianceStatus.COMPLIANT if overall >= 75 else ComplianceStatus.ATTENTION_REQUIRED
            )
            passport.risk_trend = RiskTrend.IMPROVING if overall >= farm.biosecurity_score else RiskTrend.DETERIORATING

        farm.previous_score = farm.biosecurity_score
        farm.biosecurity_score = overall
        farm.risk_level = RiskEngine.compute_risk_level(overall)
        RiskEngine.record_history(db, farm_id, overall)

        db.commit()
        return {
            "assessmentId": assessment_id,
            "farmId": farm_id,
            "overallScore": overall,
            "componentScores": {
                "hygiene": assessment.hygiene_score,
                "visitorControl": assessment.visitor_control_score,
                "quarantineProtocol": assessment.quarantine_protocol_score,
                "wasteManagement": assessment.waste_management_score,
            },
            "passportUpdated": passport is not None,
        }


def _avg(total: int, count: int) -> int:
    return round(total / count) if count else 0
