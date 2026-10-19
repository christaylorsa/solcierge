import { timingSafeEqual } from 'node:crypto'
import { fail, handleError, ok } from '@/lib/api'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Daily keep-alive for the Free plan Supabase project, which pauses after a week
 * without database activity. Vercel Cron calls this (see vercel.json) with
 * `Authorization: Bearer $CRON_SECRET`. One tiny read is enough to count as activity.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return fail('CRON_SECRET is not set.', 503)

  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return fail('Unauthorized.', 401)
  }

  try {
    const { error } = await supabaseAdmin().from('users').select('id').limit(1)
    if (error) throw error
    return ok({ ok: true, at: new Date().toISOString() })
  } catch (error) {
    return handleError(error)
  }
}
