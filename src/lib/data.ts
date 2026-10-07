import { supabaseAdmin } from '@/lib/supabase/admin'
import type { BookingDocument, BookingRequestFull, RequestStatus } from '@/lib/types'
import { checkCode, generateCode } from '@/lib/referrals'
import { lifetimeSpend, tierFor, type TierKey } from '@/lib/tiers'
import { isUuid } from '@/lib/validate'

// Typed as plain `string`, not a literal: supabase-js tries to parse a literal select
// at the type level, and it cannot follow two embedded resources plus a join. We shape
// the rows ourselves in shape() below, so the inference buys nothing here anyway.
const REQUEST_COLUMNS: string = `
  id, user_id, category, details, budget_min, budget_max, status, confirmation_ref, itinerary,
  created_at, updated_at,
  quotes ( id, request_id, amount_usd, amount_sol, amount_usdc, expires_at, notes, created_at ),
  payments ( id, request_id, intent_id, tx_signature, token, amount, payer, slot, confirmed_at ),
  booking_documents ( id, request_id, title, file_name, content_type, size_bytes, created_at )
`

const REQUEST_COLUMNS_WITH_USER: string = `
  ${REQUEST_COLUMNS},
  users ( id, wallet_address, email, name, telegram_chat_id, contact_email, phone )
`

type RawRow = Record<string, unknown> & {
  quotes?: unknown[]
  payments?: unknown[]
  booking_documents?: unknown[]
  users?: unknown
}

/** Collapses the embedded arrays down to the newest quote, the single payment and the documents in upload order. */
function shape(row: RawRow): BookingRequestFull {
  const quotes = (row.quotes ?? []) as BookingRequestFull['quote'][]
  const payments = (row.payments ?? []) as BookingRequestFull['payment'][]
  const documents = ((row.booking_documents ?? []) as BookingDocument[])
    .filter(Boolean)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))

  const newestQuote =
    quotes.filter(Boolean).sort((a, b) => Date.parse(b!.created_at) - Date.parse(a!.created_at))[0] ?? null

  const { quotes: _q, payments: _p, booking_documents: _d, users, ...rest } = row
  return {
    ...(rest as unknown as BookingRequestFull),
    quote: newestQuote,
    payment: payments.filter(Boolean)[0] ?? null,
    documents,
    user: (users ?? null) as BookingRequestFull['user'],
  }
}

/** A member's own bookings, newest first. Always scoped by user_id. */
export async function listRequestsForUser(userId: string): Promise<BookingRequestFull[]> {
  const { data, error } = await supabaseAdmin()
    .from('booking_requests')
    .select(REQUEST_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => shape(row as unknown as RawRow))
}

/**
 * One request. `ownerId` is not optional by accident: passing it makes the
 * ownership check part of the query rather than something a caller can forget.
 * Pass null only from admin paths.
 */
export async function getRequest(id: string, ownerId: string | null): Promise<BookingRequestFull | null> {
  // A non-uuid id (from a hand-typed URL) is simply not found, not a Postgres error.
  if (!isUuid(id)) return null
  let query = supabaseAdmin()
    .from('booking_requests')
    .select(ownerId ? REQUEST_COLUMNS : REQUEST_COLUMNS_WITH_USER)
    .eq('id', id)

  if (ownerId) query = query.eq('user_id', ownerId)

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return data ? shape(data as unknown as RawRow) : null
}

export async function listAllRequests(status?: RequestStatus): Promise<BookingRequestFull[]> {
  let query = supabaseAdmin()
    .from('booking_requests')
    .select(REQUEST_COLUMNS_WITH_USER)
    .order('created_at', { ascending: false })
    .limit(200)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => shape(row as unknown as RawRow))
}

export async function countByStatus(): Promise<Record<RequestStatus, number>> {
  const { data, error } = await supabaseAdmin().from('booking_requests').select('status')
  if (error) throw new Error(error.message)

  const counts: Record<RequestStatus, number> = {
    pending: 0,
    quoted: 0,
    paid: 0,
    fulfilled: 0,
    cancelled: 0,
  }
  for (const row of data ?? []) {
    const status = (row as { status: RequestStatus }).status
    if (status in counts) counts[status] += 1
  }
  return counts
}

/** Whether a member has a Telegram chat linked for booking updates. */
export async function hasTelegramLinked(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from('users')
    .select('telegram_chat_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return Boolean(data?.telegram_chat_id)
}

export type Profile = {
  name: string | null
  contact_email: string | null
  phone: string | null
  telegram_linked: boolean
  member_since: string | null
  x: XLink | null
  referral_code: string | null
  referred: boolean
}

export type XLink = {
  username: string
  name: string | null
  avatar_url: string | null
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabaseAdmin()
    .from('users')
    .select(
      'name, contact_email, phone, telegram_chat_id, created_at, x_username, x_name, x_avatar_url, referral_code, referred_by',
    )
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    name: data?.name ?? null,
    contact_email: data?.contact_email ?? null,
    phone: data?.phone ?? null,
    telegram_linked: Boolean(data?.telegram_chat_id),
    member_since: data?.created_at ?? null,
    x: data?.x_username
      ? { username: data.x_username, name: data.x_name ?? null, avatar_url: data.x_avatar_url ?? null }
      : null,
    referral_code: data?.referral_code ?? null,
    referred: Boolean(data?.referred_by),
  }
}

