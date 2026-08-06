/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * NOTE: This state lives in a single Node process. It is not a substitute for
 * a distributed store (e.g. Redis) when running multiple instances, but it
 * provides a meaningful baseline throttle for credential-based endpoints
 * (registration, sign-in) in a small/single-node deployment.
 */

type LimiterOptions = {
  windowMs: number;
  max: number;
};

const MAX_KEYS = 5000;

export class InMemoryRateLimiter {
  private hits = new Map<string, number[]>();

  constructor(private options: LimiterOptions) {}

  isAllowed(key: string): boolean {
    const { windowMs, max } = this.options;
    const now = Date.now();
    const cutoff = now - windowMs;

    // Opportunistically bound memory usage on writes.
    if (this.hits.size > MAX_KEYS) this.prune();

    const hits = (this.hits.get(key) ?? []).filter((t) => t > cutoff);
    if (hits.length >= max) {
      this.hits.set(key, hits);
      return false;
    }

    hits.push(now);
    this.hits.set(key, hits);
    return true;
  }

  /** Drop expired entries and resize the table. */
  prune(): void {
    const { windowMs } = this.options;
    const cutoff = Date.now() - windowMs;
    let deleted = 0;
    for (const [key, times] of this.hits) {
      const fresh = times.filter((t) => t > cutoff);
      if (fresh.length === 0) {
        this.hits.delete(key);
        deleted++;
      } else {
        this.hits.set(key, fresh);
      }
    }
    // Guard against unbounded growth even with recent hits.
    if (this.hits.size > MAX_KEYS) {
      const keys = Array.from(this.hits.keys());
      let i = 0;
      while (this.hits.size > MAX_KEYS && i < keys.length) {
        this.hits.delete(keys[i]);
        i++;
      }
    }
    void deleted;
  }
}

/** Sign-up: fairly strict to prevent account spam. */
export const registerLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
});

/** Credentials sign-in: per (ip + email) to blunt brute force. */
export const signInLimiter = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
});

// Periodic tidy-up for the timers/hits maps.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    registerLimiter.prune();
    signInLimiter.prune();
  }, 60 * 1000).unref?.();
}

/** Best-effort client IP extraction from a request's headers. */
export function getClientIp(headers: Headers | null | undefined): string {
  if (!headers) return "unknown";
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") ?? "unknown";
}
