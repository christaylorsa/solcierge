import type { RequestStatus } from './types'

export function usd(amount: number | null | undefined, options?: { cents?: boolean }): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: options?.cents ? 2 : 0,
    minimumFractionDigits: options?.cents ? 2 : 0,
  }).format(amount)
}

export function budgetRange(min: number | null, max: number | null): string {
  if (min && max) return `${usd(min)} to ${usd(max)}`
  if (max) return `up to ${usd(max)}`
  if (min) return `${usd(min)} and up`
  return 'Not specified'
}

export function sol(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—'
  const decimals = amount >= 100 ? 3 : amount >= 1 ? 4 : 6
  return `${trimZeros(amount.toFixed(decimals))} SOL`
}

export function usdc(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return '—'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount)} USDC`
}

function trimZeros(value: string): string {
  return value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value
}

export function shortAddress(address: string | null | undefined, size = 4): string {
  if (!address) return '—'
  if (address.length <= size * 2 + 1) return address
  return `${address.slice(0, size)}…${address.slice(-size)}`
}

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : DATE.format(date)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME.format(date)
}

export function dateWindow(start?: string, end?: string): string {
  if (start && end && start !== end) return `${formatDate(start)} to ${formatDate(end)}`
  if (start) return formatDate(start)
  return 'Dates open'
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'
  const seconds = Math.round((Date.now() - then) / 1000)
  const past = seconds >= 0
  const abs = Math.abs(seconds)

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
    ['year', Number.POSITIVE_INFINITY],
  ]

  let value_ = abs
  for (const [unit, step] of units) {
    if (value_ < step) {
      const rounded = Math.max(1, Math.round(value_))
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(past ? -rounded : rounded, unit)
    }
    value_ /= step
  }
  return formatDate(value)
}

export function countdown(msRemaining: number): string {
  const total = Math.max(0, Math.floor(msRemaining / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export const STATUS_COPY: Record<RequestStatus, { label: string; hint: string }> = {
  pending: { label: 'With the desk', hint: 'A concierge is sourcing options and will quote you shortly.' },
  quoted: { label: 'Quote ready', hint: 'Review the quote and settle in SOL or USDC to confirm.' },
  paid: { label: 'Paid', hint: 'Funds received on chain. We are locking in the booking now.' },
  fulfilled: { label: 'Fulfilled', hint: 'Delivered. Your confirmation and the supplier details are on this page.' },
  cancelled: { label: 'Cancelled', hint: 'This request is closed. If you had paid, any refund due follows our Cancellation and Refunds policy.' },
}
