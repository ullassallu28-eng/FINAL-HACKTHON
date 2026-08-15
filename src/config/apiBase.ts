const PRODUCTION_API = "https://agrisentinel-api.onrender.com";

/** Shared API root used by api.ts and offline connectivity checks. */
export function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname.includes("vercel.app")) {
    return PRODUCTION_API;
  }
  return "http://localhost:8000";
}

/** Health lives at server root, not under /api/v1. */
export function resolveHealthCheckUrl(): string {
  const base = resolveApiBase();
  try {
    const url = new URL(base.includes("://") ? base : `https://${base}`);
    return `${url.origin}/health`;
  } catch {
    return `${base.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "")}/health`;
  }
}

export const API_V1_PREFIX = "/api/v1";
