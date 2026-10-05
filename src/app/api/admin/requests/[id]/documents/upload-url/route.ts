import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import { DOCUMENTS_BUCKET, MAX_DOCUMENT_BYTES, contentTypeFor, documentPath, formatBytes } from '@/lib/documents'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

const schema = z.object({
  file_name: z.string().trim().min(1).max(255),
  size: z.coerce.number().int().positive(),
})

/**
 * Step one of an upload: a single-use signed URL the desk's browser uploads straight
 * to Storage with. Files never pass through this function, so Vercel's 4.5 MB body
 * limit does not apply. Step two (POST ../documents) records the file once it lands.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await context.params
    if (!isUuid(id)) return fail('That request no longer exists.', 404)

    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) return fail('A file name and size are required.', 422)
    const { file_name, size } = parsed.data

    const contentType = contentTypeFor(file_name)
    if (!contentType) return fail('That file type is not accepted. Use PDF, an image, Word, Excel, .ics or .pkpass.', 415)
    if (size > MAX_DOCUMENT_BYTES) return fail(`Files can be up to ${formatBytes(MAX_DOCUMENT_BYTES)}.`, 413)

    const db = supabaseAdmin()
    const target = await db.from('booking_requests').select('id').eq('id', id).maybeSingle()
    if (target.error) throw new Error(target.error.message)
    if (!target.data) return fail('That request no longer exists.', 404)

    const path = documentPath(id, randomUUID(), file_name)
    const signed = await db.storage.from(DOCUMENTS_BUCKET).createSignedUploadUrl(path)
    if (signed.error) throw new Error(`Storage: ${signed.error.message}`)

    return ok({ path: signed.data.path, token: signed.data.token, content_type: contentType })
  } catch (error) {
    return handleError(error)
  }
}
