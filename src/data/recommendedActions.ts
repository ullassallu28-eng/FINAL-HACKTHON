import type { RecommendedAction } from "../types";

/** Client fallback when /recommended-actions is unavailable (matches backend templates). */
export function getDefaultRecommendedActions(incidentType: string): RecommendedAction[] {
  const normalized = incidentType.toLowerCase();
  const all: RecommendedAction[] = [
    {
      key: "disinfection",
      title: "Strengthen Entry Disinfection",
      description: "Apply approved disinfectant at all entry points and vehicle wheels.",
      priority: "high",
      evidenceRequired: true,
      selected: true,
    },
    {
      key: "visitors",
      title: "Restrict Non-Essential Visitors",
      description: "Suspend non-essential farm visits until corrective actions are verified.",
      priority: "high",
      evidenceRequired: true,
      selected: true,
    },
    {
      key: "isolate",
      title: "Isolate Affected Animals/Batch",
      description: "Segregate affected animals and restrict cross-shed movement.",
      priority: "urgent",
      evidenceRequired: true,
      selected: true,
    },
    {
      key: "movement",
      title: "Review Recent Animal Movement",
      description: "Audit inward/outward movement logs for the last 14 days.",
      priority: "medium",
      evidenceRequired: true,
      selected: true,
    },
    {
      key: "sanitation",
      title: "Strengthen Shed Sanitation",
      description: "Complete deep cleaning and disinfection of affected zones.",
      priority: "high",
      evidenceRequired: true,
      selected: true,
    },
    {
      key: "quarantine",
      title: "Review Quarantine Procedures",
      description: "Verify quarantine protocol compliance for new stock and returning equipment.",
      priority: "medium",
      evidenceRequired: true,
      selected: true,
    },
    {
      key: "inspection",
      title: "Schedule Follow-Up Inspection",
      description: "Prepare farm for veterinary follow-up inspection within 72 hours.",
      priority: "medium",
      evidenceRequired: false,
      selected: true,
    },
  ];

  const pick = (keys: string[]) => all.filter((a) => keys.includes(a.key));

  if (normalized.includes("mortality") || normalized.includes("death")) {
    return pick(["isolate", "sanitation", "movement", "disinfection"]);
  }
  if (normalized.includes("respiratory")) {
    return pick(["isolate", "quarantine", "visitors", "sanitation"]);
  }
  if (normalized.includes("visitor")) {
    return pick(["visitors", "disinfection", "movement"]);
  }
  if (normalized.includes("sanitation")) {
    return pick(["sanitation", "disinfection", "inspection"]);
  }
  if (normalized.includes("outbreak")) {
    return pick(["isolate", "disinfection", "visitors", "quarantine", "inspection"]);
  }
  return pick(["disinfection", "visitors", "isolate", "sanitation", "movement"]);
}
