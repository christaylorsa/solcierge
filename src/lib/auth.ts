import { isAdminIdentity } from '@/lib/admin'
import { serverEnv } from '@/lib/env'
import { readWalletSession } from '@/lib/session'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { supabaseRouteClient } from '@/lib/supabase/server'
import type { Viewer } from '@/lib/types'

/**
 * Resolves the current member from either identity path:
 *   1. a wallet session cookie (signature-verified at sign-in), or
 *   2. a Supabase Auth session from the magic-link fallback.
 *
 * Wallet wins when both are present, since that is the identity that pays.
 * Returns null for signed-out visitors. Never throws for anonymous traffic.
 */
export async function getViewer(): Promise<Viewer | null> {
  // A clone with no .env.local should render as a signed-out visitor, not a stack
  // trace. Writes still fail loudly, which is where it matters.
  let env: ReturnType<typeof serverEnv>
  try {
    env = serverEnv()
  } catch {
    return null
  }
  const allow = { wallets: env.adminWallets, emails: env.adminEmails }

  const walletSession = await readWalletSession()
  if (walletSession) {
    const { data } = await supabaseAdmin()
      .from('users')
      .select('id, wallet_address, email, name')
      .eq('id', walletSession.userId)
      .maybeSingle()

    // The row must still hold the wallet the session was issued for. After
    // anonymize_user() (or any wallet change) an old cookie stops resolving (SA-13).
    if (data && data.wallet_address === walletSession.wallet) {
      return {
        id: data.id,
        wallet_address: data.wallet_address,
        email: data.email,
        name: data.name,
        // Judged on the signed-in wallet only. users.email is member-writable.
        isAdmin: isAdminIdentity({ kind: 'wallet', wallet: walletSession.wallet }, allow),
      }
    }
  }

  // Email fallback.
  let email: string | null = null
  try {
    const supabase = await supabaseRouteClient()
    const { data } = await supabase.auth.getUser()
    email = data.user?.email ?? null
  } catch {
    email = null
  }
  if (!email) return null

  const user = await upsertUserByEmail(email)
  if (!user) return null

  return {
    id: user.id,
    wallet_address: user.wallet_address,
    email: user.email,
    name: user.name,
    // Judged on the email Supabase verified for this session, not the row's columns.
    isAdmin: isAdminIdentity({ kind: 'email', email }, allow),
  }
}

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer()
  if (!viewer) throw new UnauthorizedError()
  return viewer
}

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer()
  if (!viewer.isAdmin) throw new ForbiddenError()
  return viewer
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Connect a wallet or sign in to continue.')
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super('This area is restricted to Solcierge operators.')
  }
}

/** Finds or creates the member row for a wallet. */
export async function upsertUserByWallet(wallet: string) {
  const db = supabaseAdmin()

  const existing = await db
    .from('users')
    .select('id, wallet_address, email, name')
    .eq('wallet_address', wallet)
    .maybeSingle()

  if (existing.data) return existing.data

  const created = await db
    .from('users')
    .insert({ wallet_address: wallet })
    .select('id, wallet_address, email, name')
    .single()

  if (created.error) {
    // Lost a race against a concurrent sign-in. Read the winner's row.
    const retry = await db
      .from('users')
      .select('id, wallet_address, email, name')
      .eq('wallet_address', wallet)
      .maybeSingle()
    return retry.data
  }
  return created.data
}

export async function upsertUserByEmail(email: string) {
  const db = supabaseAdmin()
  const normalised = email.toLowerCase()

  const existing = await db
    .from('users')
    .select('id, wallet_address, email, name')
    .eq('email', normalised)
    .maybeSingle()

  if (existing.data) return existing.data

  const created = await db
    .from('users')
    .insert({ email: normalised })
    .select('id, wallet_address, email, name')
    .single()

  if (created.error) {
    const retry = await db
      .from('users')
      .select('id, wallet_address, email, name')
      .eq('email', normalised)
      .maybeSingle()
    return retry.data
  }
  return created.data
}
