/**
 * Where a post-sign-in redirect may go: a path on this site, nothing else.
 *
 * `new URL(next, origin)` happily resolves `//evil.example` and `https://evil.example`
 * off-site, so `next` is accepted only as a single-slash relative path. Backslashes
 * and control characters are refused too, since browsers normalise `/\` to `//`.
 * Import-free so it is unit-tested.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/account'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback
  return next
}
