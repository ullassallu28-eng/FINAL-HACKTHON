export function generateLocalId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${ts}-${rand}`.toUpperCase();
}

export function generateOperationId(): string {
  const year = new Date().getFullYear();
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 6);
  return `op-${year}-${ts}-${rand}`;
}

export function idempotencyKeyForOperation(localOperationId: string): string {
  return `agrisentinel-${localOperationId}`;
}
