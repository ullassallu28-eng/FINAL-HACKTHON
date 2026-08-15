# Offline Sync — Backend Requirements

AgriSentinel’s offline layer queues farmer actions locally in IndexedDB and synchronizes them when connectivity returns. The frontend sends an `Idempotency-Key` header on retried mutating requests, but **the current backend does not deduplicate on that header**. Until backend support is added, duplicate prevention relies primarily on the client queue (one queue entry per operation) and UI submit guards.

## Required backend capabilities

### 1. Idempotency (high priority)

Support `Idempotency-Key` (or equivalent client operation ID) on:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/incidents` | POST (multipart) | Offline incident + evidence |
| `/api/v1/incidents/json` | POST | Offline incident without file |
| `/api/v1/farms/{farm_id}/checklist/{item_id}` | PATCH | Checklist toggle |
| `/api/v1/corrective-actions/{action_id}/evidence` | POST (multipart) | Corrective action evidence |
| `/api/v1/health-records/farms/{farm_id}` | POST | Health observations |

**Expected behavior:** If the same idempotency key is received again, return the original created resource (HTTP 200/201 with same body) instead of creating a duplicate row.

### 2. Checklist conflict detection

`PATCH /api/v1/farms/{farm_id}/checklist/{item_id}` should support one of:

- `If-Match` / version field on checklist items, or
- `updatedAt` comparison returning **409 Conflict** when the server row changed after the client’s cached version.

The frontend marks conflicts as `CONFLICT` and shows “Update conflict — review required.” Without server versioning, conflicts cannot be detected reliably.

**Note:** Preview checklist items (`{farmId}-preview-N`) are generated in memory on the backend and may not persist; offline checklist sync for those IDs may fail with 404.

### 3. Sync acknowledgements

Responses should include stable server IDs and timestamps so the client can map `localId → serverId` and mark entities `SERVER_CONFIRMED`.

### 4. Health check

`GET /health` is used for “online but server unreachable” detection. Keep this endpoint unauthenticated and fast.

## Not supported offline (by design)

- Veterinarian incident verification
- Risk recalculation requiring live server data
- Government/officer dashboards
- Server-side AI analysis
- Final compliance verification
- GIS spatial analysis

## Authentication

Offline access uses existing JWT in `localStorage` from a prior online login. There is no offline login bypass. If tokens expire while offline, sync will fail with auth errors until the user logs in again online.

## Client-side guarantees (implemented)

- Durable sync queue in IndexedDB (`syncQueue` store)
- Blob storage for evidence until upload succeeds
- Exponential backoff retries for transient failures
- Non-retryable 4xx → `FAILED` status with error message
- Dependency ordering via `dependsOnLocalOperationId`
- Local vs server status labels in UI
