import type { ChecklistItem, CorrectiveAction, Farm, IncidentReport } from "../../types";
import type { CachedFarmBundle, LocalHealthObservation, LocalIncidentRecord } from "../types";
import { getOfflineDb } from "./db";

export async function cacheFarmBundle(
  farmId: string,
  data: {
    farm: Farm;
    checklist?: ChecklistItem[];
    incidents?: IncidentReport[];
    correctiveActions?: CorrectiveAction[];
  }
): Promise<void> {
  const db = await getOfflineDb();
  const existing = await db.get("farmCache", farmId);
  const bundle: CachedFarmBundle = {
    farmId,
    farm: data.farm,
    checklist: data.checklist ?? existing?.checklist ?? [],
    incidents: data.incidents ?? existing?.incidents ?? [],
    correctiveActions: data.correctiveActions ?? existing?.correctiveActions ?? [],
    cachedAt: new Date().toISOString(),
  };
  await db.put("farmCache", bundle);
}

export async function getCachedFarmBundle(farmId: string): Promise<CachedFarmBundle | undefined> {
  const db = await getOfflineDb();
  return db.get("farmCache", farmId);
}

export async function getAllCachedFarmBundles(): Promise<CachedFarmBundle[]> {
  const db = await getOfflineDb();
  return db.getAll("farmCache");
}

export async function saveLocalIncident(record: LocalIncidentRecord): Promise<void> {
  const db = await getOfflineDb();
  await db.put("localIncidents", record);
  const bundle = await db.get("farmCache", record.farmId);
  if (bundle) {
    const pendingIncident: IncidentReport = {
      id: record.localId,
      farmId: record.farmId,
      farmName: record.payload.farmName,
      farmType: record.payload.farmType,
      incidentType: record.payload.incidentType,
      animalType: record.payload.animalType,
      numberAffected: record.payload.numberAffected,
      dateTime: record.payload.dateTime,
      description: record.payload.description,
      location: record.payload.location,
      evidenceFiles: record.payload.evidenceFiles ?? [],
      status: "Reported",
      severity: "medium",
    };
    await db.put("farmCache", {
      ...bundle,
      incidents: [pendingIncident, ...bundle.incidents.filter((i) => i.id !== record.localId)],
    });
  }
}

export async function getLocalIncidents(farmId?: string): Promise<LocalIncidentRecord[]> {
  const db = await getOfflineDb();
  const all = await db.getAll("localIncidents");
  return farmId ? all.filter((i) => i.farmId === farmId) : all;
}

export async function updateLocalIncident(
  localId: string,
  patch: Partial<LocalIncidentRecord>
): Promise<void> {
  const db = await getOfflineDb();
  const current = await db.get("localIncidents", localId);
  if (!current) return;
  await db.put("localIncidents", { ...current, ...patch, updatedAt: new Date().toISOString() });
}

export async function saveHealthObservation(record: LocalHealthObservation): Promise<void> {
  const db = await getOfflineDb();
  await db.put("healthObservations", record);
}

export async function updateHealthObservation(
  localId: string,
  patch: Partial<LocalHealthObservation>
): Promise<void> {
  const db = await getOfflineDb();
  const current = await db.get("healthObservations", localId);
  if (!current) return;
  await db.put("healthObservations", { ...current, ...patch });
}

export async function getHealthObservations(farmId?: string): Promise<LocalHealthObservation[]> {
  const db = await getOfflineDb();
  const all = await db.getAll("healthObservations");
  return farmId ? all.filter((h) => h.farmId === farmId) : all;
}

export async function setMeta(key: string, value: string): Promise<void> {
  const db = await getOfflineDb();
  await db.put("meta", { key, value });
}

export async function getMeta(key: string): Promise<string | undefined> {
  const db = await getOfflineDb();
  const row = await db.get("meta", key);
  return row?.value;
}
