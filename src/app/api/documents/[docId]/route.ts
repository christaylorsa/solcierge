import { NextResponse } from 'next/server'
import { fail, handleError } from '@/lib/api'
import { getViewer } from '@/lib/auth'
import { DOCUMENTS_BUCKET, opensInline } from '@/lib/documents'
import { publicEnv } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

/** Long enough to start a download on a slow phone, short enough that a shared link is useless. */
const LINK_SECONDS = 60

/**
 * Opens a shared document. The member must own the booking (or be on the desk);
 * they are then redirected to a signed Storage link that dies in a minute. The
 * bucket is private, so this is the only way to a file.
 */
export async function GET(_request: Request, context: { params: Promise<{ docId: string }> }) {
  try {
    const { docId } = await context.params
    const viewer = await getViewer()
    if (!viewer) return NextResponse.redirect(new URL('/account', publicEnv.siteUrl), 303)
    if (!isUuid(docId)) return fail('That document no longer exists.', 404)

    const db = supabaseAdmin()
    const row = await db
      .from('booking_documents')
      .select('storage_path, file_name, content_type, booking_requests!inner ( user_id )')
      .eq('id', docId)
      .maybeSingle()
    if (row.error) throw new Error(row.error.message)

    const booking = row.data?.booking_requests as unknown as { user_id: string } | { user_id: string }[] | undefined
    const ownerId = Array.isArray(booking) ? booking[0]?.user_id : booking?.user_id
    // Someone else's document is answered exactly like a missing one.
    if (!row.data || (ownerId !== viewer.id && !viewer.isAdmin)) return fail('That document no longer exists.', 404)

    const signed = await db.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(row.data.storage_path, LINK_SECONDS, {
        download: opensInline(row.data.content_type) ? undefined : row.data.file_name,
      })
    if (signed.error) throw new Error(`Storage: ${signed.error.message}`)

    const response = NextResponse.redirect(signed.data.signedUrl, 303)
    response.headers.set('cache-control', 'private, no-store')
    return response
  } catch (error) {
    return handleError(error)
  }
}
