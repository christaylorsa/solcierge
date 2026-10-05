'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { sol, usd } from '@/lib/format'
import type { Quote } from '@/lib/types'

const VALIDITY = [
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '48 hours' },
  { hours: 72, label: '72 hours' },
  { hours: 168, label: '7 days' },
]

/**
 * Sets the binding USD figure.
 *
 * The live SOL conversion shown here is indicative only, which the copy says out
 * loud: the figure a member actually sends is derived again at pay-time inside a
 * ten-minute lock. Quoting an amount in SOL days ahead would be a promise about a
 * price nobody controls.
 */
export function QuoteEditor({
  requestId,
  existing,
  onDone,
}: {
  requestId: string
  existing: Quote | null
  onDone?: () => void
}) {
  const router = useRouter()
  const [amount, setAmount] = useState(existing ? String(existing.amount_usd) : '')
  const [hours, setHours] = useState(72)
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [status, setStatus] = useState<'idle' | 'saving' | 'error' | 'saved'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [solPrice, setSolPrice] = useState<number | null>(null)

  useEffect(() => {
    let live = true
    fetch('/api/price', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { usd?: number } | null) => {
        if (live && body?.usd) setSolPrice(body.usd)
      })
      .catch(() => {
        // The quote does not depend on this. Leave the hint blank.
      })
    return () => {
      live = false
    }
  }, [])

  const parsed = Number(amount)
  const valid = Number.isFinite(parsed) && parsed > 0

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!valid || status === 'saving') return

    setStatus('saving')
    setError(null)

    try {
      const res = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          amount_usd: parsed,
          valid_for_hours: hours,
          notes: notes.trim() || undefined,
        }),
      })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Could not save that quote.')

      setStatus('saved')
      router.refresh()
      onDone?.()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save that quote.')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-[1fr_1fr]">
        <label className="block">
          <span className="field-label">Amount USD</span>
          <input
            className="field"
            type="number"
            min={1}
            step={1}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="118000"
            required
          />
          <span className="mt-2 block text-xs text-faint">
            {valid && solPrice
              ? `About ${sol(parsed / solPrice)} at ${usd(solPrice, { cents: true })} per SOL, indicative only`
              : 'The binding figure. SOL is derived at pay-time.'}
          </span>
        </label>

        <label className="block">
          <span className="field-label">Hold this quote for</span>
          <select
            className="field"
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
          >
            {VALIDITY.map((option) => (
              <option key={option.hours} value={option.hours}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="mt-2 block text-xs text-faint">
            After this the member sees an expired quote, not a stale price.
          </span>
        </label>
      </div>

      <label className="block">
        <span className="field-label">What this includes</span>
        <textarea
          className="field min-h-[7rem] resize-y leading-relaxed"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Aircraft or property, what is covered, what is billed separately, deposits and their release terms."
        />
        <span className="mt-2 block text-xs text-faint">
          The member reads this verbatim. Be specific about exclusions.
        </span>
      </label>

      {error ? (
        <p className="border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={!valid || status === 'saving'}>
          {status === 'saving' ? 'Sending quote' : existing ? 'Replace quote' : 'Send quote'}
        </button>
        {existing ? (
          <p className="text-xs text-faint">
            Replacing supersedes the old quote and voids any rate lock the member holds.
          </p>
        ) : null}
      </div>
    </form>
  )
}
