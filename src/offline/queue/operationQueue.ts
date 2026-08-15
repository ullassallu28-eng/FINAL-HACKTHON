import type { SyncOperation, SyncOperationStatus, SyncOperationType } from "../types";
import { generateOperationId, idempotencyKeyForOperation } from "../id";
import { getOfflineDb } from "../storage/db";

export async function findByIdempotencyKey(key: string): Promise<SyncOperation | undefined> {
  const db = await getOfflineDb();
  const all = await db.getAll("syncQueue");
  return all.find((op) => op.idempotencyKey === key);
}

export async function enqueueOperation(input: {
  operationType: SyncOperationType;
  entityType: string;
  entityLocalId: string;
  payload: Record<string, unknown>;
  dependsOnLocalOperationId?: string;
  blobId?: string;
  localOperationId?: string;
}): Promise<SyncOperation> {
  const localOperationId = input.localOperationId ?? generateOperationId();
  const idempotencyKey = idempotencyKeyForOperation(localOperationId);

  const existing = await findByIdempotencyKey(idempotencyKey);
  if (existing && existing.status !== "FAILED" && existing.status !== "CONFLICT") {
    return existing;
  }

  const now = new Date().toISOString();
  const operation: SyncOperation = {
    localOperationId,
    idempotencyKey,
    operationType: input.operationType,
    entityType: input.entityType,
    entityLocalId: input.entityLocalId,
    createdAt: now,
    updatedAt: now,
    payload: input.payload,
    status: "PENDING",
    retryCount: 0,
    dependsOnLocalOperationId: input.dependsOnLocalOperationId,
    blobId: input.blobId,
  };

  const db = await getOfflineDb();
  await db.put("syncQueue", operation);
  return operation;
}

export async function listOperations(status?: SyncOperationStatus): Promise<SyncOperation[]> {
  const db = await getOfflineDb();
  const all = await db.getAll("syncQueue");
  const sorted = all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return status ? sorted.filter((op) => op.status === status) : sorted;
}

export async function updateOperation(
  localOperationId: string,
  patch: Partial<SyncOperation>
): Promise<void> {
  const db = await getOfflineDb();
  const current = await db.get("syncQueue", localOperationId);
  if (!current) return;
  await db.put("syncQueue", {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function getOperation(localOperationId: string): Promise<SyncOperation | undefined> {
  const db = await getOfflineDb();
  return db.get("syncQueue", localOperationId);
}
