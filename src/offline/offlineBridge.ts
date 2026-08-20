import type { ChecklistItem, CorrectiveAction, Farm, IncidentReport } from "../types";
import { connectivityService } from "./connectivity/connectivityService";
import { generateLocalId, generateOperationId } from "./id";
import { enqueueOperation } from "./queue/operationQueue";
import { syncEngine } from "./sync/syncEngine";
import {
  cacheFarmBundle,
  getCachedFarmBundle,
  saveHealthObservation,
  saveLocalIncident,
} from "./storage/cacheStore";
import { storeBlob } from "./storage/blobStore";
import type { LocalIncidentRecord } from "./types";

export async function isOnlineForSync(): Promise<boolean> {
  const state = await connectivityService.refresh();
  return state === "ONLINE";
}

export async function cacheAfterOnlineFetch(
  farmId: string,
  partial: {
    farm?: Farm;
    checklist?: ChecklistItem[];
    incidents?: IncidentReport[];
    correctiveActions?: CorrectiveAction[];
  }
): Promise<void> {
  const existing = await getCachedFarmBundle(farmId);
  const farm = partial.farm ?? existing?.farm;
  if (!farm) return;
  await cacheFarmBundle(farmId, {
    farm,
    checklist: partial.checklist,
    incidents: partial.incidents,
    correctiveActions: partial.correctiveActions,
  });
}

export async function getCachedChecklist(farmId: string): Promise<ChecklistItem[] | null> {
  const bundle = await getCachedFarmBundle(farmId);
  return bundle?.checklist ?? null;
}

export async function getCachedIncidents(farmId: string): Promise<IncidentReport[] | null> {
  const bundle = await getCachedFarmBundle(farmId);
  if (!bundle) return null;
  const { getLocalIncidents } = await import("./storage/cacheStore");
  const local = await getLocalIncidents(farmId);
  const pendingAsIncidents: IncidentReport[] = local
    .filter((l) => l.syncStatus !== "SERVER_CONFIRMED")
    .map((l) => ({
      id: l.localId,
      farmId: l.farmId,
      farmName: l.payload.farmName,
      farmType: l.payload.farmType,
      incidentType: l.payload.incidentType,
      animalType: l.payload.animalType,
      numberAffected: l.payload.numberAffected,
      dateTime: l.payload.dateTime,
      description: l.payload.description,
      location: l.payload.location,
      evidenceFiles: l.payload.evidenceFiles ?? [],
      status: "Reported" as const,
      severity: "medium" as const,
    }));
  return [...pendingAsIncidents, ...bundle.incidents];
}

export async function getCachedCorrectiveActions(farmId: string): Promise<CorrectiveAction[] | null> {
  const bundle = await getCachedFarmBundle(farmId);
  return bundle?.correctiveActions ?? null;
}

export async function queueIncidentOffline(
  incident: Omit<IncidentReport, "id" | "status" | "severity">,
  evidenceFile?: File | null
): Promise<{ localId: string; localOperationId: string }> {
  const localId = generateLocalId("LOCAL-INC");
  const localOperationId = generateOperationId();
  let evidenceBlobId: string | undefined;
  let evidenceFileName: string | undefined;

  if (evidenceFile) {
    const blob = await storeBlob({
      file: evidenceFile,
      entityLocalId: localId,
      entityType: "incident",
    });
    evidenceBlobId = blob.blobId;
    evidenceFileName = blob.fileName;
  }

  const record: LocalIncidentRecord = {
    localId,
    farmId: incident.farmId,
    payload: {
      ...incident,
      evidenceFiles: evidenceFile
        ? [{ name: evidenceFile.name, url: "#", timestamp: new Date().toISOString() }]
        : [],
      evidenceBlobId,
      evidenceFileName,
    },
    syncStatus: "PENDING_SYNC",
    localOperationId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveLocalIncident(record);
  await enqueueOperation({
    localOperationId,
    operationType: "incident.create",
    entityType: "incident",
    entityLocalId: localId,
    blobId: evidenceBlobId,
    payload: { incident },
  });

  return { localId, localOperationId };
}

export async function queueChecklistUpdateOffline(
  farmId: string,
  itemId: string,
  completed: boolean,
  previousCompleted: boolean
): Promise<string> {
  const localOperationId = generateOperationId();
  await enqueueOperation({
    localOperationId,
    operationType: "checklist.update",
    entityType: "checklist",
    entityLocalId: itemId,
    payload: { farmId, itemId, completed, cachedCompleted: previousCompleted },
  });

  const bundle = await getCachedFarmBundle(farmId);
  if (bundle) {
    await cacheFarmBundle(farmId, {
      farm: bundle.farm,
      checklist: bundle.checklist.map((item) =>
        item.id === itemId ? { ...item, completed } : item
      ),
    });
  }
  return localOperationId;
}

export async function queueEvidenceSubmitOffline(input: {
  actionId: string;
  file: File;
  notes: string;
  location: string;
}): Promise<string> {
  const localOperationId = generateOperationId();
  const entityLocalId = generateLocalId("LOCAL-EV");
  const blob = await storeBlob({
    file: input.file,
    entityLocalId,
    entityType: "corrective_evidence",
  });

  await enqueueOperation({
    localOperationId,
    operationType: "evidence.submit",
    entityType: "corrective_action",
    entityLocalId,
    blobId: blob.blobId,
    payload: {
      actionId: input.actionId,
      notes: input.notes,
      location: input.location,
    },
  });
  return localOperationId;
}

export async function queueHealthObservationOffline(input: {
  farmId: string;
  observationType: string;
  value: string;
  notes: string;
  animalBatch?: string;
}): Promise<string> {
  const localId = generateLocalId("LOCAL-HLT");
  const localOperationId = generateOperationId();
  const now = new Date().toISOString();

  await saveHealthObservation({
    localId,
    farmId: input.farmId,
    observationType: input.observationType,
    value: input.value,
    notes: input.notes,
    observedAt: now,
    animalBatch: input.animalBatch,
    syncStatus: "PENDING_SYNC",
    localOperationId,
    createdAt: now,
  });

  await enqueueOperation({
    localOperationId,
    operationType: "health.observation.create",
    entityType: "health_observation",
    entityLocalId: localId,
    payload: { ...input },
  });
  return localOperationId;
}

export async function triggerSync(): Promise<void> {
  await syncEngine.runSync();
}

export { connectivityService, syncEngine };
