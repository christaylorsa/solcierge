export const REQUEST_STATUSES = ['pending', 'quoted', 'paid', 'fulfilled', 'cancelled'] as const
export type RequestStatus = (typeof REQUEST_STATUSES)[number]

export const CATEGORY_SLUGS = [
  'jets',
  'yachts',
  'villas',
  'cars',
  'dining',
  'events',
  'bespoke',
] as const
export type CategorySlug = (typeof CATEGORY_SLUGS)[number]

export type PaymentToken = 'SOL' | 'USDC'

export type RequestDetails = {
  origin?: string
  destination?: string
  location?: string
  start_date?: string
  end_date?: string
  /** Flights only. */
  trip?: 'one_way' | 'return'
  party_size?: number
  details?: string
  /** Typed by the member and unverified. Never copied to users.email (SA-02). */
  contact_name?: string
  contact_email?: string
}

export type User = {
  id: string
  wallet_address: string | null
  email: string | null
  name: string | null
  created_at: string
}

export type Quote = {
  id: string
  request_id: string
  amount_usd: number
  amount_sol: number | null
  amount_usdc: number | null
  expires_at: string
  notes: string | null
  created_at: string
}

export type Payment = {
  id: string
  request_id: string
  intent_id: string | null
  tx_signature: string
  token: PaymentToken
  amount: number
  payer: string | null
  slot: number | null
  confirmed_at: string
}

export type BookingRequest = {
  id: string
  user_id: string
  category: CategorySlug
  details: RequestDetails
  budget_min: number | null
  budget_max: number | null
  status: RequestStatus
  /** The supplier's booking reference, written by the desk. */
  confirmation_ref: string | null
  /** Itinerary and instructions for the member, written by the desk. */
  itinerary: string | null
  created_at: string
  updated_at: string
}

/** A file the desk shared on a booking. The Storage path never leaves the server. */
export type BookingDocument = {
  id: string
  request_id: string
  title: string
  file_name: string
  content_type: string
  size_bytes: number
  created_at: string
}

/** A request joined with its newest quote, its payment and its paperwork, as the UI needs it. */
export type BookingRequestFull = BookingRequest & {
  quote: Quote | null
  payment: Payment | null
  documents: BookingDocument[]
  user?: (Pick<User, 'id' | 'wallet_address' | 'email' | 'name'> & { telegram_chat_id?: number | null }) | null
}

export type PaymentIntent = {
  id: string
  request_id: string
  quote_id: string
  token: PaymentToken
  amount: number
  amount_usd: number
  sol_price_usd: number | null
  recipient: string
  mint: string | null
  status: 'open' | 'expired' | 'consumed'
  expires_at: string
  created_at: string
}

export type Viewer = {
  id: string
  wallet_address: string | null
  email: string | null
  name: string | null
  isAdmin: boolean
}

export function isRequestStatus(value: unknown): value is RequestStatus {
  return typeof value === 'string' && (REQUEST_STATUSES as readonly string[]).includes(value)
}

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === 'string' && (CATEGORY_SLUGS as readonly string[]).includes(value)
}
