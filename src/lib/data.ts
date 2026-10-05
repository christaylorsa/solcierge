import { supabaseAdmin } from '@/lib/supabase/admin'
import type { BookingDocument, BookingRequestFull, RequestStatus } from '@/lib/types'
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
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabaseAdmin()
    .from('users')
    .select('name, contact_email, phone, telegram_chat_id')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return {
    name: data?.name ?? null,
    contact_email: data?.contact_email ?? null,
    phone: data?.phone ?? null,
    telegram_linked: Boolean(data?.telegram_chat_id),
  }
}
