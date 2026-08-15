import type { CorrectiveAction, EvidenceAnalysis } from "../types";

const GENERIC_NOTES = [
  "disinfection evidence recorded and verified on site",
  "evidence uploaded",
  "test upload",
  "photo attached",
];

const UNRELATED_FILE_HINTS = [
  "meme", "cartoon", "anime", "game", "wallpaper", "logo", "avatar",
  "selfie", "food", "pizza", "burger", "celebrity", "stock", "sample", "random",
];

const FARM_HINTS = [
  "gate", "shed", "farm", "disinfect", "spray", "wheel", "visitor", "isolat",
  "vehicle", "quarantine", "sanit", "virkon", "entry", "batch",
];

type ActionProfile = {
  category: string;
  noteSignals: string[];
  expectedInPhoto: string;
  aligned: EvidenceAnalysis["recommendedActions"];
};

const PROFILES: ActionProfile[] = [
  {
    category: "disinfection",
    noteSignals: ["disinfect", "virkon", "spray", "wheel", "bath", "gate", "entry"],
    expectedInPhoto: "footbath, spray bottle, or gate disinfection setup",
    aligned: [
      { title: "Verify disinfectant concentration log", description: "Confirm approved disinfectant at correct dilution at the photographed entry point.", priority: "high" },
    ],
  },
  {
    category: "visitor",
    noteSignals: ["visitor", "register", "restrict", "entry", "sign"],
    expectedInPhoto: "visitor register, restricted entry notice, or gate signage",
    aligned: [
      { title: "Audit visitor register for last 72 hours", description: "Cross-check visitor log with evidence upload date.", priority: "high" },
    ],
  },
  {
    category: "isolation",
    noteSignals: ["isolat", "segregat", "barrier", "shed", "batch", "mortality"],
    expectedInPhoto: "segregated pen, isolation barrier, or restricted movement signage",
    aligned: [
      { title: "Confirm isolation protocol compliance", description: "Verify affected batch is physically segregated.", priority: "urgent" },
    ],
  },
];

function detectProfile(text: string): ActionProfile {
  const t = text.toLowerCase();
  if (/disinfect|decontam|virkon|footbath|wheel/.test(t)) return PROFILES[0];
  if (/visitor|visit restrict|non-essential/.test(t)) return PROFILES[1];
  if (/isolat|segregat|mortality|affected/.test(t)) return PROFILES[2];
  return {
    category: "general",
    noteSignals: ["farm", "completed", "done", "fixed", "cleaned"],
    expectedInPhoto: "clear farm scene showing the completed corrective work",
    aligned: [
      { title: "Schedule follow-up field verification", description: "Confirm on-site that corrective work matches the photo.", priority: "medium" },
    ],
  };
}

function overlap(signals: string[], text: string): number {
  const t = text.toLowerCase();
  return signals.filter((s) => t.includes(s)).length;
}

function noteIsGeneric(notes: string): boolean {
  const n = notes.trim().toLowerCase();
  if (!n) return true;
  return GENERIC_NOTES.some((g) => n.includes(g)) && n.length < 80;
}

function scoreRelevance(profile: ActionProfile, notes: string, fileName: string): number {
  let score = 30;
  const combined = `${notes} ${fileName}`.toLowerCase();
  score += Math.min(25, overlap(profile.noteSignals, combined) * 8);
  score += Math.min(15, overlap(FARM_HINTS, combined) * 5);
  if (noteIsGeneric(notes)) score -= 25;
  if (UNRELATED_FILE_HINTS.some((h) => fileName.toLowerCase().includes(h))) score -= 35;
  if (!notes.trim()) score -= 15;
  return Math.max(0, Math.min(100, score));
}

