import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { findReferrer } from '@/lib/data'
import { createLimiter } from '@/lib/ratelimit'
import { checkCode } from '@/lib/referrals'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Per instance (SA-17). Both actions are lookups against the code index.
const perMember = createLimiter({ limit: 20, windowMs: 60 * 60_000 })

const body = z.object({ code: z.string().max(40) })

/**
 * The member picks their own referral code. Links already shared with the old code
 * stop working, which the profile says before they save.
 */
export async function PATCH(request: Request) {
  try {
    const viewer = await requireViewer()
    if (!perMember.take(viewer.id)) return fail('Too many changes. Try again in an hour.', 429)

    const parsed = body.safeParse(await readJson<unknown>(request))
    if (!parsed.success) return fail('Type a code.', 422)
    const checked = checkCode(parsed.data.code)
    if (!checked.ok) return fail(checked.message, 422)

    const { data, error } = await supabaseAdmin()
      .from('users')
      .update({ referral_code: checked.code })
      .eq('id', viewer.id)
      .select('referral_code')
      .single()
    if (error?.code === '23505') return fail('That code is taken. Try another.', 409)
    if (error) throw new Error(error.message)

    return ok({ code: data.referral_code })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * The member says who introduced them, for when the share link did not carry
 * through (opened in X's in-app browser, then signed in inside a wallet app).
 * Allowed once, and only before their first settled booking, so an introduction
 * cannot be attached after the fact to a booking that was already made.
 */
export async function POST(request: Request) {
  try {
    const viewer = await requireViewer()
    if (!perMember.take(viewer.id)) return fail('Too many attempts. Try again in an hour.', 429)

    const parsed = body.safeParse(await readJson<unknown>(request))
    if (!parsed.success) return fail('Type the code you were given.', 422)

    const db = supabaseAdmin()
    const me = await db.from('users').select('referred_by').eq('id', viewer.id).single()
    if (me.error) throw new Error(me.error.message)
    if (me.data.referred_by) return fail('Your introduction is already recorded.', 409)

    const settled = await db
      .from('booking_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', viewer.id)
      .in('status', ['paid', 'fulfilled'])
    if (settled.error) throw new Error(settled.error.message)
    if ((settled.count ?? 0) > 0) {
      return fail('Introductions are recorded before your first booking. Ask the desk if this one was missed.', 409)
    }

    const referrer = await findReferrer(parsed.data.code)
    if (!referrer) return fail('We do not recognise that code. Check it and try again.', 404)
    if (referrer.id === viewer.id) return fail('That is your own code.', 422)

    // Two members introducing each other would reward both for the same spend.
    const theirs = await db.from('users').select('referred_by').eq('id', referrer.id).single()
    if (theirs.error) throw new Error(theirs.error.message)
    if (theirs.data.referred_by === viewer.id) return fail('You introduced this member, so they cannot introduce you.', 422)

    const { error } = await db
      .from('users')
      .update({ referred_by: referrer.id, referred_at: new Date().toISOString() })
      .eq('id', viewer.id)
      .is('referred_by', null)
    if (error) throw new Error(error.message)

    return ok({ referred: true, by: referrer.x ? `@${referrer.x.username}` : null })
  } catch (error) {
    return handleError(error)
  }
}
