import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireAdmin } from '@/lib/auth'
import {
  DOCUMENTS_BUCKET,
  MAX_DOCUMENT_BYTES,
  contentTypeFor,
  isPathForRequest,
  titleFromFileName,
} from '@/lib/documents'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/validate'

export const dynamic = 'force-dynamic'

const schema = z.object({
  path: z.string().max(300),
  file_name: z.string().trim().min(1).max(255),
  title: z.string().trim().max(120).optional(),
})

/**
 * Step two of an upload: records a file the desk's browser has put in Storage. The
 * size and type are read back from Storage itself, not taken from the body.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin()
    const { id } = await context.params
    if (!isUuid(id)) return fail('That request no longer exists.', 404)

    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) return fail('The upload could not be read.', 422)
    const { path, file_name, title } = parsed.data

    if (!isPathForRequest(path, id)) return fail('That upload does not belong to this booking.', 422)
    const contentType = contentTypeFor(file_name)
    if (!contentType) return fail('That file type is not accepted.', 415)

    const storage = supabaseAdmin().storage.from(DOCUMENTS_BUCKET)
    const size = await storedSize(storage, path)
    if (size === null) return fail('The file did not reach storage. Try the upload again.', 409)
    if (size <= 0 || size > MAX_DOCUMENT_BYTES) {
      await storage.remove([path])
      return fail('That file is empty or too large.', 413)
    }

    const inserted = await supabaseAdmin()
      .from('booking_documents')
      .insert({
        request_id: id,
        title: title || titleFromFileName(file_name),
        file_name: file_name.slice(0, 255),
        storage_path: path,
        content_type: contentType,
        size_bytes: size,
      })
      .select('id, request_id, title, file_name, content_type, size_bytes, created_at')
      .single()

    if (inserted.error) {
      // Already recorded (a double submit) is fine; anything else orphans the file.
      if (inserted.error.code === '23505') return fail('That file is already on this booking.', 409)
      await storage.remove([path])
      throw new Error(inserted.error.message)
    }

    return ok({ document: inserted.data }, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}

type Bucket = ReturnType<ReturnType<typeof supabaseAdmin>['storage']['from']>

/** The stored file's size, or null when it is not there. Falls back to a folder listing. */
async function storedSize(storage: Bucket, path: string): Promise<number | null> {
  const info = await storage.info(path)
  if (!info.error && info.data) return Number(info.data.size ?? 0)

  const slash = path.indexOf('/')
  const listed = await storage.list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 5 })
  const match = listed.data?.find((object) => object.name === path.slice(slash + 1))
  return match ? Number((match.metadata as { size?: number } | null)?.size ?? 0) : null
}
