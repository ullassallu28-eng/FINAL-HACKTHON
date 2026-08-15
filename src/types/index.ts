export type RiskLevel = "safe" | "caution" | "critical" | "low" | "medium" | "high";
export type UserRole = "farmer" | "veterinarian" | "officer";
export type FarmType = "poultry" | "pig" | "mixed";

export type EventStatus = "ok" | "warning" | "critical";

export type EventType =
  | "visitor_entered"
  | "visitor_exited"
  | "vehicle_entered"
  | "vehicle_exited"
  | "disinfection_completed"
  | "disinfection_missed"
  | "health_incident"
  | "vaccination_recorded"
  | "animal_movement"
  | "inspection_completed"
  | "feed_delivery"
  | "restricted_zone_entry"
  | "sanitation_completed";

export type ZoneType =
  | "shed"
  | "isolation"
  | "entry_gate"
  | "disinfection"
  | "feed_storage"
  | "restricted"
  | "water"
  | "office";

export interface Farm {
  id: string;
  name: string;
  location: string;
  owner: string;
  farmType: FarmType;
  capacity: number;
  animalCount: number;
  biosecurityScore: number;
  previousScore: number;
  riskLevel: RiskLevel;
  visitorsToday: number;
  vehiclesToday: number;
  complianceRate: number;
  vaccinationCoverage: number;
  activeIncidents: number;
  activeAlerts: number;
  updatedAt: string;
  coordinates?: { lat: number; lng: number };
}

export interface BiosecurityPassport {
  farmId: string;
  farmName: string;
  farmType: FarmType;
  ownerName: string;
  location: string;
  capacity: number;
  animalCount: number;
  biosecurityScore: number;
  hygieneScore: number;
  visitorControlScore: number;
  quarantineProtocolScore: number;
  vaccinationCoverage: number;
  wasteManagementScore: number;
  lastInspectionDate: string;
  inspectionHistory: {
    id: string;
    date: string;
    inspectorName: string;
    result: "Passed" | "Conditional Pass" | "Needs Improvement";
    notes: string;
  }[];
  complianceStatus: "Compliant" | "Attention Required" | "Non-Compliant";
  riskTrend: "improving" | "stable" | "deteriorating";
  passportQrCode: string;
  issueDate: string;
}

