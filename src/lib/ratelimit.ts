/**
 * Fixed-window rate limiting, held in memory.
 *
 * On serverless this is per instance, not global: a determined client spread across
 * cold starts gets more than the limit. It still turns an unbounded loop from one
 * client into a bounded one, which is the point. Limits that must hold across
 * instances need a shared store (see SA-17 in SECURITY-AUDIT.md).
 *
 * Import-free so it is unit-tested directly.
 */
export type Limiter = {
  /** Counts one hit for `key`. False once the key is over its limit in this window. */
  take(key: string, now?: number): boolean
}

export function createLimiter(options: { limit: number; windowMs: number; maxKeys?: number }): Limiter {
  const maxKeys = options.maxKeys ?? 10_000
  const windows = new Map<string, { count: number; resetAt: number }>()

  return {
    take(key, now = Date.now()) {
      let entry = windows.get(key)
      if (!entry || entry.resetAt <= now) {
        // Bound memory: drop expired windows first, then the oldest if still full.
        if (windows.size >= maxKeys) {
          for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k)
          if (windows.size >= maxKeys) windows.delete(windows.keys().next().value as string)
        }
        entry = { count: 0, resetAt: now + options.windowMs }
        windows.set(key, entry)
      }
      entry.count += 1
      return entry.count <= options.limit
    },
  }
}

/** The caller's IP. Vercel overwrites x-forwarded-for with the real client address. */
export function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}
