import type {
  SimulationSnapshot,
  FarmEvent,
  EventType,
  Zone,
  Alert,
  AarohiState,
  RiskContributor,
  Visitor,
  Vehicle,
} from "../types";
import { clamp, zoneRiskLevel, farmRiskLevel } from "../utils/risk";

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

const VISITOR_NAMES = [
  "Anita Devi",
  "Manoj Kumar",
  "Sunita Toppo",
  "Ravi Prasad",
  "Kiran Bedia",
  "Ajay Singh",
  "Pooja Munda",
];
const VISITOR_ROLES = ["Feed supplier", "Egg buyer", "Milk collector", "Neighbour farmer", "Contractor", "Trainee"];
const VEHICLE_ORIGINS = [
  "Agro Feeds Pvt. Ltd., Ranchi",
  "Birsa Poultry Market",
  "District Veterinary Office",
  "Local hatchery, Kandra",
  "Cattle feed depot, Bokaro",
];
const VEHICLE_TYPES: Vehicle["vehicleType"][] = [
  "feed_truck",
  "delivery_van",
  "staff_vehicle",
  "livestock_transport",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shedZones(zones: Zone[]): Zone[] {
  return zones.filter((z) => z.type === "shed" || z.type === "isolation");
}

// Weighted pool: [eventType, weight]
const EVENT_WEIGHTS: [EventType, number][] = [
  ["visitor_entered", 10],
  ["visitor_exited", 6],
  ["vehicle_entered", 8],
  ["vehicle_exited", 5],
  ["disinfection_completed", 14],
  ["disinfection_missed", 5],
  ["health_incident", 4],
  ["vaccination_recorded", 9],
  ["animal_movement", 8],
  ["inspection_completed", 8],
  ["feed_delivery", 5],
  ["restricted_zone_entry", 4],
  ["sanitation_completed", 10],
];

function pickEventType(): EventType {
  const total = EVENT_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, weight] of EVENT_WEIGHTS) {
    if (r < weight) return type;
    r -= weight;
  }
  return "sanitation_completed";
}

interface EventResult {
  event: FarmEvent;
  zoneUpdates?: Record<string, Partial<Zone>>;
  newAlert?: Alert;
  resolveAlertId?: string;
  contributor?: RiskContributor;
  visitor?: Visitor;
  vehicle?: Vehicle;
  farmDeltas?: {
    visitorsToday?: number;
    vehiclesToday?: number;
    complianceRate?: number;
    vaccinationCoverage?: number;
    activeIncidents?: number;
  };
}

