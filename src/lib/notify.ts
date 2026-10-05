/**
 * Operator alerts: Telegram and email, fired when something needs the desk.
 *
 * Every send is best-effort. A channel with no credentials is skipped, a failed
 * send is logged and swallowed, and callers run these inside `after()` so an alert
 * never slows down or fails the member's own request.
 */

import { categoryName } from '@/lib/categories'
import { explorerTxUrl, publicEnv, serverEnv } from '@/lib/env'
import { budgetRange, dateWindow, formatDate } from '@/lib/format'
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

async function sendTelegram(alert: Alert) {
  const { telegramBotToken, telegramChatIds } = serverEnv()
  if (!telegramBotToken || telegramChatIds.length === 0) return

  const text = [
    `<b>${escapeHtml(alert.title)}</b>`,
    '',
    ...alert.lines.map(escapeHtml),
    '',
    `<a href="${alert.link.href}">${escapeHtml(alert.link.label)}</a>`,
  ].join('\n')

  await Promise.all(
    telegramChatIds.map(async (chatId) => {
      const res = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(8000),
      })
      if (!res.ok) throw new Error(`Telegram responded ${res.status}: ${await res.text()}`)
    }),
  )
}

async function sendEmail(alert: Alert) {
  const { resendApiKey, alertEmails, alertFrom } = serverEnv()
  if (!resendApiKey || alertEmails.length === 0) return

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${resendApiKey}` },
    body: JSON.stringify({
      from: alertFrom,
      to: alertEmails,
      subject: alert.title,
      text: [...alert.lines, '', `${alert.link.label}: ${alert.link.href}`].join('\n'),
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`)
}

async function send(alert: Alert) {
  const results = await Promise.allSettled([sendTelegram(alert), sendEmail(alert)])
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
  late: boolean
}) {
  const { data } = await supabaseAdmin()
    .from('booking_requests')
    .select('category, details')
    .eq('id', input.requestId)
    .maybeSingle()

  const usdAmount = Number(input.amountUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
  const title = input.late
    ? `Payment needs review: ${usdAmount}`
    : `Paid: ${usdAmount}${data ? ` for ${categoryName(data.category)}` : ''}`

  await send({
    title,
    lines: [
      `${input.amount} ${input.token} received in the treasury.`,
      ...(input.late
        ? ['It landed after the 10-minute rate lock expired. Check the amount and confirm the booking by hand.']
        : []),
      ...(data ? ['', ...describeRoute((data.details ?? {}) as RequestDetails)] : []),
      '',
      `Transaction: ${explorerTxUrl(input.signature)}`,
    ],
    link: { label: 'Open the desk', href: `${publicEnv.siteUrl}/admin?status=${input.late ? 'quoted' : 'paid'}` },
  })
}
