import type { ChecklistItem, CorrectiveAction, Farm, IncidentReport } from "../types";

export type ConnectivityState =
  | "ONLINE"
  | "OFFLINE"
  | "CHECKING_CONNECTION"
  | "ONLINE_BUT_SERVER_UNREACHABLE";

export type SyncOperationStatus = "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";

export type LocalEntityStatus =
  | "LOCAL_ONLY"
  | "PENDING_SYNC"
  | "SYNCING"
  | "SERVER_CONFIRMED"
  | "FAILED"
  | "CONFLICT";

export type SyncOperationType =
  | "incident.create"
  | "incident.evidence.upload"
  | "checklist.update"
  | "evidence.submit"
  | "health.observation.create";

export interface SyncOperation {
  localOperationId: string;
  idempotencyKey: string;
  operationType: SyncOperationType;
  entityType: string;
  entityLocalId: string;
  createdAt: string;
  updatedAt: string;
  payload: Record<string, unknown>;
  status: SyncOperationStatus;
  retryCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  serverId?: string;
  dependsOnLocalOperationId?: string;
  blobId?: string;
}

export interface LocalIncidentRecord {
  localId: string;
  serverId?: string;
  farmId: string;
  payload: Omit<IncidentReport, "id" | "status" | "severity"> & {
    evidenceBlobId?: string;
    evidenceFileName?: string;
  };
  syncStatus: LocalEntityStatus;
  localOperationId: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface LocalHealthObservation {
  localId: string;
  serverId?: string;
  farmId: string;
  observationType: string;
  value: string;
  notes: string;
  observedAt: string;
  animalBatch?: string;
  syncStatus: LocalEntityStatus;
  localOperationId: string;
  createdAt: string;
}

export interface CachedFarmBundle {
  farmId: string;
  farm: Farm;
  checklist: ChecklistItem[];
  incidents: IncidentReport[];
  correctiveActions: CorrectiveAction[];
  cachedAt: string;
}

export interface SyncSummary {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  conflicts: number;
  lastSyncedAt?: string;
  isSyncing: boolean;
}

export interface BlobRecord {
  blobId: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  entityLocalId: string;
  entityType: string;
}
