/**
 * In-memory claim cache (L2 cache, TTL-based).
 * Key: normalized claim text hash → Value: FactCheckResult[]
 *
 * In production this should be replaced with Redis.
 * This implementation provides the same interface for easy replacement.
 */
import type { FactCheckResult } from "@verdict/shared-types";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  results: FactCheckResult[];
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

/**
 * Create a simple hash key from claim text.
 * Normalizes whitespace and lowercases for better cache hit rates.
 */
function makeKey(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export const cache = {
  get(text: string): FactCheckResult[] | null {
    const key = makeKey(text);
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.results;
  },

  set(text: string, results: FactCheckResult[]): void {
    const key = makeKey(text);
    store.set(key, { results, expiresAt: Date.now() + TTL_MS });
  },

  /** Return cache size for health/monitoring endpoints */
  size(): number {
    return store.size;
  },

  /** Prune expired entries */
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.expiresAt) store.delete(key);
    }
  },
};

// Prune expired entries every hour
setInterval(() => cache.prune(), 60 * 60 * 1000);
