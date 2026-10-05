'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PaperworkEditor } from './PaperworkEditor'
import { PassengerManifest, type ManifestView } from './PassengerManifest'
import { QuoteEditor } from './QuoteEditor'
import { RequestDetails } from '@/components/account/RequestDetails'
import { StatusPill } from '@/components/account/StatusPill'
import { categoryName } from '@/lib/categories'
import { explorerTxUrl } from '@/lib/env'
import { formatDateTime, relativeTime, shortAddress, sol, usd, usdc } from '@/lib/format'
import type { BookingRequestFull, RequestStatus } from '@/lib/types'

/** Mirrors the transitions the API allows, so the UI never offers a move the server rejects. */
const NEXT: Record<RequestStatus, { status: RequestStatus; label: string }[]> = {
  pending: [{ status: 'cancelled', label: 'Cancel' }],
  quoted: [
    { status: 'pending', label: 'Back to sourcing' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  paid: [
    { status: 'fulfilled', label: 'Confirm booking' },
    { status: 'cancelled', label: 'Cancel and refund' },
  ],
  fulfilled: [],
  cancelled: [{ status: 'pending', label: 'Reopen' }],
}

export function AdminRequestCard({ request, manifest }: { request: BookingRequestFull; manifest: ManifestView | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(request.status === 'pending' || request.status === 'paid')
  const [busy, setBusy] = useState<RequestStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const quote = request.quote
  const quoteLive = quote ? Date.parse(quote.expires_at) > Date.now() : false

  const isFlight = request.category === 'jets'
  const hasPaperwork = Boolean(request.confirmation_ref || request.itinerary || request.documents.length > 0)
  const memberReach = {
    telegram: Boolean(request.user?.telegram_chat_id),
    email: Boolean(request.user?.email || request.details?.contact_email),
  }

  async function move(status: RequestStatus) {
    const missing = [
      isFlight && !manifest ? 'passenger details' : null,
      !hasPaperwork ? 'paperwork' : null,
    ].filter(Boolean)
    if (
      status === 'fulfilled' &&
      !window.confirm(
        missing.length === 0
          ? 'Confirm this booking? The client is told it is confirmed and that their paperwork is ready. Their passenger list locks.'
          : `No ${missing.join(' or ')} yet. Confirm anyway? The client is told it is confirmed and that their paperwork is ready.`,
      )
    ) {
      return
    }
    setBusy(status)
    setError(null)
    try {
      const res = await fetch(`/api/admin/requests/${request.id}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Could not update that request.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update that request.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="border border-line bg-surface">
      <div className="grid gap-4 p-5 md:grid-cols-[1.5fr_1fr_auto] md:items-start md:gap-8 md:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow">{categoryName(request.category)}</p>
            <StatusPill status={request.status} />
          </div>

          <p className="display mt-2.5 text-2xl text-ink">{headline(request)}</p>

          <p className="mt-2 text-xs text-faint">
            {request.user?.name ? `${request.user.name} · ` : ''}
            {request.user?.wallet_address ? (
              <span className="font-mono">{shortAddress(request.user.wallet_address, 4)}</span>
            ) : (
              (request.user?.email ?? 'unknown member')
            )}
            {' · '}
            {relativeTime(request.created_at)}
            {memberReach.telegram ? ' · Telegram linked' : ''}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div>
            <dt className="text-faint">Budget</dt>
            <dd className="mt-0.5 text-muted">
              {request.budget_max ? usd(Number(request.budget_max)) : 'open'}
            </dd>
          </div>
          <div>
            <dt className="text-faint">Quoted</dt>
            <dd className={`mt-0.5 ${quote ? (quoteLive ? 'text-accent-soft' : 'text-danger') : 'text-muted'}`}>
              {quote ? usd(Number(quote.amount_usd)) : 'not yet'}
            </dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="btn btn-ghost !py-2.5 !px-4 justify-self-start"
          aria-expanded={open}
        >
          {open ? 'Close' : 'Work it'}
        </button>
      </div>

      {open ? (
        <div className="border-t border-line p-5 md:p-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <h3 className="eyebrow">The brief</h3>
              <div className="mt-5">
                <RequestDetails request={request} />
              </div>

              {request.user?.phone || request.user?.contact_email || request.details?.contact_email ? (
                <p className="mt-6 text-xs text-faint">
                  Contact:{' '}
                  {[request.user?.email ?? request.user?.contact_email ?? request.details?.contact_email, request.user?.phone]
                    .filter(Boolean)
                    .map((value, index) => (
                      <span key={index} className="select-all text-muted">
                        {index > 0 ? ' · ' : ''}
                        {value}
                      </span>
                    ))}
                </p>
              ) : null}

              {request.payment ? (
                <div className="mt-8 border-t border-line pt-6">
                  <h3 className="eyebrow text-success">Payment</h3>
                  <p className="mt-3 text-sm text-ink">
                    {request.payment.token === 'SOL'
                      ? sol(Number(request.payment.amount))
                      : usdc(Number(request.payment.amount))}{' '}
                    <span className="text-faint">
                      on {formatDateTime(request.payment.confirmed_at)}
                    </span>
                  </p>
                  <a
                    href={explorerTxUrl(request.payment.tx_signature)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline mt-2 inline-block font-mono text-xs"
                  >
                    {shortAddress(request.payment.tx_signature, 8)}
                  </a>
                </div>
              ) : null}

              {isFlight && (request.status === 'paid' || request.status === 'fulfilled') ? (
                <div className="mt-8 border-t border-line pt-6">
                  <h3 className="eyebrow">
                    Passengers{manifest ? ` · ${manifest.passenger_count}` : ''}
                  </h3>
                  <div className="mt-4">
                    <PassengerManifest manifest={manifest} waiting={request.status === 'paid'} />
                  </div>
                </div>
              ) : null}

              {request.status !== 'cancelled' ? (
                <div className="mt-8 border-t border-line pt-6">
                  <h3 className="eyebrow">Paperwork for the client</h3>
                  <p className="mt-2 text-xs leading-relaxed text-faint">
                    Shown on the client&apos;s booking page as soon as you save or upload.
                  </p>
                  <div className="mt-5">
                    <PaperworkEditor
                      requestId={request.id}
                      confirmationRef={request.confirmation_ref}
                      itinerary={request.itinerary}
                      documents={request.documents}
                      memberReach={memberReach}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="eyebrow">{quote ? 'Re-quote' : 'Set a quote'}</h3>
              {quote ? (
                <p className="mt-3 text-xs text-faint">
                  Current quote {usd(Number(quote.amount_usd))},{' '}
                  {quoteLive
                    ? `valid until ${formatDateTime(quote.expires_at)}`
                    : `expired ${relativeTime(quote.expires_at)}`}
                </p>
              ) : null}

              <div className="mt-5">
                {request.status === 'paid' || request.status === 'fulfilled' ? (
                  <p className="text-sm leading-relaxed text-muted">
                    This booking is settled. Re-quoting a paid request is blocked, since the
                    member has already sent funds against the figure above.
                  </p>
                ) : (
                  <QuoteEditor requestId={request.id} existing={quote} />
                )}
              </div>

              {NEXT[request.status].length > 0 ? (
                <div className="mt-9 border-t border-line pt-6">
                  <h3 className="eyebrow">Move it</h3>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {NEXT[request.status].map((option) => (
                      <button
                        key={option.status}
                        type="button"
                        onClick={() => void move(option.status)}
                        disabled={busy !== null}
                        className="btn btn-ghost !py-2.5 !px-4"
                      >
                        {busy === option.status ? 'Saving' : option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-faint">
                    Paid is never set here. Only a verified on-chain transfer moves a request to
                    paid. Confirming a booking messages the client.
                  </p>
                </div>
              ) : null}

              {error ? (
                <p className="mt-5 border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  )
}

function headline(request: BookingRequestFull): string {
  const d = request.details ?? {}
  if (d.origin && d.destination) return `${d.origin} to ${d.destination}`
  if (d.location) return d.location
  return categoryName(request.category)
}
