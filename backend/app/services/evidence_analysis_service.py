"""Evidence analysis — vision AI when configured, else image + text relevance scoring."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.models.corrective_action import ActionEvidence, CorrectiveAction
from app.services.evidence_image_analyzer import assess_image, load_image_bytes
from app.services.evidence_vision_service import EvidenceVisionService


@dataclass(frozen=True)
class ActionProfile:
    category: str
    note_signals: tuple[str, ...]
    expected_in_photo: str
    aligned_actions: tuple[dict, ...]


GENERIC_NOTES = (
    "disinfection evidence recorded and verified on site",
    "evidence uploaded",
    "test upload",
    "photo attached",
    "submitted as evidence",
)

UNRELATED_FILE_HINTS = (
    "meme", "cartoon", "anime", "game", "wallpaper", "logo", "avatar",
    "selfie", "food", "pizza", "burger", "celebrity", "stock photo",
    "sample", "dummy", "random", "unrelated", "screenshot",
)

FARM_FILE_HINTS = (
    "gate", "shed", "farm", "disinfect", "spray", "wheel", "bath",
    "visitor", "log", "register", "isolat", "mortality", "vehicle",
    "quarantine", "sanit", "virkon", "entry", "perimeter", "batch",
)

PROFILES: dict[str, ActionProfile] = {
    "disinfection": ActionProfile(
        category="disinfection",
        note_signals=("disinfect", "virkon", "spray", "wheel", "bath", "gate", "entry", "chemical", "basin"),
        expected_in_photo="footbath, spray bottle, disinfectant application, wet entry point, or gate disinfection setup",
        aligned_actions=(
            {"title": "Verify disinfectant concentration log", "description": "Confirm approved disinfectant at correct dilution was applied at the photographed entry point.", "priority": "high"},
            {"title": "Confirm coverage of all vehicle wheels", "description": "Check wheel-bath or spray coverage matches farm vehicle movement records.", "priority": "medium"},
        ),
    ),
    "visitor": ActionProfile(
        category="visitor",
        note_signals=("visitor", "register", "logbook", "restrict", "entry", "sign", "notice"),
        expected_in_photo="visitor register, restricted entry notice, gate signage, or empty visitor reception area",
        aligned_actions=(
            {"title": "Audit visitor register for last 72 hours", "description": "Cross-check visitor log entries against the date of this evidence upload.", "priority": "high"},
            {"title": "Confirm non-essential visit suspension notice is posted", "description": "Ensure visible signage matches the veterinary action plan requirement.", "priority": "medium"},
        ),
    ),
    "isolation": ActionProfile(
        category="isolation",
        note_signals=("isolat", "segregat", "barrier", "shed", "batch", "mortality", "pen", "restricted"),
        expected_in_photo="segregated pen, isolation barrier, restricted movement signage, or separated batch area",
        aligned_actions=(
            {"title": "Confirm isolation protocol compliance", "description": "Verify affected batch is physically segregated with movement restrictions enforced.", "priority": "urgent"},
            {"title": "Review mortality log for affected batch", "description": "Match isolation evidence with mortality records for the same shed/batch.", "priority": "high"},
        ),
    ),
    "vehicle": ActionProfile(
        category="vehicle",
        note_signals=("vehicle", "transport", "wheel", "spray", "truck", "movement", "disinfect"),
        expected_in_photo="vehicle wheel-bath, spray arch, disinfection station, or transport log at farm entry",
        aligned_actions=(
            {"title": "Review vehicle disinfection records", "description": "Match photographed wheel-bath/spray evidence with vehicle entry log timestamps.", "priority": "high"},
        ),
    ),
    "quarantine": ActionProfile(
        category="quarantine",
        note_signals=("quarantine", "new stock", "arrival", "holding", "separate", "duration"),
        expected_in_photo="quarantine pen, separate holding area, or new stock isolation zone",
        aligned_actions=(
            {"title": "Validate quarantine duration", "description": "Confirm new arrivals completed minimum quarantine before integration.", "priority": "medium"},
        ),
    ),
    "sanitation": ActionProfile(
        category="sanitation",
        note_signals=("sanit", "clean", "wash", "shed", "deep clean", "decontam"),
        expected_in_photo="cleaned shed surface, sanitation equipment, washed pens, or post-cleaning wet floors",
        aligned_actions=(
            {"title": "Verify deep-clean completion checklist", "description": "Confirm all surfaces in the affected zone were cleaned before disinfection.", "priority": "high"},
        ),
    ),
    "general": ActionProfile(
        category="general",
        note_signals=("farm", "completed", "done", "fixed", "installed", "posted", "cleaned"),
        expected_in_photo="clear farm scene directly showing the completed corrective work described in the action",
        aligned_actions=(
            {"title": "Schedule follow-up field verification", "description": "If photo clearly shows completed work, confirm on-site during next visit.", "priority": "medium"},
        ),
    ),
}

CATEGORY_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("disinfection", ("disinfect", "decontam", "virkon", "wheel-bath", "wheel bath", "entry point", "footbath")),
    ("visitor", ("visitor", "visit restrict", "non-essential visit", "entry control")),
    ("isolation", ("isolat", "segregat", "mortality", "affected batch", "affected zone")),
    ("vehicle", ("vehicle", "transport", "wheel", "truck movement")),
    ("quarantine", ("quarantine", "new stock", "new arrival")),
    ("sanitation", ("sanitation", "deep clean", "shed clean", "cleaning")),
]


def _detect_category(text: str) -> ActionProfile:
    lowered = text.lower()
    for category, keys in CATEGORY_KEYWORDS:
        if any(k in lowered for k in keys):
            return PROFILES[category]
    return PROFILES["general"]


def _note_is_generic(notes: str) -> bool:
    normalized = notes.strip().lower()
    if not normalized:
        return True
    return any(g in normalized for g in GENERIC_NOTES) and len(normalized) < 80


def _text_overlap(signals: tuple[str, ...], text: str) -> int:
    lowered = text.lower()
    return sum(1 for s in signals if s in lowered)


def _reject_recommendations(profile: ActionProfile, reason: str) -> list[dict]:
    return [
        {
            "title": "Reject evidence — photo does not match required action",
            "description": (
                f"{reason} Ask the farmer to resubmit a clear photo showing: "
                f"{profile.expected_in_photo}."
            ),
            "priority": "urgent",
        },
        {
            "title": "Send farmer a photo checklist",
            "description": (
                f"Required action: take a new photo at the farm that clearly shows "
                f"{profile.expected_in_photo}, with a brief note describing what was done."
            ),
            "priority": "high",
        },
    ]


def _uncertain_recommendations(profile: ActionProfile) -> list[dict]:
    return [
        {
            "title": "Request clearer corrective-action photo",
            "description": (
                f"Evidence is ambiguous. Ask for a retake showing: {profile.expected_in_photo}."
            ),
            "priority": "high",
        },
        {
            "title": "Compare photo timestamp with farm visit log",
            "description": "Verify the upload time matches when the corrective work was performed.",
            "priority": "medium",
        },
    ]


class EvidenceAnalysisService:
    @staticmethod
    def analyze(
        db: Session | None,
        action: CorrectiveAction,
        evidence: ActionEvidence | None,
    ) -> dict:
        title = action.title or ""
        desc = action.description or ""
        notes = (evidence.notes if evidence else "") or ""
        file_name = (evidence.file_name if evidence else "") or ""
        combined = f"{title} {desc}".lower()
        profile = _detect_category(combined)

        observations: list[str] = []
        if evidence:
            observations.append(f"Farmer submitted file: {file_name}")
            if evidence.location:
                observations.append(f"Capture location: {evidence.location}")
            if notes.strip():
                observations.append(f"Farmer note: {notes.strip()}")
        else:
            observations.append("No evidence file attached yet.")

        observations.append(f"Required corrective action: {title}")
        observations.append(f"Expected photo content: {profile.expected_in_photo}")

        if not evidence:
            return {
                "summary": f"No evidence uploaded yet for “{title}”.",
                "observations": observations,
                "recommended_actions": [
                    {
                        "title": "Wait for farmer upload",
                        "description": "Farmer must upload evidence from Corrective Actions before inspection.",
                        "priority": "medium",
                    }
                ],
                "analysis_method": "relevance-scoring",
                "relevance_level": "missing",
                "relevance_score": 0,
                "farm_related": False,
                "image_assessment": None,
                "disclaimer": EvidenceAnalysisService._disclaimer(),
            }

        image_bytes, file_record = load_image_bytes(db, evidence.file_url)
        image_info = assess_image(image_bytes)
        if image_info.valid_image:
            observations.append(
                f"Image inspected: {image_info.width}×{image_info.height}px ({image_info.format or 'unknown'})"
            )
            if image_info.likely_unrelated_visual:
                observations.append(
                    "Visual analysis: image appears visually uniform or non-documentary — may not be a farm evidence photo."
                )
            if image_info.likely_screenshot:
                observations.append(
                    "Visual analysis: image proportions resemble a phone screenshot rather than a direct farm photo."
                )
        else:
            observations.append("Could not inspect image pixels — using filename and notes only.")

        vision_result = None
        if image_bytes and file_record and EvidenceVisionService.is_available():
            mime = file_record.mime_type or "image/jpeg"
            import base64

            vision_result = EvidenceVisionService.analyze_image(
                image_base64=base64.b64encode(image_bytes).decode("ascii"),
                mime_type=mime,
                action_title=title,
                action_description=desc,
                farmer_notes=notes,
            )

        if vision_result:
            return EvidenceAnalysisService._from_vision(vision_result, observations, image_info, profile)

        score = EvidenceAnalysisService._score_relevance(
            profile=profile,
            notes=notes,
            file_name=file_name,
            image_info=image_info,
        )
        relevance_level = (
            "aligned" if score >= 70 else "uncertain" if score >= 45 else "unrelated"
        )
        farm_related = relevance_level != "unrelated"

        if relevance_level == "unrelated":
            reason = "Uploaded image and notes do not appear to demonstrate farm corrective work."
            if any(h in file_name.lower() for h in UNRELATED_FILE_HINTS):
                reason = f"Filename “{file_name}” suggests non-farm content."
            elif _note_is_generic(notes):
                reason = "Farmer note is generic and does not describe the corrective work shown."
            elif image_info.likely_unrelated_visual:
                reason = "Image content appears unrelated to farm biosecurity evidence."
            recommended = _reject_recommendations(profile, reason)
            summary = (
                f"Evidence for “{title}” appears unrelated to the required corrective action. "
                f"Relevance score: {score}/100."
            )
            observations.append(f"Relevance assessment: UNRELATED ({score}/100)")
        elif relevance_level == "uncertain":
            recommended = list(_uncertain_recommendations(profile))
            summary = (
                f"Evidence for “{title}” is partially relevant but unclear. "
                f"Manual veterinary review recommended. Score: {score}/100."
            )
            observations.append(f"Relevance assessment: UNCERTAIN ({score}/100)")
        else:
            recommended = list(profile.aligned_actions)
            note_hits = _text_overlap(profile.note_signals, notes)
            if note_hits >= 2:
                observations.append("Farmer note aligns with the required action type.")
            summary = (
                f"Evidence for “{title}” appears relevant to the corrective action. "
                f"Relevance score: {score}/100."
            )
            observations.append(f"Relevance assessment: ALIGNED ({score}/100)")

        completeness = "partial"
        if score >= 70 and notes.strip() and not _note_is_generic(notes):
            completeness = "good"
        elif score < 45:
            completeness = "missing"

        return {
            "summary": summary,
            "observations": observations,
            "recommended_actions": recommended[:5],
            "analysis_method": "relevance-scoring",
            "relevance_level": relevance_level,
            "relevance_score": score,
            "farm_related": farm_related,
            "image_assessment": image_info.to_dict() if image_info.valid_image else None,
            "completeness": completeness,
            "disclaimer": EvidenceAnalysisService._disclaimer(),
        }

    @staticmethod
    def _score_relevance(*, profile: ActionProfile, notes: str, file_name: str, image_info) -> int:
        score = 30
        combined_text = f"{notes} {file_name}".lower()

        score += min(25, _text_overlap(profile.note_signals, combined_text) * 8)
        score += min(15, _text_overlap(FARM_FILE_HINTS, combined_text) * 5)

        if _note_is_generic(notes):
            score -= 25
        if any(h in file_name.lower() for h in UNRELATED_FILE_HINTS):
            score -= 35
        if not notes.strip():
            score -= 15

        if image_info.valid_image:
            score += 10
            if image_info.width >= 400 and image_info.height >= 300:
                score += 5
        else:
            score -= 10

        if image_info.likely_unrelated_visual:
            score -= 30
        if image_info.likely_screenshot:
            score -= 15

        return max(0, min(100, score))

    @staticmethod
    def _from_vision(vision: dict, observations: list[str], image_info, profile: ActionProfile) -> dict:
        image_desc = vision.get("imageDescription") or vision.get("image_description") or ""
        if image_desc:
            observations.append(f"AI visual inspection: {image_desc}")

        relevance = str(vision.get("relevanceToAction") or vision.get("relevance_to_action") or "low").lower()
        score = int(vision.get("relevanceScore") or vision.get("relevance_score") or 50)
        farm_related = bool(vision.get("farmRelated", vision.get("farm_related", relevance not in ("none", "low"))))

        ai_obs = vision.get("observations") or []
        if isinstance(ai_obs, list):
            observations.extend(str(o) for o in ai_obs[:4])

        recommended = vision.get("recommendedActions") or vision.get("recommended_actions") or []
        if not recommended or not isinstance(recommended, list):
            if relevance in ("none", "low"):
                recommended = _reject_recommendations(
                    profile, "AI visual inspection indicates the photo is not valid farm evidence."
                )
            elif relevance == "medium":
                recommended = _uncertain_recommendations(profile)
            else:
                recommended = list(profile.aligned_actions)

        relevance_level = (
            "aligned" if relevance == "high" else
            "uncertain" if relevance == "medium" else
            "unrelated"
        )

        return {
            "summary": (
                f"AI visual analysis completed. Relevance to “{profile.category}” action: {relevance} ({score}/100)."
            ),
            "observations": observations,
            "recommended_actions": recommended[:5],
            "analysis_method": "vision-ai",
            "relevance_level": relevance_level,
            "relevance_score": score,
            "farm_related": farm_related,
            "image_assessment": image_info.to_dict() if image_info.valid_image else None,
            "completeness": "good" if relevance == "high" else "partial" if relevance == "medium" else "missing",
            "disclaimer": EvidenceAnalysisService._disclaimer(),
        }

    @staticmethod
    def _disclaimer() -> str:
        return (
            "Aarohi analyzes uploaded evidence images and descriptions to assist veterinary review. "
            "Always apply certified veterinary judgment — this is not an automatic approval."
        )
