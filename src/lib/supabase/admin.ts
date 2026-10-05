import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { serverEnv } from '@/lib/env'

let cached: SupabaseClient | null = null

/**
 * Service-role client. Server only, never imported into a client component.
 *
 * RLS denies anon and authenticated roles everything (see supabase/schema.sql),
 * so this client is the only path to the data. Ownership checks therefore live
 * in the route handlers: every query that touches member data must filter on a
 * user_id resolved from the session, not from the request body.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached
  const env = serverEnv()
  cached = createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cached
}