/** Client-side fallback when backend analyze endpoint is not deployed yet. */
export function analyzeEvidenceLocally(action: CorrectiveAction): EvidenceAnalysis {
  const title = action.title || "";
  const desc = action.description || "";
  const notes = action.submittedEvidence?.notes || "";
  const fileName = action.submittedEvidence?.fileName || "";
  const profile = detectProfile(`${title} ${desc}`);

  const observations: string[] = [];
  if (action.submittedEvidence) {
    observations.push(`Farmer submitted file: ${fileName}`);
    if (action.submittedEvidence.location) {
      observations.push(`Capture location: ${action.submittedEvidence.location}`);
    }
    if (notes.trim()) observations.push(`Farmer note: ${notes.trim()}`);
  } else {
    observations.push("No evidence file attached yet.");
  }
  observations.push(`Required corrective action: ${title}`);
  observations.push(`Expected photo content: ${profile.expectedInPhoto}`);

  if (!action.submittedEvidence) {
    return {
      summary: `No evidence uploaded yet for “${title}”.`,
      observations,
      recommendedActions: [
        { title: "Wait for farmer upload", description: "Farmer must upload from Corrective Actions.", priority: "medium" },
      ],
      analysisMethod: "relevance-scoring",
      relevanceLevel: "missing",
      relevanceScore: 0,
      farmRelated: false,
      disclaimer:
        "Deploy latest backend for full image pixel analysis. Always apply veterinary judgment.",
    };
  }

  const score = scoreRelevance(profile, notes, fileName);
  const relevanceLevel = score >= 70 ? "aligned" : score >= 45 ? "uncertain" : "unrelated";

  let recommended: EvidenceAnalysis["recommendedActions"];
  let summary: string;

  if (relevanceLevel === "unrelated") {
    summary = `Evidence for “${title}” appears unrelated (score ${score}/100). Reject and request a proper farm photo.`;
    observations.push(`Relevance assessment: UNRELATED (${score}/100)`);
    recommended = [
      {
        title: "Reject evidence — photo does not match required action",
        description: `Ask farmer to resubmit a clear photo showing: ${profile.expectedInPhoto}.`,
        priority: "urgent",
      },
    ];
  } else if (relevanceLevel === "uncertain") {
    summary = `Evidence for “${title}” is unclear (score ${score}/100). Request a clearer photo.`;
    observations.push(`Relevance assessment: UNCERTAIN (${score}/100)`);
    recommended = [
      {
        title: "Request clearer corrective-action photo",
        description: `Ask for a retake showing: ${profile.expectedInPhoto}.`,
        priority: "high",
      },
    ];
  } else {
    summary = `Evidence for “${title}” appears relevant (score ${score}/100).`;
    observations.push(`Relevance assessment: ALIGNED (${score}/100)`);
    recommended = profile.aligned;
  }

  return {
    summary,
    observations,
    recommendedActions: recommended,
    analysisMethod: "relevance-scoring",
    relevanceLevel,
    relevanceScore: score,
    farmRelated: relevanceLevel !== "unrelated",
    completeness: relevanceLevel === "aligned" ? "good" : relevanceLevel === "uncertain" ? "partial" : "missing",
    disclaimer:
      "Aarohi analyzes evidence to assist veterinary review. Deploy backend with OPENAI_API_KEY for full AI vision.",
  };
}

export const VET_PLAN_MARKER = "[Veterinary Action Plan]";

export function isVeterinaryActionPlan(action: CorrectiveAction): boolean {
  return (
    action.source === "veterinary_action_plan" ||
    (action.description?.includes(VET_PLAN_MARKER) ?? false)
  );
}

export function stripVetPlanMarker(description: string): string {
  return description.replace(VET_PLAN_MARKER, "").replace(/^\s+/, "").trim();
}

export function relevanceBadge(level?: EvidenceAnalysis["relevanceLevel"]): { label: string; className: string } {
  switch (level) {
    case "aligned":
      return { label: "Relevant evidence", className: "ai-relevance-aligned" };
    case "uncertain":
      return { label: "Unclear — review manually", className: "ai-relevance-uncertain" };
    case "unrelated":
      return { label: "Unrelated — likely reject", className: "ai-relevance-unrelated" };
    default:
      return { label: "Awaiting analysis", className: "ai-relevance-pending" };
  }
}
