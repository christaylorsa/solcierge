import { NextResponse } from 'next/server'
import { ForbiddenError, UnauthorizedError } from '@/lib/auth'

export function ok<T>(body: T, init?: ResponseInit) {
  return NextResponse.json(body, init)
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

/**
 * Single place where thrown errors become responses. Auth errors get their real
 * status; anything else is logged server-side and returned as a generic 500, so a
 * Postgres message never leaks to a member.
 */
export function handleError(error: unknown) {
  if (error instanceof UnauthorizedError) return fail(error.message, 401)
  if (error instanceof ForbiddenError) return fail(error.message, 403)

  if (
    error instanceof Error &&
    (error.message.startsWith('Missing environment variable') || error.message.startsWith('Misconfigured:'))
  ) {
    console.error('[solcierge] configuration error:', error.message)
    return fail('This deployment is not fully configured. See README.md.', 503)
  }

  console.error('[solcierge] unhandled route error:', error)
  return fail('Something went wrong on our side. Try again in a moment.', 500)
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