// --- referrals -----------------------------------------------------------------

/**
 * The member's referral code, created on first use. A unique-index collision on the
 * random code is retried; another writer setting a code first wins.
 */
export async function ensureReferralCode(userId: string, current: string | null): Promise<string> {
  if (current) return current
  const db = supabaseAdmin()
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    const { data, error } = await db
      .from('users')
      .update({ referral_code: code })
      .eq('id', userId)
      .is('referral_code', null)
      .select('referral_code')
      .maybeSingle()
    if (!error) {
      if (data?.referral_code) return data.referral_code
      // Zero rows: someone set it in the meantime. Read theirs.
      const again = await db.from('users').select('referral_code').eq('id', userId).maybeSingle()
      if (again.data?.referral_code) return again.data.referral_code
    } else if (error.code !== '23505') {
      throw new Error(error.message)
    }
  }
  throw new Error('Could not allocate a referral code.')
}

export type Referrer = {
  id: string
  code: string
  x: XLink | null
}

/** The live member behind a code, or null. Anonymised members have no code, so never match. */
export async function findReferrer(code: string): Promise<Referrer | null> {
  const checked = checkCode(code)
  if (!checked.ok) return null
  const { data, error } = await supabaseAdmin()
    .from('users')
    .select('id, referral_code, x_username, x_name, x_avatar_url')
    .eq('referral_code', checked.code)
    .is('anonymized_at', null)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data?.referral_code) return null
  return {
    id: data.id,
    code: data.referral_code,
    x: data.x_username ? { username: data.x_username, name: data.x_name, avatar_url: data.x_avatar_url } : null,
  }
}

/** Settled bookings, newest quote each, for a set of members. */
async function settledByUser(userIds: string[]): Promise<Map<string, { count: number; spend: number }>> {
  const out = new Map<string, { count: number; spend: number }>()
  if (userIds.length === 0) return out
  const { data, error } = await supabaseAdmin()
    .from('booking_requests')
    .select('user_id, status, quotes ( amount_usd, created_at )')
    .in('user_id', userIds)
    .in('status', ['paid', 'fulfilled'])
  if (error) throw new Error(error.message)

  for (const row of (data ?? []) as unknown as {
    user_id: string
    status: string
    quotes: { amount_usd: number; created_at: string }[] | null
  }[]) {
    const newest = (row.quotes ?? []).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] ?? null
    const spend = lifetimeSpend([{ status: row.status, quote: newest }])
    const entry = out.get(row.user_id) ?? { count: 0, spend: 0 }
    entry.count += 1
    entry.spend = Math.round((entry.spend + spend) * 100) / 100
    out.set(row.user_id, entry)
  }
  return out
}

export type ReferralSummary = {
  /** Members who joined with this member's code. */
  introduced: number
  /** Of those, how many have settled at least one booking. */
  booked: number
  /** Settled bookings across everyone introduced. */
  bookings: number
  /** Their settled value, in USD. */
  value: number
}

export async function getReferralSummary(userId: string): Promise<ReferralSummary> {
  const { data, error } = await supabaseAdmin().from('users').select('id').eq('referred_by', userId)
  if (error) throw new Error(error.message)
  const ids = (data ?? []).map((row) => row.id as string)
  const settled = await settledByUser(ids)
  let bookings = 0
  let value = 0
  for (const entry of settled.values()) {
    bookings += entry.count
    value += entry.spend
  }
  return { introduced: ids.length, booked: settled.size, bookings, value: Math.round(value * 100) / 100 }
}

export type MemberSignal = {
  tier: TierKey
  spend: number
  /** The code and X handle of whoever introduced the member, so the desk knows who to reward. */
  introducedBy: { code: string | null; x_username: string | null } | null
}

/** Tier and referrer for each member on the desk. */
export async function getMemberSignals(userIds: string[]): Promise<Map<string, MemberSignal>> {
  const ids = [...new Set(userIds)]
  const out = new Map<string, MemberSignal>()
  if (ids.length === 0) return out
  const db = supabaseAdmin()

  const [settled, members] = await Promise.all([
    settledByUser(ids),
    db.from('users').select('id, referred_by').in('id', ids),
  ])
  if (members.error) throw new Error(members.error.message)

  const referrerIds = [...new Set((members.data ?? []).map((row) => row.referred_by as string | null).filter(Boolean))] as string[]
  const referrers = new Map<string, { code: string | null; x_username: string | null }>()
  if (referrerIds.length > 0) {
    const { data, error } = await db.from('users').select('id, referral_code, x_username').in('id', referrerIds)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) referrers.set(row.id, { code: row.referral_code, x_username: row.x_username })
  }

  for (const row of members.data ?? []) {
    const spend = settled.get(row.id)?.spend ?? 0
    out.set(row.id, {
      tier: tierFor(spend).key,
      spend,
      introducedBy: row.referred_by ? (referrers.get(row.referred_by) ?? { code: null, x_username: null }) : null,
    })
  }
  return out
}
