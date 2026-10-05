import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PayPanel } from '@/components/pay/PayPanel'
import { Paperwork, hasPaperwork } from '@/components/account/Paperwork'
import { PassengerForm } from '@/components/account/PassengerForm'
import { PassengerList } from '@/components/account/PassengerList'
import { TelegramConnect } from '@/components/account/TelegramConnect'
import { RequestDetails } from '@/components/account/RequestDetails'
import { StatusPill } from '@/components/account/StatusPill'
import { SignedOutPanel } from '@/components/account/SignedOutPanel'
import { Section, SectionHead } from '@/components/site/Section'
import { getViewer } from '@/lib/auth'
import { getRequest, hasTelegramLinked } from '@/lib/data'
import { getManifest } from '@/lib/manifests'
import { lastTravelDate } from '@/lib/passengers'
import { categoryName } from '@/lib/categories'
import { explorerTxUrl } from '@/lib/env'
import { STATUS_COPY, formatDateTime, relativeTime, shortAddress, sol, usd, usdc } from '@/lib/format'

export const metadata: Metadata = { title: 'Booking' }
export const dynamic = 'force-dynamic'

export default async function RequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const [{ id }, query, viewer] = await Promise.all([params, searchParams, getViewer()])

  if (!viewer) {
    return (
      <Section>
        <SectionHead eyebrow="Your account" title="Sign in to see this booking" />
        <div className="mt-12 max-w-md">
          <SignedOutPanel />
        </div>
      </Section>
    )
  }

  const [request, telegramLinked] = await Promise.all([getRequest(id, viewer.id), hasTelegramLinked(viewer.id)])
  if (!request) notFound()

  // Flights collect a passenger list once paid; it locks when the desk confirms.
  const isFlight = request.category === 'jets'
  const manifest =
    isFlight && (request.status === 'paid' || request.status === 'fulfilled') ? await getManifest(request.id) : null
  const needsPassengers = isFlight && request.status === 'paid' && !manifest

  const quote = request.quote
  const quoteLive = quote ? Date.parse(quote.expires_at) > Date.now() : false
  const payable = request.status === 'quoted' && quote !== null

  return (
    <Section>
      <nav className="flex items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
        <Link href="/account" className="transition-colors duration-300 ease hover:text-accent-soft">
          My bookings
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-muted">{categoryName(request.category)}</span>
      </nav>

      {query.new ? (
        <p className="mt-8 border-l-2 border-accent bg-surface py-4 pl-5 pr-4 text-sm leading-relaxed text-accent-soft">
          Received. A concierge is on it, and you will see a quote here as soon as it lands.
          {request.details?.start_date || request.budget_max
            ? ' Nothing else is needed from you for now.'
            : ''}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <h1 className="display text-[clamp(2rem,5vw,3.25rem)] text-ink">
          {categoryName(request.category)}
        </h1>
        <StatusPill status={request.status} />
      </div>

      <p className="mt-3 text-sm text-muted">{STATUS_COPY[request.status].hint}</p>
      <p className="mt-1 text-xs text-faint">
        Reference {request.id.slice(0, 8)} · asked {relativeTime(request.created_at)}
      </p>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
        <div className="space-y-12">
          {isFlight && request.status === 'paid' ? (
            <PassengerForm
              requestId={request.id}
              initial={manifest?.passengers ?? null}
              partySize={request.details?.party_size ?? null}
              travelDate={lastTravelDate(request.details ?? {})}
            />
          ) : null}

          {hasPaperwork(request) ? <Paperwork request={request} /> : null}

          {isFlight && request.status === 'fulfilled' && manifest?.passengers ? (
            <PassengerList passengers={manifest.passengers} />
          ) : null}

          <div className="border border-line bg-surface p-6 sm:p-7">
            <h2 className="eyebrow">Your request</h2>
            <div className="mt-6">
              <RequestDetails request={request} />
            </div>
          </div>

          {quote ? (
            <div className="border border-line bg-surface p-6 sm:p-7">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="eyebrow">The quote</h2>
                <p className={`text-xs ${quoteLive ? 'text-faint' : 'text-danger'}`}>
                  {quoteLive
                    ? `Valid until ${formatDateTime(quote.expires_at)}`
                    : `Expired ${relativeTime(quote.expires_at)}`}
                </p>
              </div>

              <p className="display mt-5 text-4xl text-ink">{usd(Number(quote.amount_usd))}</p>

              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-xs text-faint">
                <span>
                  Indicative at quote time:{' '}
                  <span className="text-muted">
                    {quote.amount_sol ? sol(Number(quote.amount_sol)) : '—'}
                  </span>
                </span>
                <span>
                  or <span className="text-muted">{usdc(Number(quote.amount_usdc))}</span>
                </span>
              </div>

              {quote.notes ? (
                <div className="mt-7 border-t border-line pt-6">
                  <p className="text-[0.6875rem] tracking-label uppercase text-faint">
                    What this includes
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                    {quote.notes}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {request.payment ? (
            <div className="border border-success/40 bg-surface p-6 sm:p-7">
              <h2 className="eyebrow text-success">Settled on chain</h2>
              <dl className="mt-6 space-y-4">
                <Row label="Paid">
                  {request.payment.token === 'SOL'
                    ? sol(Number(request.payment.amount))
                    : usdc(Number(request.payment.amount))}
                </Row>
                <Row label="Confirmed">{formatDateTime(request.payment.confirmed_at)}</Row>
                {request.payment.payer ? (
                  <Row label="From">
                    <span className="font-mono">{shortAddress(request.payment.payer, 5)}</span>
                  </Row>
                ) : null}
                <Row label="Signature">
                  <a
                    href={explorerTxUrl(request.payment.tx_signature)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline font-mono"
                  >
                    {shortAddress(request.payment.tx_signature, 8)}
                  </a>
                </Row>
              </dl>
              <p className="mt-6 text-xs leading-relaxed text-faint">
                This receipt lives on Solana, not only in our database. The explorer link is the
                record of what you paid.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-6 lg:sticky lg:top-[96px] lg:self-start">
          {payable && quote ? (
            <PayPanel requestId={request.id} quote={quote} />
          ) : (
            <div className="border border-line bg-surface p-6 sm:p-7">
              <p className="eyebrow">{STATUS_COPY[request.status].label}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                {needsPassengers
                  ? 'Payment received and verified on chain. Next, add the passenger details so we can confirm your flight with the operator.'
                  : waitingCopy(request.status)}
              </p>
              {request.status === 'pending' ? (
                <p className="mt-6 text-xs leading-relaxed text-faint">
                  Most quotes land inside ninety minutes during desk hours. If the request is
                  unusual, expect a question from us before a number.
                </p>
              ) : null}
            </div>
          )}

          {request.status !== 'cancelled' ? <TelegramConnect connected={telegramLinked} /> : null}
        </div>
      </div>
    </Section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-[0.6875rem] tracking-label uppercase text-faint">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  )
}

function waitingCopy(status: string): string {
  switch (status) {
    case 'pending':
      return 'A concierge has your brief and is working it against operators we hold accounts with. You will get one figure with the reasoning behind it, not a list of links.'
    case 'paid':
      return 'Funds received and verified on chain. We are confirming with the supplier now. Your booking reference, itinerary and documents will appear on this page as soon as it is signed.'
    case 'fulfilled':
      return 'Booked and confirmed. Your reference, itinerary and documents are on this page. If anything needs changing, contact the desk and it reaches the same concierge.'
    case 'cancelled':
      return 'This request is closed and nothing was charged. If circumstances changed, send a fresh request and we will re-source it.'
    default:
      return 'The desk will be in touch.'
  }
}