function buildEvent(
  type: EventType,
  snapshot: SimulationSnapshot
): EventResult {
  const time = new Date().toISOString();
  const zones = snapshot.zones;

  switch (type) {
    case "visitor_entered": {
      const compliant = Math.random() > 0.3;
      const name = pick(VISITOR_NAMES);
      const role = pick(VISITOR_ROLES);
      const riskDelta = compliant ? -1 : 5;
      const visitor: Visitor = {
        id: nextId("vis"),
        name,
        role,
        entryTime: time,
        previousFarmExposure: Math.random() > 0.5,
        daysSinceLastFarmVisit: Math.random() > 0.5 ? Math.floor(Math.random() * 10) : null,
        handHygieneCompleted: compliant,
        footwearDisinfected: compliant,
        ppeCompliant: compliant || Math.random() > 0.5,
        zonesVisited: ["gate"],
        riskLevel: compliant ? "safe" : "caution",
      };
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: "gate",
          zoneName: "Entry Gate",
          title: "Visitor entered",
          description: compliant
            ? `${name} (${role}) completed hand hygiene and footwear disinfection.`
            : `${name} (${role}) entered without completing disinfection steps.`,
          status: compliant ? "ok" : "warning",
          riskDelta,
        },
        visitor,
        farmDeltas: { visitorsToday: 1 },
        contributor: !compliant
          ? { id: nextId("rc"), label: "Visitor entered without disinfection", delta: riskDelta, time }
          : undefined,
      };
    }

    case "visitor_exited": {
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: "gate",
          zoneName: "Entry Gate",
          title: "Visitor exited",
          description: "A visitor left the farm through the main gate.",
          status: "ok",
          riskDelta: 0,
        },
      };
    }

    case "vehicle_entered": {
      const washed = Math.random() > 0.4;
      const vType = pick(VEHICLE_TYPES);
      const origin = pick(VEHICLE_ORIGINS);
      const plate = `JH-${String(Math.floor(Math.random() * 90) + 10)}-${String(
        Math.floor(Math.random() * 9000) + 1000
      )}`;
      const riskDelta = washed ? -1 : 8;
      const vehicle: Vehicle = {
        id: plate,
        vehicleType: vType,
        entryTime: time,
        origin,
        disinfectionCompleted: washed,
        zonesEntered: ["gate"],
        riskLevel: washed ? "safe" : "caution",
      };
      const result: EventResult = {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: "gate",
          zoneName: "Entry Gate",
          title: "Vehicle entered",
          description: washed
            ? `${vType.replace("_", " ")} ${plate} from ${origin} completed the wash point.`
            : `${vType.replace("_", " ")} ${plate} from ${origin} entered without a recorded wash.`,
          status: washed ? "ok" : "warning",
          riskDelta,
        },
        vehicle,
        farmDeltas: { vehiclesToday: 1 },
        contributor: !washed
          ? { id: nextId("rc"), label: "Vehicle entered without wash", delta: riskDelta, time }
          : undefined,
      };
      if (!washed && Math.random() > 0.5) {
        result.newAlert = {
          id: nextId("alrt"),
          severity: "high",
          status: "active",
          title: "Vehicle entered without wash",
          location: "Entry Gate",
          zoneId: "gate",
          description: `${plate} entered from ${origin} without a recorded disinfection.`,
          why: "A vehicle coming from another farm or market can carry disease on its wheels and body.",
          recommendedActions: [
            "Check the vehicle before it goes near any shed",
            "Wash and disinfect the vehicle now",
            "Remind the driver about the wash point next time",
          ],
          createdAt: time,
        };
      }
      return result;
    }

    case "vehicle_exited": {
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: "gate",
          zoneName: "Entry Gate",
          title: "Vehicle left the farm",
          description: "A vehicle exited through the main gate.",
          status: "ok",
          riskDelta: 0,
        },
      };
    }

    case "disinfection_completed": {
      const zone = pick(zones.filter((z) => z.type !== "isolation"));
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Disinfection completed",
          description: `Wash and disinfection step completed near ${zone.name}.`,
          status: "ok",
          riskDelta: -3,
        },
        zoneUpdates: { [zone.id]: { riskScore: clamp(zone.riskScore - 4), complianceRate: clamp(zone.complianceRate + 2) } },
        farmDeltas: { complianceRate: 1 },
      };
    }

    case "disinfection_missed": {
      const zone = pick(zones.filter((z) => z.type === "entry_gate" || z.type === "disinfection"));
      const riskDelta = 6;
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Disinfection not recorded",
          description: `No disinfection was recorded at ${zone.name} for the last entry.`,
          status: "warning",
          riskDelta,
        },
        zoneUpdates: { [zone.id]: { riskScore: clamp(zone.riskScore + 8), complianceRate: clamp(zone.complianceRate - 4) } },
        contributor: { id: nextId("rc"), label: "Disinfection step missed", delta: riskDelta, time },
        farmDeltas: { complianceRate: -1 },
      };
    }

    case "health_incident": {
      const zone = pick(shedZones(zones));
      const affected = Math.floor(Math.random() * 3) + 1;
      const riskDelta = 12;
      const before = zone.riskScore;
      const after = clamp(before + 18);
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Health incident detected",
          description: `${affected} animal${affected > 1 ? "s" : ""} showing symptoms in ${zone.name}.`,
          status: "critical",
          riskDelta,
        },
        zoneUpdates: { [zone.id]: { riskScore: after, notes: `${affected} animals under observation.` } },
        contributor: { id: nextId("rc"), label: `Health incident — ${zone.name}`, delta: riskDelta, time },
        newAlert: {
          id: nextId("alrt"),
          severity: "critical",
          status: "active",
          title: `${zone.name} health incident`,
          location: zone.name,
          zoneId: zone.id,
          description: `${affected} animal${affected > 1 ? "s" : ""} showing symptoms.`,
          why: "Untreated symptoms can spread quickly through a shed and to nearby zones.",
          recommendedActions: [
            `Keep ${zone.name} separate from other sheds`,
            "Stop animal movement in and out of this zone",
            "Call the veterinary officer today",
          ],
          createdAt: time,
          riskBefore: before,
          riskAfter: after,
        },
        farmDeltas: { activeIncidents: 1 },
      };
    }

    case "vaccination_recorded": {
      const zone = pick(shedZones(zones));
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Vaccination recorded",
          description: `Scheduled vaccination completed for animals in ${zone.name}.`,
          status: "ok",
          riskDelta: -2,
        },
        zoneUpdates: { [zone.id]: { riskScore: clamp(zone.riskScore - 3) } },
        farmDeltas: { vaccinationCoverage: 0.4 },
      };
    }

    case "animal_movement": {
      const zone = pick(shedZones(zones));
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Animal movement recorded",
          description: `Routine movement of animals logged near ${zone.name}.`,
          status: "ok",
          riskDelta: 1,
        },
        zoneUpdates: { [zone.id]: { riskScore: clamp(zone.riskScore + 1) } },
      };
    }

    case "inspection_completed": {
      const zone = pick(zones);
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Biosecurity inspection completed",
          description: `Routine inspection completed at ${zone.name}. No major issues found.`,
          status: "ok",
          riskDelta: -2,
        },
        zoneUpdates: {
          [zone.id]: { riskScore: clamp(zone.riskScore - 3), lastInspection: time, complianceRate: clamp(zone.complianceRate + 3) },
        },
        farmDeltas: { complianceRate: 1 },
      };
    }

    case "feed_delivery": {
      const zone = zones.find((z) => z.type === "feed_storage")!;
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Feed delivery received",
          description: `New feed stock delivered to ${zone.name}.`,
          status: "ok",
          riskDelta: 1,
        },
        zoneUpdates: { [zone.id]: { riskScore: clamp(zone.riskScore + 1) } },
      };
    }

    case "restricted_zone_entry": {
      const zone = zones.find((z) => z.type === "restricted")!;
      const riskDelta = 7;
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Entry into restricted area",
          description: "A visitor walked into the restricted area without an escort.",
          status: "warning",
          riskDelta,
        },
        zoneUpdates: { [zone.id]: { riskScore: clamp(zone.riskScore + 10) } },
        contributor: { id: nextId("rc"), label: "Restricted-zone entry", delta: riskDelta, time },
        newAlert: {
          id: nextId("alrt"),
          severity: "medium",
          status: "active",
          title: "Visitor entered restricted zone",
          location: zone.name,
          zoneId: zone.id,
          description: "A visitor entered the restricted area without an escort.",
          why: "The restricted area is close to sensitive zones and needs controlled access.",
          recommendedActions: ["Escort all visitors near the restricted area", "Add a clearer boundary sign"],
          createdAt: time,
        },
      };
    }

    case "sanitation_completed": {
      const zone = pick(zones.filter((z) => z.type === "shed"));
      return {
        event: {
          id: nextId("evt"),
          type,
          time,
          zoneId: zone.id,
          zoneName: zone.name,
          title: "Routine sanitation completed",
          description: `Shed cleaning and sanitation completed for ${zone.name}.`,
          status: "ok",
          riskDelta: -3,
        },
        zoneUpdates: { [zone.id]: { riskScore: clamp(zone.riskScore - 5), complianceRate: clamp(zone.complianceRate + 3) } },
        farmDeltas: { complianceRate: 1 },
      };
    }
  }
}

