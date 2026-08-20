import type { IncidentReport } from "../../types";
import {
  correctiveActionService,
  farmService,
  incidentService,
} from "../../services/api";
import { connectivityService } from "../connectivity/connectivityService";
import { deleteBlob, getBlob } from "../storage/blobStore";
import { getOperation, listOperations, updateOperation } from "../queue/operationQueue";
import { setMeta, updateLocalIncident } from "../storage/cacheStore";
import type { SyncOperation, SyncSummary } from "../types";
import { backoffMs, isRetryableError, MAX_RETRIES } from "./retryPolicy";

type SyncListener = (summary: SyncSummary) => void;

class SyncEngine {
  private running = false;
  private listeners = new Set<SyncListener>();

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    void this.getSummary().then(listener);
    return () => this.listeners.delete(listener);
  }

  async getSummary(): Promise<SyncSummary> {
    const ops = await listOperations();
    const pending = ops.filter((o) => o.status === "PENDING").length;
    const syncing = ops.filter((o) => o.status === "SYNCING").length;
    const synced = ops.filter((o) => o.status === "SYNCED").length;
    const failed = ops.filter((o) => o.status === "FAILED").length;
    const conflicts = ops.filter((o) => o.status === "CONFLICT").length;
    const lastSyncedAt = (await import("../storage/cacheStore")).getMeta("lastSyncedAt");
    return {
      pending,
      syncing,
      synced,
      failed,
      conflicts,
      isSyncing: this.running,
      lastSyncedAt: await lastSyncedAt,
    };
  }

  private async notify() {
    const summary = await this.getSummary();
    this.listeners.forEach((l) => l(summary));
  }

  async runSync(): Promise<void> {
    if (this.running) return;
    await connectivityService.refresh();
    if (!connectivityService.canSync()) return;

    this.running = true;
    await this.notify();

    try {
      const ops = await listOperations();
      const pending = ops.filter((o) => o.status === "PENDING" || o.status === "FAILED");

      for (const op of pending) {
        if (op.status === "FAILED" && op.retryCount >= MAX_RETRIES) continue;
        if (op.status === "FAILED" && op.lastAttemptAt) {
          const wait = backoffMs(op.retryCount);
          const elapsed = Date.now() - new Date(op.lastAttemptAt).getTime();
          if (elapsed < wait) continue;
        }

        if (op.dependsOnLocalOperationId) {
          const dep = await getOperation(op.dependsOnLocalOperationId);
          if (!dep || dep.status !== "SYNCED") continue;
        }

        await this.processOne(op);
      }

      await setMeta("lastSyncedAt", new Date().toISOString());
    } finally {
      this.running = false;
      await this.notify();
    }
  }

  private async processOne(op: SyncOperation): Promise<void> {
    await updateOperation(op.localOperationId, { status: "SYNCING", lastAttemptAt: new Date().toISOString() });
    await this.notify();

    try {
      switch (op.operationType) {
        case "incident.create":
          await this.syncIncidentCreate(op);
          break;
        case "incident.evidence.upload":
          await this.syncIncidentEvidence(op);
          break;
        case "checklist.update":
          await this.syncChecklistUpdate(op);
          break;
        case "evidence.submit":
          await this.syncEvidenceSubmit(op);
          break;
        case "health.observation.create":
          await this.syncHealthObservation(op);
          break;
        default:
          throw new Error(`Unknown operation type: ${op.operationType}`);
      }
      await updateOperation(op.localOperationId, { status: "SYNCED", lastError: undefined });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      const current = await getOperation(op.localOperationId);
      if (current?.status === "CONFLICT") {
        await this.notify();
        return;
      }
      const retryable = isRetryableError(err);
      await updateOperation(op.localOperationId, {
        status: "FAILED",
        retryCount: retryable ? op.retryCount + 1 : MAX_RETRIES,
        lastError: message,
      });

      if (op.operationType === "incident.create") {
        await updateLocalIncident(op.entityLocalId, {
          syncStatus: "FAILED",
          lastError: message,
        });
      }
    }
    await this.notify();
  }

  private async syncIncidentCreate(op: SyncOperation): Promise<void> {
    const payload = op.payload as { incident: Omit<IncidentReport, "id" | "status" | "severity"> };
    let file: File | undefined;
    if (op.blobId) {
      const blobRec = await getBlob(op.blobId);
      if (blobRec) {
        file = new File([blobRec.data], blobRec.fileName, { type: blobRec.mimeType });
      }
    }
    const result = await incidentService.submitIncident(payload.incident, file, op.idempotencyKey);
    await updateOperation(op.localOperationId, { serverId: result.id });
    await updateLocalIncident(op.entityLocalId, {
      serverId: result.id,
      syncStatus: "SERVER_CONFIRMED",
    });
    if (op.blobId) await deleteBlob(op.blobId);
  }

  private async syncIncidentEvidence(_op: SyncOperation): Promise<void> {
    throw new Error("Incident evidence is uploaded with incident.create in a single request.");
  }

  private async syncChecklistUpdate(op: SyncOperation): Promise<void> {
    const { farmId, itemId, completed, cachedCompleted } = op.payload as {
      farmId: string;
      itemId: string;
      completed: boolean;
      cachedCompleted?: boolean;
    };
    try {
      await farmService.updateChecklistItem(farmId, itemId, completed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("404") || msg.includes("not found")) {
        await updateOperation(op.localOperationId, {
          status: "CONFLICT",
          lastError: "Update conflict — checklist item may have changed on server. Review required.",
        });
        throw err;
      }
      if (cachedCompleted !== undefined && msg.includes("409")) {
        await updateOperation(op.localOperationId, { status: "CONFLICT", lastError: msg });
        throw err;
      }
      throw err;
    }
  }

  private async syncEvidenceSubmit(op: SyncOperation): Promise<void> {
    if (!op.blobId) throw new Error("Missing evidence blob");
    const blobRec = await getBlob(op.blobId);
    if (!blobRec) throw new Error("Evidence blob not found locally");
    const actionId = op.payload.actionId as string;
    const notes = (op.payload.notes as string) || "";
    const location = (op.payload.location as string) || "";
    const file = new File([blobRec.data], blobRec.fileName, { type: blobRec.mimeType });
    await correctiveActionService.submitEvidence(actionId, { file, notes, location }, op.idempotencyKey);
    await deleteBlob(op.blobId);
  }

  private async syncHealthObservation(op: SyncOperation): Promise<void> {
    const payload = op.payload as {
      farmId: string;
      observationType: string;
      value: string;
      notes: string;
      animalBatch?: string;
    };
    const { healthRecordService } = await import("../../services/api");
    const result = await healthRecordService.createRecord(payload.farmId, {
      animalType: payload.observationType,
      healthStatus: payload.value,
      notes: payload.notes,
      batchName: payload.animalBatch,
    }, op.idempotencyKey);
    await updateOperation(op.localOperationId, { serverId: result.id });
    const { updateHealthObservation } = await import("../storage/cacheStore");
    await updateHealthObservation(op.entityLocalId, {
      serverId: result.id,
      syncStatus: "SERVER_CONFIRMED",
    });
  }

  async retryFailed(): Promise<void> {
    const failed = await listOperations("FAILED");
    for (const op of failed) {
      await updateOperation(op.localOperationId, { status: "PENDING", retryCount: 0 });
    }
    await this.runSync();
  }
}

export const syncEngine = new SyncEngine();
