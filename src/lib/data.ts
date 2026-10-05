import { supabaseAdmin } from '@/lib/supabase/admin'
import type { BookingRequestFull, RequestStatus } from '@/lib/types'
import { isUuid } from '@/lib/validate'

// Typed as plain `string`, not a literal: supabase-js tries to parse a literal select
// at the type level, and it cannot follow two embedded resources plus a join. We shape
// the rows ourselves in shape() below, so the inference buys nothing here anyway.
const REQUEST_COLUMNS: string = `
  id, user_id, category, details, budget_min, budget_max, status, created_at, updated_at,
  quotes ( id, request_id, amount_usd, amount_sol, amount_usdc, expires_at, notes, created_at ),
  payments ( id, request_id, intent_id, tx_signature, token, amount, payer, slot, confirmed_at )
`

const REQUEST_COLUMNS_WITH_USER: string = `
  id, user_id, category, details, budget_min, budget_max, status, created_at, updated_at,
  quotes ( id, request_id, amount_usd, amount_sol, amount_usdc, expires_at, notes, created_at ),
  payments ( id, request_id, intent_id, tx_signature, token, amount, payer, slot, confirmed_at ),
  users ( id, wallet_address, email, name )
`

type RawRow = Record<string, unknown> & {
  quotes?: unknown[]
  payments?: unknown[]
  users?: unknown
}

/** Collapses the embedded arrays down to the newest quote and the single payment. */
function shape(row: RawRow): BookingRequestFull {
  const quotes = (row.quotes ?? []) as BookingRequestFull['quote'][]
  const payments = (row.payments ?? []) as BookingRequestFull['payment'][]

  const newestQuote =
    quotes.filter(Boolean).sort((a, b) => Date.parse(b!.created_at) - Date.parse(a!.created_at))[0] ?? null

  const { quotes: _q, payments: _p, users, ...rest } = row
  return {
    ...(rest as unknown as BookingRequestFull),
    quote: newestQuote,
    payment: payments.filter(Boolean)[0] ?? null,
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
