interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  inFlight?: Promise<T>;
}

const store = new Map<string, CacheEntry<unknown>>();

export const DEFAULT_CACHE_TTL_MS = 60_000;

export function cacheKey(method: string, path: string): string {
  return `${method}:${path}`;
}

export async function cachedGet<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; force?: boolean; swr?: boolean }
): Promise<T> {
  const ttlMs = options?.ttlMs ?? DEFAULT_CACHE_TTL_MS;
  const force = options?.force ?? false;
  const swr = options?.swr ?? true;
  const now = Date.now();
  const existing = store.get(key) as CacheEntry<T> | undefined;

  if (!force && existing?.inFlight) {
    return existing.inFlight;
  }

  if (!force && existing && now - existing.fetchedAt < ttlMs) {
    return existing.data;
  }

  if (!force && swr && existing && existing.data !== undefined) {
    void runFetch(key, fetcher).catch(() => undefined);
    return existing.data;
  }

  return runFetch(key, fetcher);
}

async function runFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const pending = fetcher();
  store.set(key, {
    data: store.get(key)?.data as T,
    fetchedAt: store.get(key)?.fetchedAt ?? 0,
    inFlight: pending,
  });

  try {
    const data = await pending;
    store.set(key, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    const prev = store.get(key);
    if (prev?.inFlight === pending) {
      if (prev.data !== undefined) {
        store.set(key, { data: prev.data, fetchedAt: prev.fetchedAt });
      } else {
        store.delete(key);
      }
    }
    throw err;
  }
}

export function invalidateApiCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.includes(prefix)) store.delete(key);
  }
}

export function getCacheAge(key: string): number | null {
  const entry = store.get(key);
  if (!entry) return null;
  return Date.now() - entry.fetchedAt;
}

export function isCacheFresh(key: string, ttlMs = DEFAULT_CACHE_TTL_MS): boolean {
  const age = getCacheAge(key);
  return age !== null && age < ttlMs;
}
