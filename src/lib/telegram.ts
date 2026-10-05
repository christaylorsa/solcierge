/**
 * Member Telegram linking, the parts that need no network or database.
 *
 * A member taps t.me/<bot>?start=<code>; Telegram then posts "/start <code>" to our
 * webhook from that member's chat, which is how we learn the chat id. The code is
 * random, single-use and short-lived, so it proves the chat belongs to whoever was
 * signed in when it was issued. Import-free so it is unit-tested directly.
 */
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/** How long a link code stays valid. */
export const LINK_CODE_TTL_MS = 30 * 60 * 1000

/** 24 URL-safe characters: inside Telegram's 64-character, [A-Za-z0-9_-] start limit. */
export function newLinkCode(): string {
  return randomBytes(18).toString('base64url')
}

const LINK_CODE = /^[A-Za-z0-9_-]{24}$/

export type BotCommand = { command: 'start'; code: string | null } | { command: 'stop' } | null

/** Reads the commands the bot acts on. "/start@BotName code" is accepted too. */
export function parseCommand(text: unknown): BotCommand {
  if (typeof text !== 'string') return null
  const [head, arg] = text.trim().split(/\s+/, 2)
  const command = head?.toLowerCase().split('@')[0]
  if (command === '/start') return { command: 'start', code: arg && LINK_CODE.test(arg) ? arg : null }
  if (command === '/stop') return { command: 'stop' }
  return null
}

/**
 * The secret Telegram echoes in X-Telegram-Bot-Api-Secret-Token on every webhook
 * call. Derived from SESSION_SECRET so there is no extra variable to manage; the
 * webhook is re-registered with it whenever a member starts linking.
 */
export function webhookSecret(sessionSecret: string): string {
  return createHmac('sha256', sessionSecret).update('telegram-webhook').digest('hex')
}

export function secretMatches(received: string | null, expected: string): boolean {
  if (!received) return false
  const a = Buffer.from(received)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
