import { handleError, ok } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/** Unlinks the member's X account. Nothing to revoke at X: no token was kept. */
export async function DELETE() {
  try {
    const viewer = await requireViewer()
    const { error } = await supabaseAdmin()
      .from('users')
      .update({ x_user_id: null, x_username: null, x_name: null, x_avatar_url: null, x_linked_at: null })
      .eq('id', viewer.id)
    if (error) throw new Error(error.message)
    return ok({ connected: false })
  } catch (error) {
    return handleError(error)
  }
}
