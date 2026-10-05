import { fail, handleError, ok } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { DOCUMENTS_BUCKET } from '@/lib/documents'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

/** Removes a shared document: the file first, then the record. */
export async function DELETE(_request: Request, context: { params: Promise<{ docId: string }> }) {
  try {
    await requireAdmin()
    const { docId } = await context.params
    if (!isUuid(docId)) return fail('That document no longer exists.', 404)

    const db = supabaseAdmin()
    const row = await db.from('booking_documents').select('id, storage_path').eq('id', docId).maybeSingle()
    if (row.error) throw new Error(row.error.message)
    if (!row.data) return fail('That document no longer exists.', 404)

    const removed = await db.storage.from(DOCUMENTS_BUCKET).remove([row.data.storage_path])
    if (removed.error) throw new Error(`Storage: ${removed.error.message}`)

    const deleted = await db.from('booking_documents').delete().eq('id', docId)
    if (deleted.error) throw new Error(deleted.error.message)

    return ok({ deleted: docId })
  } catch (error) {
    return handleError(error)
  }
}
