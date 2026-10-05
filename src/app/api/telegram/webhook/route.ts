import { NextResponse } from 'next/server'
import { publicEnv, serverEnv } from '@/lib/env'
import { telegramApi } from '@/lib/notify'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { parseCommand, secretMatches, webhookSecret } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

type Update = {
  message?: {
    chat?: { id?: number; type?: string }
    text?: string
  }
}

/**
 * Telegram posts every message sent to the bot here. Only two matter:
 *   /start <code>  links this chat to the member who was issued the code
 *   /stop          unlinks it
 * Anything else is ignored. Telegram retries on a non-2xx answer, so once the
 * caller is proven to be Telegram this always answers 200.
 */
export async function POST(request: Request) {
  let env: ReturnType<typeof serverEnv>
  try {
    env = serverEnv()
  } catch {
    return new NextResponse(null, { status: 503 })
  }
  if (!secretMatches(request.headers.get('x-telegram-bot-api-secret-token'), webhookSecret(env.sessionSecret))) {
    return new NextResponse(null, { status: 401 })
  }

  try {
    const update = (await request.json().catch(() => null)) as Update | null
    const chatId = update?.message?.chat?.id
    const command = parseCommand(update?.message?.text)
    if (!command || typeof chatId !== 'number') return NextResponse.json({ ok: true })

    // Linking a group would show one member's bookings to everyone in it.
    if (update?.message?.chat?.type !== 'private') {
      await reply(chatId, 'Booking updates can only be linked in a private chat with this bot.')
      return NextResponse.json({ ok: true })
    }

    const db = supabaseAdmin()

    if (command.command === 'stop') {
      const { error } = await db
        .from('users')
        .update({ telegram_chat_id: null, telegram_linked_at: null })
        .eq('telegram_chat_id', chatId)
      if (error) throw new Error(error.message)
      await reply(chatId, 'Done. This chat will no longer get Solcierge booking updates.')
      return NextResponse.json({ ok: true })
    }

    if (!command.code) {
      await reply(
        chatId,
        `To get booking updates here, open ${publicEnv.siteUrl}/account, sign in, and tap "Connect Telegram".`,
      )
      return NextResponse.json({ ok: true })
    }

    const linked = await db
      .from('users')
      .update({
        telegram_chat_id: chatId,
        telegram_linked_at: new Date().toISOString(),
        telegram_link_code: null,
        telegram_link_expires_at: null,
      })
      .eq('telegram_link_code', command.code)
      .gt('telegram_link_expires_at', new Date().toISOString())
      .select('id')
    if (linked.error) throw new Error(linked.error.message)

    await reply(
      chatId,
      linked.data.length > 0
        ? 'Connected. You will get a message here when your quote is ready, when your booking is confirmed, and when the desk shares documents. Send /stop at any time to switch this off.'
        : `That link has expired or was already used. Go back to ${publicEnv.siteUrl}/account and tap "Connect Telegram" again.`,
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[solcierge] telegram webhook failed:', error)
    return NextResponse.json({ ok: true })
  }
}

async function reply(chatId: number, text: string) {
  try {
    await telegramApi('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true })
  } catch (error) {
    console.error('[solcierge] telegram reply failed:', error)
  }
}
