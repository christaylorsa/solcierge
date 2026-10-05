import { handleError, ok } from '@/lib/api'
import { clearWalletSession } from '@/lib/session'
import { supabaseRouteClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await clearWalletSession()
    // Also drop the Supabase Auth session, if the member arrived by magic link.
    try {
      const supabase = await supabaseRouteClient()
      await supabase.auth.signOut()
    } catch {
      // No email session to clear.
    }
    return ok({ signedOut: true })
  } catch (error) {
    return handleError(error)
  }
}