function pickAarohi(snapshot: SimulationSnapshot, lastEvent: FarmEvent): AarohiState {
  if (lastEvent.status === "critical") {
    return {
      mood: "critical",
      message:
        lastEvent.type === "health_incident"
          ? `There's a problem at ${lastEvent.zoneName}. Keep this shed separate and inform the veterinary officer.`
          : `Immediate attention needed at ${lastEvent.zoneName}.`,
    };
  }
  if (lastEvent.status === "warning") {
    return {
      mood: "concerned",
      message:
        lastEvent.type === "vehicle_entered"
          ? "The delivery vehicle entered without a recorded wash. Please check it before it goes near the sheds."
          : `A small issue was found near ${lastEvent.zoneName ?? "the farm"}. Let's keep an eye on it.`,
    };
  }
  const level = farmRiskLevel(snapshot.farm.biosecurityScore);
  if (level === "safe") {
    return { mood: "happy", message: "Good job! Your farm is in a safe state right now." };
  }
  if (level === "caution") {
    return { mood: "thinking", message: "A small biosecurity issue was detected. Let's keep watching it." };
  }
  return { mood: "critical", message: "Risk is high right now. Please review the active warnings." };
}

export function applyRandomEvent(snapshot: SimulationSnapshot): SimulationSnapshot {
  const type = pickEventType();
  const result = buildEvent(type, snapshot);
  const { event } = result;

  // Apply zone updates
  let zones = snapshot.zones;
  if (result.zoneUpdates) {
    zones = zones.map((z) => {
      const patch = result.zoneUpdates?.[z.id];
      if (!patch) return z;
      const merged = { ...z, ...patch };
      merged.risk = zoneRiskLevel(merged.riskScore);
      return merged;
    });
  }

  // Update farm score: biosecurity score is inverse of net risk delta
  const prevScore = snapshot.farm.biosecurityScore;
  const nextScore = clamp(prevScore - event.riskDelta);

  const farm = {
    ...snapshot.farm,
    previousScore: prevScore,
    biosecurityScore: nextScore,
    riskLevel: farmRiskLevel(nextScore),
    visitorsToday: snapshot.farm.visitorsToday + (result.farmDeltas?.visitorsToday ?? 0),
    vehiclesToday: snapshot.farm.vehiclesToday + (result.farmDeltas?.vehiclesToday ?? 0),
    complianceRate: clamp(snapshot.farm.complianceRate + (result.farmDeltas?.complianceRate ?? 0)),
    vaccinationCoverage: clamp(snapshot.farm.vaccinationCoverage + (result.farmDeltas?.vaccinationCoverage ?? 0)),
    activeIncidents: Math.max(0, snapshot.farm.activeIncidents + (result.farmDeltas?.activeIncidents ?? 0)),
    updatedAt: event.time,
  };
  farm.activeAlerts = snapshot.alerts.filter((a) => a.status === "active").length + (result.newAlert ? 1 : 0);

  const events = [event, ...snapshot.events].slice(0, 40);
  const alerts = result.newAlert ? [result.newAlert, ...snapshot.alerts] : snapshot.alerts;
  const riskHistory = [...snapshot.riskHistory, { time: event.time, score: nextScore }].slice(-48);
  const riskContributors = result.contributor
    ? [result.contributor, ...snapshot.riskContributors].slice(0, 8)
    : snapshot.riskContributors;
  const visitors = result.visitor ? [result.visitor, ...snapshot.visitors].slice(0, 20) : snapshot.visitors;
  const vehicles = result.vehicle ? [result.vehicle, ...snapshot.vehicles].slice(0, 20) : snapshot.vehicles;

  const aarohi = pickAarohi({ ...snapshot, farm }, event);

  return {
    ...snapshot,
    farm,
    zones,
    events,
    alerts,
    riskHistory,
    riskContributors,
    visitors,
    vehicles,
    aarohi,
    tickCount: snapshot.tickCount + 1,
  };
}
