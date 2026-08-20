import { generateLocalId } from "../id";
import type { BlobRecord } from "../types";
import { getOfflineDb } from "./db";

export async function storeBlob(input: {
  file: File;
  entityLocalId: string;
  entityType: string;
  blobId?: string;
}): Promise<BlobRecord> {
  const blobId = input.blobId ?? generateLocalId("BLOB");
  const record = {
    blobId,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    createdAt: new Date().toISOString(),
    entityLocalId: input.entityLocalId,
    entityType: input.entityType,
    data: input.file,
  };
  const db = await getOfflineDb();
  await db.put("blobs", record);
  return {
    blobId: record.blobId,
    fileName: record.fileName,
    mimeType: record.mimeType,
    createdAt: record.createdAt,
    entityLocalId: record.entityLocalId,
    entityType: record.entityType,
  };
}

export async function getBlob(blobId: string): Promise<(BlobRecord & { data: Blob }) | undefined> {
  const db = await getOfflineDb();
  return db.get("blobs", blobId);
}

export async function deleteBlob(blobId: string): Promise<void> {
  const db = await getOfflineDb();
  await db.delete("blobs", blobId);
}
