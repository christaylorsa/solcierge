/**
 * Alerts. Operator alerts (Telegram and email to the desk) when something needs the
 * desk, and member updates (to the member's linked Telegram chat and email) when
 * their booking moves.
 *
 * Every send is best-effort. A channel with no credentials is skipped, a failed
 * send is logged and swallowed, and callers run these inside `after()` so an alert
 * never slows down or fails the request that triggered it.
 */

import { categoryName } from '@/lib/categories'
import { explorerTxUrl, publicEnv, serverEnv } from '@/lib/env'
import { budgetRange, dateWindow, formatDate, formatDateTime, usd } from '@/lib/format'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { RequestDetails } from '@/lib/types'

type Alert = {
  /** Email subject, and the bold first line on Telegram. */
  title: string
  lines: string[]
  link: { label: string; href: string }
}

const BRIEF_PREVIEW = 400

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Calls a Bot API method. Throws on a transport or API error. */
export async function telegramApi<T = unknown>(method: string, body: Record<string, unknown>): Promise<T> {
  const { telegramBotToken } = serverEnv()
  if (!telegramBotToken) throw new Error('Misconfigured: TELEGRAM_BOT_TOKEN is not set')
  const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  const json = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null
  if (!res.ok || !json?.ok) throw new Error(`Telegram ${method} failed (${res.status}): ${json?.description ?? 'no body'}`)
  return json.result as T
}

function telegramText(alert: Alert): string {
  return [
    `<b>${escapeHtml(alert.title)}</b>`,
    '',
    ...alert.lines.map(escapeHtml),
    '',
    `<a href="${alert.link.href}">${escapeHtml(alert.link.label)}</a>`,
  ].join('\n')
}

