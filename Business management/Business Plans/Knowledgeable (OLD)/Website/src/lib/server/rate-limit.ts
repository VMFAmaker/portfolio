const buckets = new Map<string, number[]>();

/**
 * Sliding-window limiter kept in memory. apphosting.yaml runs a single instance, so this is
 * effective today; if you scale out, move the counters to Firestore or Redis.
 * Returns true when the call is allowed.
 */
export function rateLimit(key: string, maxCalls: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= maxCalls) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 10_000) {
    for (const [k, times] of buckets) if (times.every((t) => now - t >= windowMs)) buckets.delete(k);
  }
  return true;
}
