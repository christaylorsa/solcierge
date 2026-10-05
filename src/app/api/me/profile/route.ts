import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().trim().max(80, 'Keep the name under 80 characters.'),
  contact_email: z.union([z.literal(''), z.string().trim().email('That email does not look right.').max(200)]),
  phone: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,24}$/, 'Use digits, with the country code, e.g. +44 7700 900123.'),
  ]),
})

/**
 * The member edits their profile. contact_email is unverified and goes to
 * users.contact_email, never users.email, which is a login identity (SA-02).
 */
export async function PATCH(request: Request) {
  try {
    const viewer = await requireViewer()
    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return fail(first?.message ?? 'That could not be read.', 422, { field: first?.path?.join('.') })
    }

    const { name, contact_email, phone } = parsed.data
    const { data, error } = await supabaseAdmin()
      .from('users')
      .update({
        name: name.replace(/\s+/g, ' ') || null,
        contact_email: contact_email.toLowerCase() || null,
        phone: phone.replace(/\s+/g, ' ') || null,
      })
      .eq('id', viewer.id)
      .select('name, contact_email, phone')
      .single()
    if (error) throw new Error(error.message)

    return ok({ profile: data })
  } catch (error) {
    return handleError(error)
  }
}
