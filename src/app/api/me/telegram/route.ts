import { fail, handleError, ok } from '@/lib/api'
import { requireViewer } from '@/lib/auth'
import { publicEnv, serverEnv } from '@/lib/env'
import { telegramApi } from '@/lib/notify'
import { createLimiter } from '@/lib/ratelimit'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { LINK_CODE_TTL_MS, newLinkCode, webhookSecret } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

// Per instance (SA-17). Each link re-registers the webhook with Telegram.
const perMember = createLimiter({ limit: 10, windowMs: 10 * 60_000 })

let botUsername: string | null = null

/** Whether the signed-in member has a Telegram chat linked. The connect button polls this. */
export async function GET() {
  try {
    const viewer = await requireViewer()
    const { data, error } = await supabaseAdmin()
      .from('users')
      .select('telegram_chat_id')
      .eq('id', viewer.id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    return ok({ connected: Boolean(data?.telegram_chat_id) })
  } catch (error) {
    return handleError(error)
  }
}

/**
 * Starts linking: issues a fresh single-use code and returns the t.me link that
 * carries it. Also (re)registers the webhook, so the bot needs no manual setup and
 * picks up a rotated SESSION_SECRET on the next link.
 */
export async function POST() {
  try {
    const viewer = await requireViewer()
    if (!perMember.take(viewer.id)) return fail('Too many attempts. Wait a few minutes and try again.', 429)

    const env = serverEnv()
    if (!env.telegramBotToken) return fail('Telegram updates are not switched on yet.', 503)
    if (!publicEnv.siteUrl.startsWith('https://')) {
      return fail('Telegram linking needs the site on https, so it only works on the live site.', 503)
    }

    const [me] = await Promise.all([
      botUsername ? Promise.resolve({ username: botUsername }) : telegramApi<{ username: string }>('getMe', {}),
      telegramApi('setWebhook', {
        url: `${publicEnv.siteUrl}/api/telegram/webhook`,
        secret_token: webhookSecret(env.sessionSecret),
        allowed_updates: ['message'],
      }),
    ])
    botUsername = me.username

    const code = newLinkCode()
    const saved = await supabaseAdmin()
      .from('users')
      .update({
        telegram_link_code: code,
        telegram_link_expires_at: new Date(Date.now() + LINK_CODE_TTL_MS).toISOString(),
      })
      .eq('id', viewer.id)
    if (saved.error) throw new Error(saved.error.message)

    return ok({ url: `https://t.me/${botUsername}?start=${code}` })
  } catch (error) {
    return handleError(error)
  }
}

/** Unlinks the member's Telegram chat. */
export async function DELETE() {
  try {
    const viewer = await requireViewer()
    const { error } = await supabaseAdmin()
      .from('users')
      .update({ telegram_chat_id: null, telegram_linked_at: null, telegram_link_code: null, telegram_link_expires_at: null })
      .eq('id', viewer.id)
    if (error) throw new Error(error.message)
    return ok({ connected: false })
  } catch (error) {
    return handleError(error)
  }
}