async function sendTelegram(alert: Alert, chatIds: (string | number)[]) {
  if (!serverEnv().telegramBotToken || chatIds.length === 0) return
  const text = telegramText(alert)
  await Promise.all(
    chatIds.map((chatId) =>
      telegramApi('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    ),
  )
}

async function sendEmail(alert: Alert, to: string[]) {
  const { resendApiKey, alertFrom } = serverEnv()
  if (!resendApiKey || to.length === 0) return

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${resendApiKey}` },
    body: JSON.stringify({
      from: alertFrom,
      to,
      subject: alert.title,
      text: [...alert.lines, '', `${alert.link.label}: ${alert.link.href}`].join('\n'),
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`)
}

/** To the desk. */
async function send(alert: Alert) {
  const { telegramChatIds, alertEmails } = serverEnv()
  const results = await Promise.allSettled([sendTelegram(alert, telegramChatIds), sendEmail(alert, alertEmails)])
  for (const result of results) {
    if (result.status === 'rejected') console.error('[solcierge] alert failed:', result.reason)
  }
}

function describeRoute(d: RequestDetails): string[] {
  const lines: string[] = []
  if (d.origin || d.destination) lines.push(`${d.origin || '?'}  →  ${d.destination || '?'}`)
  if (d.location) lines.push(d.location)
  if (d.trip) {
    const depart = d.start_date ? formatDate(d.start_date) : 'date open'
    const back = d.trip === 'one_way' ? 'one way' : d.end_date ? `return ${formatDate(d.end_date)}` : 'return date open'
    lines.push(`Depart ${depart} · ${back}`)
  } else {
    lines.push(dateWindow(d.start_date, d.end_date))
  }
  return lines
}

function shortWallet(wallet: string | null | undefined): string | null {
  return wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : null
}

export async function notifyNewRequest(input: {
  category: string
  details: RequestDetails
  budgetMin: number | null
  budgetMax: number | null
  member: { name: string | null; email: string | null; wallet: string | null }
}) {
  const d = input.details
  const brief = d.details ?? ''
  const who = [input.member.name, input.member.email, shortWallet(input.member.wallet)].filter(Boolean).join(' · ')

  await send({
    title: `New request: ${categoryName(input.category)}`,
    lines: [
      ...describeRoute(d),
      [d.party_size ? `${d.party_size} guests` : null, `Budget ${budgetRange(input.budgetMin, input.budgetMax)}`]
        .filter(Boolean)
        .join(' · '),
      '',
      brief.length > BRIEF_PREVIEW ? `${brief.slice(0, BRIEF_PREVIEW)}…` : brief,
      '',
      `From: ${who || 'anonymous member'}`,
    ],
    link: { label: 'Quote it on the desk', href: `${publicEnv.siteUrl}/admin?status=pending` },
  })
}

export async function notifyPayment(input: {
  requestId: string
  token: string
  amount: string | number
  amountUsd: string | number
  signature: string
  /** Why the desk must reconcile this by hand, or null when it settled automatically. */
  review: string | null
}) {
  const { data } = await supabaseAdmin()
    .from('booking_requests')
    .select('category, details')
    .eq('id', input.requestId)
    .maybeSingle()

  const usdAmount = Number(input.amountUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const title = input.review
    ? `Payment needs review: ${usdAmount}`
    : `Paid: ${usdAmount}${data ? ` for ${categoryName(data.category)}` : ''}`

  await send({
    title,
    lines: [
      `${input.amount} ${input.token} received in the treasury.`,
      ...(input.review ? [`${input.review} Check the amount and confirm the booking by hand.`] : []),
      ...(data ? ['', ...describeRoute((data.details ?? {}) as RequestDetails)] : []),
      '',
      `Transaction: ${explorerTxUrl(input.signature)}`,
    ],
    link: { label: 'Open the desk', href: `${publicEnv.siteUrl}/admin${input.review ? '' : '?status=paid'}` },
  })
}

// --- member updates -----------------------------------------------------------

/** Which channels a member update actually went out on. */
export type Delivery = { telegram: boolean; email: boolean }

/** A one-line label for a booking, built from whatever the member gave us. */
function bookingHeadline(category: string, d: RequestDetails): string {
  if (d.origin && d.destination) return `${categoryName(category)}: ${d.origin} to ${d.destination}`
  if (d.location) return `${categoryName(category)}: ${d.location}`
  return categoryName(category)
}

/**
 * Sends a member an update about one of their bookings. Telegram goes to the chat
 * they linked. Email goes to their verified sign-in address, or failing that the
 * contact address on their profile or the brief, which is unverified: so messages carry only a
 * headline and a link, and the paperwork itself stays behind sign-in.
 */
async function sendToMember(requestId: string, build: (headline: string) => Omit<Alert, 'link'> & { linkLabel: string }): Promise<Delivery> {
  const { data, error } = await supabaseAdmin()
    .from('booking_requests')
    .select('category, details, users ( email, contact_email, telegram_chat_id )')
    .eq('id', requestId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return { telegram: false, email: false }

  const details = (data.details ?? {}) as RequestDetails
  const user = (Array.isArray(data.users) ? data.users[0] : data.users) as
    | { email: string | null; contact_email: string | null; telegram_chat_id: number | null }
    | null
  const chatId = user?.telegram_chat_id ?? null
  const email = user?.email ?? user?.contact_email ?? details.contact_email ?? null

  const { linkLabel, ...rest } = build(bookingHeadline(data.category, details))
  const alert: Alert = { ...rest, link: { label: linkLabel, href: `${publicEnv.siteUrl}/account/${requestId}` } }

  const wantsEmail = Boolean(email && serverEnv().resendApiKey)
  const [telegram, mail] = await Promise.allSettled([
    chatId ? sendTelegram(alert, [chatId]) : Promise.resolve(),
    wantsEmail ? sendEmail(alert, [email!]) : Promise.resolve(),
  ])
  if (telegram.status === 'rejected') console.error('[solcierge] member telegram failed:', telegram.reason)
  if (mail.status === 'rejected') console.error('[solcierge] member email failed:', mail.reason)

  return {
    telegram: Boolean(chatId) && telegram.status === 'fulfilled',
    email: wantsEmail && mail.status === 'fulfilled',
  }
}

export function notifyMemberQuote(input: { requestId: string; amountUsd: number; expiresAt: string }) {
  return sendToMember(input.requestId, (headline) => ({
    title: 'Your Solcierge quote is ready',
    lines: [headline, `${usd(input.amountUsd)}, held until ${formatDateTime(input.expiresAt)} UTC.`],
    linkLabel: 'Review and pay',
  }))
}

export function notifyMemberConfirmed(requestId: string) {
  return sendToMember(requestId, (headline) => ({
    title: 'Your booking is confirmed',
    lines: [headline, 'Your confirmation, itinerary and documents are on your booking page.'],
    linkLabel: 'Open your booking',
  }))
}

export function notifyMemberPaperwork(requestId: string) {
  return sendToMember(requestId, (headline) => ({
    title: 'New paperwork for your booking',
    lines: [headline, 'The desk has added documents or updated your itinerary.'],
    linkLabel: 'Open your booking',
  }))
}

// --- passengers -----------------------------------------------------------------

/** To the desk: a member has submitted or changed the passengers on a flight. Names only, never passports. */
export async function notifyPassengersReceived(input: { requestId: string; count: number; updated: boolean }) {
  const { data } = await supabaseAdmin()
    .from('booking_requests')
    .select('category, details')
    .eq('id', input.requestId)
    .maybeSingle()

  await send({
    title: input.updated ? 'Passenger details updated' : 'Passenger details received',
    lines: [
      ...(data ? describeRoute((data.details ?? {}) as RequestDetails) : []),
      `${input.count} ${input.count === 1 ? 'passenger' : 'passengers'}. Ready to send to the operator.`,
    ],
    link: { label: 'Open the desk', href: `${publicEnv.siteUrl}/admin?status=paid` },
  })
}

/** To the member, after a flight is paid: the operator needs the passenger list. */
export function notifyMemberPassengersNeeded(requestId: string) {
  return sendToMember(requestId, (headline) => ({
    title: 'Payment received: add your passenger details',
    lines: [
      headline,
      'To confirm with the operator we need each passenger’s name, date of birth, nationality and passport details.',
    ],
    linkLabel: 'Add passenger details',
  }))
}
