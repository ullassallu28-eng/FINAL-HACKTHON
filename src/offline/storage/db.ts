import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  BlobRecord,
  CachedFarmBundle,
  LocalHealthObservation,
  LocalIncidentRecord,
  SyncOperation,
} from "../types";

interface AgriSentinelDB extends DBSchema {
  syncQueue: {
    key: string;
    value: SyncOperation;
    indexes: { "by-status": SyncOperation["status"]; "by-created": string };
  };
  localIncidents: {
    key: string;
    value: LocalIncidentRecord;
  };
  healthObservations: {
    key: string;
    value: LocalHealthObservation;
  };
  farmCache: {
    key: string;
    value: CachedFarmBundle;
  };
  blobs: {
    key: string;
    value: BlobRecord & { data: Blob };
  };
  meta: {
    key: string;
    value: { key: string; value: string };
  };
}

const DB_NAME = "agrisentinel-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AgriSentinelDB>> | null = null;

export function getOfflineDb(): Promise<IDBPDatabase<AgriSentinelDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AgriSentinelDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const queue = db.createObjectStore("syncQueue", { keyPath: "localOperationId" });
        queue.createIndex("by-status", "status");
        queue.createIndex("by-created", "createdAt");
        db.createObjectStore("localIncidents", { keyPath: "localId" });
        db.createObjectStore("healthObservations", { keyPath: "localId" });
        db.createObjectStore("farmCache", { keyPath: "farmId" });
        db.createObjectStore("blobs", { keyPath: "blobId" });
        db.createObjectStore("meta", { keyPath: "key" });
      },
    });
  }
  return dbPromise;
}