export type IncidentStatus = "Reported" | "Under Review" | "Verified" | "More Info Required" | "Rejected";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface IncidentReport {
  id: string;
  farmId: string;
  farmName: string;
  farmType: FarmType;
  incidentType: string;
  animalType: string;
  numberAffected: number;
  dateTime: string;
  description: string;
  location: string;
  evidenceFiles: { name: string; url: string; timestamp: string }[];
  status: IncidentStatus;
  severity: IncidentSeverity;
  veterinarianNotes?: string;
  requestedInfoNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export type CorrectiveActionStatus =
  | "Pending"
  | "In Progress"
  | "Evidence Submitted"
  | "Awaiting Verification"
  | "Verified"
  | "Closed";

export interface CorrectiveAction {
  id: string;
  farmId: string;
  farmName: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  assignedPerson: string;
  deadline: string;
  createdAt?: string;
  status: CorrectiveActionStatus;
  evidenceRequired: boolean;
  verificationStatus: "Unverified" | "Verification Pending" | "Verified";
  incidentId?: string;
  source?: "general" | "veterinary_action_plan";
  sourceType?: "incident" | "assessment" | "inspection" | "compliance";
  sourceLabel?: string;
  submittedEvidence?: {
    fileUrl: string;
    fileName: string;
    timestamp: string;
    location: string;
    notes: string;
  };
  evidenceAnalysis?: EvidenceAnalysis;
}

export interface EvidenceAnalysis {
  summary: string;
  observations: string[];
  recommendedActions: Array<{
    title: string;
    description: string;
    priority: string;
  }>;
  analysisMethod: string;
  disclaimer: string;
  completeness?: "missing" | "partial" | "good";
  relevanceLevel?: "aligned" | "uncertain" | "unrelated" | "missing";
  relevanceScore?: number;
  farmRelated?: boolean;
  imageAssessment?: {
    validImage?: boolean;
    width?: number;
    height?: number;
    likelyUnrelatedVisual?: boolean;
  };
}

export interface RiskSummary {
  farmId: string;
  biosecurityScore: number;
  previousScore: number;
  riskLevel: RiskLevel;
  scoreDelta7d: number;
  riskTrend: "improving" | "stable" | "deteriorating";
}

export interface ScoreTimelineEvent {
  time: string;
  eventType: string;
  label: string;
  score: number;
  referenceId: string;
}

export interface RecommendedAction {
  key: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  evidenceRequired: boolean;
  selected: boolean;
}

export interface ActionPlanItem {
  title: string;
  description: string;
  priority: string;
  assignedPerson?: string;
  deadline: string;
  evidenceRequired: boolean;
  veterinaryNote?: string;
}

export interface SpatialRiskFarm {
  id: string;
  name: string;
  farmType: FarmType;
  riskLevel: RiskLevel;
  score: number;
  distanceKm: number;
}

export interface ContainmentZone {
  id: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  reason: string;
  active: boolean;
}

export interface SpatialRiskResponse {
  centerFarmId: string;
  radiusKm: number;
  nearbyIncidents: number;
  nearbyHighRiskFarms: SpatialRiskFarm[];
  containmentZones: ContainmentZone[];
  regionalContext: string;
}

export interface InspectionPriorityFarm extends Farm {
  priorityRank: number;
  priorityReasons: string[];
}

export interface RiskFactor {
  id: string;
  label: string;
  delta: number;
  category: "incident" | "mortality" | "sanitation" | "visitor" | "environment";
  description: string;
}

export interface GisMapNode {
  id: string;
  name: string;
  farmType: FarmType;
  riskLevel: RiskLevel;
  score: number;
  lat: number;
  lng: number;
  activeIncidents: number;
  owner: string;
  contact: string;
  lastInspection: string;
}

export interface OfficerStats {
  totalRegisteredFarms: number;
  highRiskFarms: number;
  mediumRiskFarms: number;
  lowRiskFarms: number;
  openIncidents: number;
  pendingVerifications: number;
  pendingInspections: number;
  openCorrectiveActions: number;
}

export interface ScheduledInspection {
  id: string;
  farmId: string;
  farmName?: string;
  status: string;
  scheduledAt: string;
  inspectorName?: string;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: "incident" | "risk" | "verification" | "corrective" | "evidence" | "inspection";
  read: boolean;
  targetRole: UserRole | "all";
  actionUrl?: string;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  riskScore: number;
  risk: RiskLevel;
  complianceRate: number;
  animalCount?: number;
  notes?: string;
  lastInspection?: string;
}

export interface FarmEvent {
  id: string;
  type: EventType;
  time: string;
  zoneId: string;
  zoneName: string;
  title: string;
  description: string;
  status: EventStatus;
  riskDelta: number;
}

export interface Alert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "active" | "resolved";
  title: string;
  location: string;
  zoneId: string;
  description: string;
  why: string;
  recommendedActions: string[];
  createdAt: string;
  riskBefore?: number;
  riskAfter?: number;
}

export interface RiskContributor {
  id: string;
  label: string;
  delta: number;
  time: string;
}

export interface Visitor {
  id: string;
  name: string;
  role: string;
  entryTime: string;
  previousFarmExposure: boolean;
  daysSinceLastFarmVisit: number | null;
  handHygieneCompleted: boolean;
  footwearDisinfected: boolean;
  ppeCompliant: boolean;
  zonesVisited: string[];
  riskLevel: RiskLevel;
}

export interface Vehicle {
  id: string;
  vehicleType:
    | "feed_truck"
    | "delivery_van"
    | "staff_vehicle"
    | "livestock_transport";
  entryTime: string;
  origin: string;
  disinfectionCompleted: boolean;
  zonesEntered: string[];
  riskLevel: RiskLevel;
}

export interface AnimalBatch {
  id: string;
  name: string;
  species: string;
  count: number;
  zoneId: string;
  healthStatus: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  priority?: "normal" | "important" | "urgent";
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface AarohiState {
  mood: "happy" | "thinking" | "concerned" | "critical";
  message: string;
}

export interface RiskHistoryPoint {
  time: string;
  score: number;
}

export interface SimulationSnapshot {
  farm: Farm;
  zones: Zone[];
  events: FarmEvent[];
  alerts: Alert[];
  riskHistory: RiskHistoryPoint[];
  riskContributors: RiskContributor[];
  visitors: Visitor[];
  vehicles: Vehicle[];
  batches: AnimalBatch[];
  checklist: ChecklistItem[];
  recommendations: Recommendation[];
  aarohi: AarohiState;
  isRunning: boolean;
  speed: 1 | 2 | 5;
  tickCount: number;
}