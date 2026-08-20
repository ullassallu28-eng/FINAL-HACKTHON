export function isRetryableError(err: unknown, statusCode?: number): boolean {
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return false;
  }
  if (statusCode && statusCode >= 500) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("401") || msg.includes("403") || msg.includes("422") || msg.includes("validation")) {
      return false;
    }
    if (
      msg.includes("network") ||
      msg.includes("fetch") ||
      msg.includes("timeout") ||
      msg.includes("503") ||
      msg.includes("502") ||
      msg.includes("504")
    ) {
      return true;
    }
  }
  return !statusCode;
}

export function backoffMs(retryCount: number): number {
  return Math.min(60_000, 1000 * 2 ** Math.min(retryCount, 6));
}

export const MAX_RETRIES = 8;
