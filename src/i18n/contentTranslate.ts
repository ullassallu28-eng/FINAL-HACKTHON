import type { TranslationDictionary } from "./types";
import en from "./locales/en";

/** Maps exact English API/UI strings to translation keys */
export const CONTENT_TO_KEY: Record<string, string> = {
  "Entry gate vehicle dip disinfected": "content.checklist.entryGate",
  "Water chlorination level verified (2.5 ppm)": "content.checklist.waterChlorine",
  "Daily mortality & morbidity logged": "content.checklist.mortalityLog",
  "Daily flock mortality & morbidity logged": "content.checklist.mortalityLogFlock",
  "Visitor digital check-in records verified": "content.checklist.visitorCheckin",
  "Shed deep sanitation protocol check": "content.checklist.shedSanitation",
  "Shed 02 deep sanitation protocol check": "content.checklist.shed02Sanitation",
  "Entry gate biosecurity check completed": "content.action.entryGateCheck",
  "Compliant": "passport.compliance.compliant",
  "Attention Required": "passport.compliance.attention",
  "Non-Compliant": "passport.compliance.nonCompliant",
  "Passed": "passport.result.passed",
  "Conditional Pass": "passport.result.conditional",
  "Needs Improvement": "passport.result.needsImprovement",
  "Sudden Mortality Increase": "incident.type.mortality",
  "Respiratory Symptoms": "incident.type.respiratory",
  "Respiratory Distress Symptoms": "incident.type.respiratory",
  "Feed / Water Contamination": "incident.type.feedWater",
  "Feed or Water Contamination": "incident.type.feedWater",
  "Perimeter Fencing / Bio-Barrier Breach": "incident.type.perimeter",
  "Unverified Visitor Entry": "incident.type.visitor",
  "Respiratory screening": "content.incident.respiratoryScreening",
  "Biosecurity equipment check": "content.incident.biosecurityEquipment",
  "Feed storage observation": "content.incident.feedStorageObservation",
  "Equipment failure": "content.incident.equipmentFailure",
  "Visitor control observation": "content.incident.visitorControlObservation",
  "Sudden High Mortality": "content.incident.suddenHighMortality",
  "Feed Discoloration & Moisture Breach": "content.incident.feedDiscoloration",
  "Observed health anomaly requiring veterinary inspection.": "incident.defaultDescription",
  "SYNTHETIC DEMO DATA: Routine inspection flagged mild respiratory signs for follow-up.":
    "content.incident.demoRespiratory",
  "SYNTHETIC DEMO DATA: Entry gate disinfection pressure was below the demonstration threshold.":
    "content.incident.demoDisinfection",
  "SYNTHETIC DEMO DATA: Routine observation flagged a minor feed-storage hygiene issue.":
    "content.incident.demoFeedStorage",
  "SYNTHETIC DEMO DATA: Reduced spray pressure detected at the vehicle disinfection gate.":
    "content.incident.demoVehicleWash",
  "SYNTHETIC DEMO DATA: Visitor records required a routine completeness check.":
    "content.incident.demoVisitorLog",
  "Sudden high fever and respiratory distress in Shed 02 grower pigs. 18 fatalities reported within 24 hours.":
    "content.incident.swineMortality",
  "Slight feed moisture contamination detected in Feed Bin 03 post heavy rainfall.":
    "content.incident.feedMoisture",
  "Shed 02 - Isolation Ward": "content.location.shed02Isolation",
  "Shed 02 - Isolation Pen B": "content.location.shed02IsolationPen",
  "Feed Storage Shed C": "content.location.feedStorageShedC",
  "Isolation area": "content.location.isolationArea",
  "Main entry gate": "content.location.mainEntryGate",
  "Feed storage": "content.location.feedStorage",
  "Vehicle entry": "content.location.vehicleEntry",
  "Visitor entry": "content.location.visitorEntry",
  "Review isolation and sanitation procedure": "content.action.reviewIsolation",
  "Verify vehicle disinfection gate": "content.action.verifyDisinfectionGate",
  "Refresh feed storage sanitation": "content.action.refreshFeedStorage",
  "Repair vehicle disinfection gate": "content.action.repairDisinfectionGate",
  "Complete visitor log verification": "content.action.completeVisitorLog",
  "Sanitize & Decontaminate Shed 02 Buffer Area": "content.action.sanitizeShed02",
  "Replace Vehicle Disinfection Basin Fluid": "content.action.replaceBasinFluid",
  "Enforce Strict Perimeter Isolation Zone": "content.action.enforcePerimeter",
  "SYNTHETIC DEMO ACTION: Review isolation and document sanitation completion.":
    "content.action.desc.reviewIsolation",
  "SYNTHETIC DEMO ACTION: Inspect and document gate operation.":
    "content.action.desc.verifyGate",
  "SYNTHETIC DEMO ACTION: Clean storage area and record completion.":
    "content.action.desc.refreshFeed",
  "SYNTHETIC DEMO ACTION: Service the spray gate and verify pressure.":
    "content.action.desc.repairGate",
  "SYNTHETIC DEMO ACTION: Verify and complete the visitor log.":
    "content.action.desc.completeVisitor",
  "Apply recommended chemical disinfectant solution across Shed 02 entry perimeter and re-verify spray log.":
    "content.action.desc.sanitizeShed02",
  "Flush current disinfection basin at Main Gate and replenish with fresh QAC disinfectant.":
    "content.action.desc.replaceBasin",
  "Install bio-secure barrier netting along South perimeter fence adjacent to regional road.":
    "content.action.desc.enforcePerimeter",
  "Nearby incident confirmed in Ramgarh sector": "content.risk.nearbyIncident",
  "Mortality rate increase (+3.2% in Shed 02)": "content.risk.mortalityIncrease",
  "Shed 02 sanitation check delay": "content.risk.shedSanitationDelay",
  "Increased vehicle movement at Entry Gate": "content.risk.vehicleMovement",
  "[DEMO] Routine monitoring factor": "content.risk.demoLabel",
  "Swine respiratory outbreak within 15km perimeter.": "content.risk.desc.nearbyOutbreak",
  "Slight elevation above historical 7-day average baseline.":
    "content.risk.desc.mortalityBaseline",
  "Sanitation log overdue by 14 hours.": "content.risk.desc.sanitationOverdue",
  "4 feed delivery vehicles logged within 3 hours.": "content.risk.desc.vehicleLog",
  "SYNTHETIC DEMO DATA for hackathon risk visualization.": "content.risk.demoDesc",
  "Shed sanitation and perimeter fencing fully compliant. Vehicle dip active.":
    "content.passport.inspectionNotes.passed",
  "Visitor logbook entry was missing digital verification code. Rectified.":
    "content.passport.inspectionNotes.conditional",
  "New Incident Reported": "notification.newIncident",
  "Evidence Submitted for Verification": "notification.evidenceSubmitted",
  "Biosecurity Score Updated": "notification.scoreUpdated",
  "Inspection Scheduled": "notification.inspectionScheduled",
  "Incident Verified by Veterinarian": "notification.title.confirmed",
  "CONFIRMED — Incident Verified by Veterinarian": "notification.title.confirmed",
  "Incident Rejected by Veterinarian": "notification.title.rejected",
  "REJECTED — Incident Not Confirmed": "notification.title.rejected",
  "REJECTED — Incident Declined by Veterinarian": "notification.title.rejected",
  "More Information Required": "notification.title.moreInfo",
  "ACTION NEEDED — More Information Required": "notification.title.moreInfo",
  "Incident Info Requested": "notification.title.moreInfo",
  "High mortality reported at Apex Swine Breeding Center (Ramgarh).":
    "notification.msg.incidentHighMortality",
  "GreenValley Bio-Farm submitted evidence for ACT-2026-104 (Disinfection Basin Refill).":
    "notification.msg.evidenceBasin",
  "GreenValley Bio-Farm biosecurity score increased to 78/100 (+4 points).":
    "notification.msg.scoreIncrease",
  "Routine biosecurity inspection assigned for SunRise Poultry Haven on Aug 14.":
    "notification.msg.inspectionSunrise",
  "Reported": "status.incident.reported",
  "Under Review": "status.incident.review",
  "Verified": "status.incident.verified",
  "More Info Required": "status.incident.moreInfo",
  "Rejected": "status.incident.rejected",
  "Pending": "status.action.pending",
  "In Progress": "status.action.inProgress",
  "Evidence Submitted": "status.action.evidenceSubmitted",
  "Awaiting Verification": "status.action.awaitingVerification",
  "Closed": "status.action.closed",
  "Unverified": "status.verification.unverified",
  "Verification Pending": "status.verification.pending",
  "Identified": "actions.status.identified",
  "Assigned": "actions.status.assigned",
};

export function translateContent(
  text: string,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (!text) return text;
  const key = CONTENT_TO_KEY[text.trim()];
  if (key) {
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return text;
}

export function mergeLocale(base: TranslationDictionary, overrides: TranslationDictionary): TranslationDictionary {
  return { ...base, ...overrides };
}

export { en };
