from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.corrective_action import CorrectiveAction
from app.models.enums import (
    CorrectiveActionStatus,
    IncidentSeverity,
    IncidentStatus,
    NotificationType,
    RiskFactorCategory,
    RiskLevel,
    UserRole,
)
from app.models.farm import Farm
from app.models.incident import Incident
from app.models.passport import BiosecurityPassport
from app.models.risk import RiskFactor, RiskScoreHistory
from app.services.notification_service import NotificationService
from app.utils.helpers import clamp_score, farm_risk_level, generate_id


class RiskEngine:
    @staticmethod
    def incident_penalty(severity: IncidentSeverity) -> int:
        if severity in (IncidentSeverity.HIGH, IncidentSeverity.CRITICAL):
            return 12
        return 6

    @staticmethod
    def incident_factor_label(incident_id: str, incident_type: str) -> str:
        return f"Incident [{incident_id}]: {incident_type}"

    @staticmethod
    def compute_risk_level(score: int) -> RiskLevel:
        return farm_risk_level(score)

    @staticmethod
    def get_baseline_score(db: Session, farm: Farm) -> int:
        passport = (
            db.query(BiosecurityPassport)
            .filter(BiosecurityPassport.farm_id == farm.id)
            .first()
        )
        if passport:
            components = [
                passport.hygiene_score,
                passport.visitor_control_score,
                passport.quarantine_protocol_score,
                passport.waste_management_score,
            ]
            baseline = round(sum(components) / len(components))
            if baseline > 0:
                return baseline

        latest_history = (
            db.query(RiskScoreHistory)
            .filter(RiskScoreHistory.farm_id == farm.id)
            .order_by(RiskScoreHistory.recorded_at.desc())
            .first()
        )
        if latest_history and latest_history.score > 0:
            return latest_history.score

        if farm.previous_score > 0:
            return farm.previous_score
        if farm.biosecurity_score > 0:
            return farm.biosecurity_score
        return 75

    @staticmethod
    def confirm_verified_incident(db: Session, incident: Incident) -> None:
        """Increase penalty when an incident is veterinary-confirmed (score must not improve)."""
        factor = RiskEngine.find_incident_factor(db, incident.farm_id, incident.id)
        if not factor:
            return
        base = RiskEngine.incident_penalty(incident.severity)
        confirmed_delta = min(25, base + max(4, round(base * 0.5)))
        if confirmed_delta > factor.delta:
            factor.delta = confirmed_delta
            factor.description = (
                f"{factor.description.split('|ref:')[0].strip()} "
                f"[Veterinary-confirmed]|ref:{incident.id}|"
            )
        db.flush()

    @staticmethod
    def get_score_timeline(db: Session, farm_id: str, days: int = 30) -> list[dict]:
        from app.models.corrective_action import CorrectiveAction
        from app.models.incident import Incident

        since = datetime.now(timezone.utc) - timedelta(days=days)
        events: list[dict] = []

        incidents = (
            db.query(Incident)
            .filter(Incident.farm_id == farm_id, Incident.created_at >= since)
            .order_by(Incident.created_at.asc())
            .all()
        )
        for inc in incidents:
            score = RiskEngine._score_near(db, farm_id, inc.created_at)
            events.append({
                "time": inc.created_at.isoformat(),
                "event_type": "incident_reported",
                "label": f"Incident reported: {inc.incident_type}",
                "score": score,
                "reference_id": inc.id,
            })
            if inc.verified_at and inc.status.value == "Verified":
                score = RiskEngine._score_near(db, farm_id, inc.verified_at)
                events.append({
                    "time": inc.verified_at.isoformat(),
                    "event_type": "incident_verified",
                    "label": "Incident verified — risk recalculated",
                    "score": score,
                    "reference_id": inc.id,
                })

        actions = (
            db.query(CorrectiveAction)
            .filter(CorrectiveAction.farm_id == farm_id, CorrectiveAction.created_at >= since)
            .order_by(CorrectiveAction.created_at.asc())
            .all()
        )
        for act in actions:
            score = RiskEngine._score_near(db, farm_id, act.created_at)
            events.append({
                "time": act.created_at.isoformat(),
                "event_type": "action_assigned",
                "label": f"Corrective action assigned: {act.title}",
                "score": score,
                "reference_id": act.id,
            })
            if act.evidence and act.evidence.submitted_at:
                score = RiskEngine._score_near(db, farm_id, act.evidence.submitted_at)
                events.append({
                    "time": act.evidence.submitted_at.isoformat(),
                    "event_type": "evidence_submitted",
                    "label": f"Evidence submitted: {act.title}",
                    "score": score,
                    "reference_id": act.id,
                })
            if act.status.value in ("Verified", "Closed"):
                score = RiskEngine._score_near(db, farm_id, act.updated_at)
                events.append({
                    "time": act.updated_at.isoformat(),
                    "event_type": "action_closed",
                    "label": f"Corrective action verified & closed: {act.title}",
                    "score": score,
                    "reference_id": act.id,
                })

        events.sort(key=lambda e: e["time"])
        if not events:
            farm = db.query(Farm).filter(Farm.id == farm_id).first()
            if farm:
                events.append({
                    "time": datetime.now(timezone.utc).isoformat(),
                    "event_type": "current",
                    "label": "Current biosecurity score",
                    "score": farm.biosecurity_score,
                    "reference_id": farm_id,
                })
        return events

    @staticmethod
    def _score_near(db: Session, farm_id: str, moment: datetime) -> int:
        if moment.tzinfo is None:
            moment = moment.replace(tzinfo=timezone.utc)
        point = (
            db.query(RiskScoreHistory)
            .filter(
                RiskScoreHistory.farm_id == farm_id,
                RiskScoreHistory.recorded_at <= moment,
            )
            .order_by(RiskScoreHistory.recorded_at.desc())
            .first()
        )
        if point:
            return point.score
        farm = db.query(Farm).filter(Farm.id == farm_id).first()
        return farm.biosecurity_score if farm else 0

    @staticmethod
    def record_history(db: Session, farm_id: str, score: int) -> None:
        db.add(
            RiskScoreHistory(
                id=generate_id("RH"),
                farm_id=farm_id,
                score=score,
                recorded_at=datetime.now(timezone.utc),
            )
        )

    @staticmethod
    def cleanup_stale_incident_factors(db: Session, farm_id: str) -> None:
        incidents = db.query(Incident).filter(Incident.farm_id == farm_id).all()
        for incident in incidents:
            if incident.status == IncidentStatus.REJECTED:
                RiskEngine.deactivate_incident_factors(db, farm_id, incident.id)
                continue
            if incident.status == IncidentStatus.VERIFIED:
                total_actions = (
                    db.query(func.count(CorrectiveAction.id))
                    .filter(CorrectiveAction.incident_id == incident.id)
                    .scalar()
                ) or 0
                verified_actions = (
                    db.query(func.count(CorrectiveAction.id))
                    .filter(
                        CorrectiveAction.incident_id == incident.id,
                        CorrectiveAction.status == CorrectiveActionStatus.VERIFIED,
                    )
                    .scalar()
                ) or 0
                if total_actions == 0 or verified_actions >= total_actions:
                    RiskEngine.deactivate_incident_factors(db, farm_id, incident.id)

        RiskEngine.deactivate_orphan_incident_factors(db, farm_id)
        RiskEngine.deactivate_static_seed_factors(db, farm_id)
        RiskEngine.limit_open_reported_penalties(db, farm_id, max_open=2)

    @staticmethod
    def actionable_incident_ids(db: Session, farm_id: str) -> set[str]:
        open_statuses = {
            IncidentStatus.REPORTED,
            IncidentStatus.UNDER_REVIEW,
            IncidentStatus.MORE_INFO_REQUIRED,
        }
        actionable: set[str] = set()
        incidents = db.query(Incident).filter(Incident.farm_id == farm_id).all()
        for incident in incidents:
            if incident.status in open_statuses:
                actionable.add(incident.id)
                continue
            if incident.status == IncidentStatus.VERIFIED:
                open_actions = (
                    db.query(func.count(CorrectiveAction.id))
                    .filter(
                        CorrectiveAction.incident_id == incident.id,
                        CorrectiveAction.status.notin_([
                            CorrectiveActionStatus.VERIFIED,
                            CorrectiveActionStatus.CLOSED,
                        ]),
                    )
                    .scalar()
                ) or 0
                if open_actions > 0:
                    actionable.add(incident.id)
        return actionable

    @staticmethod
    def deactivate_static_seed_factors(db: Session, farm_id: str) -> None:
        for factor_id in ("rf-1", "rf-2", "rf-3", "rf-4"):
            factor = (
                db.query(RiskFactor)
                .filter(RiskFactor.id == factor_id, RiskFactor.farm_id == farm_id)
                .first()
            )
            if factor:
                factor.is_active = False
        db.flush()

    @staticmethod
    def limit_open_reported_penalties(db: Session, farm_id: str, max_open: int = 2) -> None:
        """Keep penalties only for the newest open incidents so demo farms recover from test spam."""
        open_statuses = [
            IncidentStatus.REPORTED,
            IncidentStatus.UNDER_REVIEW,
            IncidentStatus.MORE_INFO_REQUIRED,
        ]
        open_incidents = (
            db.query(Incident)
            .filter(Incident.farm_id == farm_id, Incident.status.in_(open_statuses))
            .order_by(Incident.created_at.desc())
            .all()
        )
        for incident in open_incidents[max_open:]:
            RiskEngine.deactivate_incident_factors(db, farm_id, incident.id)

    @staticmethod
    def deactivate_orphan_incident_factors(db: Session, farm_id: str) -> None:
        """Deactivate legacy incident factors with no open incident lifecycle."""
        actionable_ids = RiskEngine.actionable_incident_ids(db, farm_id)

        active_factors = (
            db.query(RiskFactor)
            .filter(
                RiskFactor.farm_id == farm_id,
                RiskFactor.is_active.is_(True),
                RiskFactor.category == RiskFactorCategory.INCIDENT,
            )
            .all()
        )

        seen_incident_ids: set[str] = set()
        for factor in active_factors:
            incident_id = RiskEngine.extract_incident_id(factor)
            if incident_id:
                if incident_id not in actionable_ids:
                    factor.is_active = False
                elif incident_id in seen_incident_ids:
                    factor.is_active = False
                else:
                    seen_incident_ids.add(incident_id)
                continue

            if not actionable_ids:
                factor.is_active = False

        db.flush()

    @staticmethod
    def extract_incident_id(factor: RiskFactor) -> str | None:
        if factor.description and "|ref:" in factor.description:
            start = factor.description.find("|ref:") + len("|ref:")
            end = factor.description.find("|", start)
            if end == -1:
                end = len(factor.description)
            incident_id = factor.description[start:end].strip()
            return incident_id or None
        if factor.label.startswith("Incident [") and "]:" in factor.label:
            return factor.label.split("[", 1)[1].split("]", 1)[0]
        return None

    @staticmethod
    def recalculate_farm(db: Session, farm: Farm) -> int:
        """Recalculate score from passport baseline minus active risk penalties. Returns old score."""
        RiskEngine.cleanup_stale_incident_factors(db, farm.id)
        old_score = farm.biosecurity_score
        baseline = RiskEngine.get_baseline_score(db, farm)
        active_factors = (
            db.query(RiskFactor)
            .filter(RiskFactor.farm_id == farm.id, RiskFactor.is_active.is_(True))
            .all()
        )
        penalty = sum(f.delta for f in active_factors)
        farm.previous_score = old_score
        new_score = clamp_score(baseline - penalty)
        farm.biosecurity_score = new_score
        farm.risk_level = RiskEngine.compute_risk_level(new_score)
        RiskEngine.record_history(db, farm.id, new_score)
        db.flush()
        return old_score

    @staticmethod
    def notify_score_change(db: Session, farm: Farm, old_score: int) -> None:
        delta = farm.biosecurity_score - old_score
        if delta == 0:
            return
        sign = "+" if delta > 0 else ""
        NotificationService.create(
            db,
            title="Biosecurity Score Updated",
            message=(
                f"{farm.name}: your biosecurity score is now "
                f"{farm.biosecurity_score}/100 ({sign}{delta} points)."
            ),
            notification_type=NotificationType.RISK,
            target_role=UserRole.FARMER,
        )

    @staticmethod
    def add_factor(
        db: Session,
        farm_id: str,
        label: str,
        delta: int,
        category: RiskFactorCategory,
        description: str,
    ) -> RiskFactor:
        factor = RiskFactor(
            id=generate_id("RF"),
            farm_id=farm_id,
            label=label,
            delta=delta,
            category=category,
            description=description,
            is_active=True,
        )
        db.add(factor)
        db.flush()
        return factor

    @staticmethod
    def find_incident_factor(db: Session, farm_id: str, incident_id: str) -> RiskFactor | None:
        prefix = f"Incident [{incident_id}]:"
        return (
            db.query(RiskFactor)
            .filter(
                RiskFactor.farm_id == farm_id,
                RiskFactor.is_active.is_(True),
                RiskFactor.label.like(f"{prefix}%"),
            )
            .first()
        )

    @staticmethod
    def incident_factor_ref(incident_id: str) -> str:
        return f"|ref:{incident_id}|"

    @staticmethod
    def deactivate_incident_factors(db: Session, farm_id: str, incident_id: str) -> None:
        ref = RiskEngine.incident_factor_ref(incident_id)
        prefix = f"Incident [{incident_id}]:"
        factors = (
            db.query(RiskFactor)
            .filter(
                RiskFactor.farm_id == farm_id,
                RiskFactor.is_active.is_(True),
                (RiskFactor.label.like(f"{prefix}%")) | (RiskFactor.description.contains(ref)),
            )
            .all()
        )
        if not factors:
            incident = db.query(Incident).filter(Incident.id == incident_id).first()
            if incident:
                legacy_label = f"Incident reported: {incident.incident_type}"
                factors = (
                    db.query(RiskFactor)
                    .filter(
                        RiskFactor.farm_id == farm_id,
                        RiskFactor.is_active.is_(True),
                        RiskFactor.label == legacy_label,
                        RiskFactor.description.contains(RiskEngine.incident_factor_ref(incident_id)),
                    )
                    .all()
                )
                if not factors:
                    factors = (
                        db.query(RiskFactor)
                        .filter(
                            RiskFactor.farm_id == farm_id,
                            RiskFactor.is_active.is_(True),
                            RiskFactor.label == legacy_label,
                            RiskFactor.category == RiskFactorCategory.INCIDENT,
                        )
                        .order_by(RiskFactor.created_at.desc())
                        .limit(1)
                        .all()
                    )
        for factor in factors:
            factor.is_active = False
        db.flush()

    @staticmethod
    def update_incident_factor_progress(db: Session, incident_id: str) -> None:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return

        factor = RiskEngine.find_incident_factor(db, incident.farm_id, incident_id)
        if not factor:
            return

        total_actions = (
            db.query(func.count(CorrectiveAction.id))
            .filter(CorrectiveAction.incident_id == incident_id)
            .scalar()
        ) or 0
        if total_actions == 0:
            return

        verified_actions = (
            db.query(func.count(CorrectiveAction.id))
            .filter(
                CorrectiveAction.incident_id == incident_id,
                CorrectiveAction.status == CorrectiveActionStatus.VERIFIED,
            )
            .scalar()
        ) or 0

        if verified_actions >= total_actions:
            factor.is_active = False
        else:
            base_penalty = RiskEngine.incident_penalty(incident.severity)
            remaining = total_actions - verified_actions
            factor.delta = max(1, round(base_penalty * remaining / total_actions))
        db.flush()

    @staticmethod
    def get_factors(db: Session, farm_id: str | None = None) -> list[RiskFactor]:
        query = db.query(RiskFactor).filter(RiskFactor.is_active.is_(True))
        if farm_id:
            query = query.filter(RiskFactor.farm_id == farm_id)
        return query.order_by(RiskFactor.delta.desc()).all()

    @staticmethod
    def get_history(db: Session, farm_id: str, days: int = 7) -> list[RiskScoreHistory]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        return (
            db.query(RiskScoreHistory)
            .filter(RiskScoreHistory.farm_id == farm_id, RiskScoreHistory.recorded_at >= since)
            .order_by(RiskScoreHistory.recorded_at.asc())
            .all()
        )

    @staticmethod
    def get_summary(db: Session, farm: Farm) -> dict:
        history = RiskEngine.get_history(db, farm.id, days=7)
        baseline = history[0].score if history else farm.previous_score
        score_delta = farm.biosecurity_score - baseline
        trend = "improving" if score_delta > 0 else "deteriorating" if score_delta < 0 else "stable"
        risk_level = farm.risk_level.value if hasattr(farm.risk_level, "value") else str(farm.risk_level)
        return {
            "farm_id": farm.id,
            "biosecurity_score": farm.biosecurity_score,
            "previous_score": farm.previous_score,
            "risk_level": risk_level,
            "score_delta_7d": score_delta,
            "risk_trend": trend,
        }

    @staticmethod
    def update_farm_counters(db: Session, farm: Farm) -> None:
        open_incidents = (
            db.query(func.count(Incident.id))
            .filter(
                Incident.farm_id == farm.id,
                Incident.status.in_([
                    IncidentStatus.REPORTED,
                    IncidentStatus.UNDER_REVIEW,
                    IncidentStatus.MORE_INFO_REQUIRED,
                ]),
            )
            .scalar()
        )
        open_actions = (
            db.query(func.count(CorrectiveAction.id))
            .filter(
                CorrectiveAction.farm_id == farm.id,
                CorrectiveAction.status.in_([
                    CorrectiveActionStatus.PENDING,
                    CorrectiveActionStatus.IN_PROGRESS,
                    CorrectiveActionStatus.EVIDENCE_SUBMITTED,
                    CorrectiveActionStatus.AWAITING_VERIFICATION,
                ]),
            )
            .scalar()
        )
        farm.active_incidents = open_incidents or 0
        farm.active_alerts = open_actions or 0
