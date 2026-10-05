import { after } from 'next/server'
import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { listRequestsForUser } from '@/lib/data'
import { notifyNewRequest } from '@/lib/notify'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { CATEGORY_SLUGS } from '@/lib/types'

export const dynamic = 'force-dynamic'

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the date picker.')
  .optional()
  .or(z.literal('').transform(() => undefined))

const schema = z
  .object({
    category: z.enum(CATEGORY_SLUGS),
    origin: z.string().trim().max(120).optional(),
    destination: z.string().trim().max(120).optional(),
    location: z.string().trim().max(160).optional(),
    start_date: optionalDate,
    end_date: optionalDate,
    trip: z.enum(['one_way', 'return']).optional(),
    party_size: z.coerce.number().int().min(1).max(500).optional(),
    budget_min: z.coerce.number().min(0).max(100_000_000).optional(),
    budget_max: z.coerce.number().min(0).max(100_000_000).optional(),
    details: z.string().trim().min(20, 'Give us at least a sentence or two to work with.').max(4000),
    contact_name: z.string().trim().max(120).optional(),
    contact_email: z.string().trim().email('That email does not look right.').max(200).optional(),
  })
  .refine(
    (value) => !value.budget_min || !value.budget_max || value.budget_max >= value.budget_min,
    { message: 'The top of the budget cannot be below the bottom.', path: ['budget_max'] },
  )
  .refine(
    (value) => !value.start_date || !value.end_date || value.end_date >= value.start_date,
    { message: 'The end date falls before the start date.', path: ['end_date'] },
  )

export async function GET() {
  try {
    const viewer = await requireViewer()
    return ok({ requests: await listRequestsForUser(viewer.id) })
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const viewer = await requireViewer()

    const body = await readJson<unknown>(request)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return fail(first?.message ?? 'That request could not be read.', 422, {
        field: first?.path?.join('.'),
      })
    }

    const {
      category,
      budget_min,
      budget_max,
      contact_name,
      contact_email,
      ...details
    } = parsed.data
    if (details.trip === 'one_way') details.end_date = undefined

    const db = supabaseAdmin()

    const limited = await rateLimited(db, viewer.id)
    if (limited) return fail(limited, 429)

    const { data, error } = await db
      .from('booking_requests')
      .insert({
        user_id: viewer.id,
        category,
        details: stripUndefined(details),
        budget_min: budget_min ?? null,
        budget_max: budget_max ?? null,
        status: 'pending',
      })
      .select('id, status, created_at')
      .single()

    if (error) throw new Error(error.message)

    // Backfill the member's contact details from the first request that carries them.
    const patch: Record<string, string> = {}
    if (contact_name && !viewer.name) patch.name = contact_name
    if (contact_email && !viewer.email) patch.email = contact_email.toLowerCase()
    if (Object.keys(patch).length > 0) {
      // A duplicate email belongs to another member: keep the request, skip the patch.
      const { error: patchError } = await db.from('users').update(patch).eq('id', viewer.id)
      if (patchError) console.warn('[solcierge] could not backfill contact details:', patchError.message)
    }

    after(() =>
      notifyNewRequest({
        category,
        details: stripUndefined(details),
        budgetMin: budget_min ?? null,
        budgetMax: budget_max ?? null,
        member: {
          name: viewer.name ?? contact_name ?? null,
          email: viewer.email ?? contact_email ?? null,
          wallet: viewer.wallet_address,
        },
      }),
    )

    return ok({ request: data }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

// Per-member caps stop one account spamming the desk. The site-wide cap is a brake
// on the case per-member caps cannot see: a script minting fresh wallets, each one
// a new member. Generous enough that a real burst of members never meets it.
const MEMBER_LIMITS = [
  { windowMs: 60 * 60 * 1000, max: 5, message: 'That is a lot of requests in an hour. Give the desk a moment, or add detail to an open one.' },
  { windowMs: 24 * 60 * 60 * 1000, max: 15, message: 'You have reached today’s limit for new requests. The desk is working through your open ones.' },
]
const SITE_LIMIT = { windowMs: 10 * 60 * 1000, max: 40 }

async function countSince(db: ReturnType<typeof supabaseAdmin>, windowMs: number, userId?: string) {
  let query = db
    .from('booking_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - windowMs).toISOString())
  if (userId) query = query.eq('user_id', userId)
  const { count, error } = await query
  if (error) throw new Error(error.message)
  return count ?? 0
}

async function rateLimited(db: ReturnType<typeof supabaseAdmin>, userId: string): Promise<string | null> {
  for (const limit of MEMBER_LIMITS) {
    if ((await countSince(db, limit.windowMs, userId)) >= limit.max) return limit.message
  }
  if ((await countSince(db, SITE_LIMIT.windowMs)) >= SITE_LIMIT.max) {
    console.warn('[solcierge] site-wide request limit reached')
    return 'The desk is unusually busy. Try again in a few minutes.'
  }
  return null
}

function stripUndefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>
}
