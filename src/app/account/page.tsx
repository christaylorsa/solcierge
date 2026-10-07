import type { Metadata } from 'next'
import Link from 'next/link'
import { Reveal } from '@/components/motion/Reveal'
import { StatusPill } from '@/components/account/StatusPill'
import { SignedOutPanel } from '@/components/account/SignedOutPanel'
import { Section, SectionHead } from '@/components/site/Section'
import { getViewer } from '@/lib/auth'
import { hasTelegramLinked, listRequestsForUser } from '@/lib/data'
import { TelegramConnect } from '@/components/account/TelegramConnect'
import { requestTitle } from '@/lib/categories'
import { budgetRange, dateWindow, formatDate, relativeTime, shortAddress, usd } from '@/lib/format'
import type { BookingRequestFull } from '@/lib/types'

export const metadata: Metadata = { title: 'My bookings' }
export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const viewer = await getViewer()

  if (!viewer) {
    return (
      <Section>
        <SectionHead
          eyebrow="Your account"
          title="Sign in to see your bookings"
          lede="Your wallet address is your account. Connect it and everything you have ever asked us for is here."
        />
        <div className="mt-12 max-w-md">
          <SignedOutPanel />
        </div>
      </Section>
    )
  }

  let requests: BookingRequestFull[] = []
  let telegramLinked = false
  let loadError: string | null = null
  try {
    ;[requests, telegramLinked] = await Promise.all([listRequestsForUser(viewer.id), hasTelegramLinked(viewer.id)])
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load your bookings.'
  }

  const open = requests.filter((r) => r.status === 'pending' || r.status === 'quoted')
  const settled = requests.filter((r) => r.status !== 'pending' && r.status !== 'quoted')

  return (
    <Section>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionHead
          eyebrow={viewer.wallet_address ? shortAddress(viewer.wallet_address, 6) : (viewer.email ?? 'Member')}
          title={viewer.name ? `Good to see you, ${viewer.name.split(' ')[0]}` : 'Your bookings'}
        />
        <div className="flex flex-wrap gap-3">
          <Link href="/account/profile" className="btn btn-ghost">
            Profile
          </Link>
          <Link href="/request" className="btn btn-primary">
            New request
          </Link>
        </div>
      </div>

      {loadError ? (
        <p className="mt-12 border border-danger/40 bg-surface p-6 text-sm leading-relaxed text-danger">
          {loadError} If this is a fresh clone, run the SQL in <code>supabase/schema.sql</code> and
          check your Supabase keys.
        </p>
      ) : requests.length === 0 ? (
        <div className="mt-12 border border-line bg-surface p-8">
          <p className="display text-2xl text-ink">Nothing on the desk yet</p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
            Pick a category and tell us what you want. First quotes usually come back within
            ninety minutes, and there is no fee to ask.
          </p>
          <Link href="/request" className="btn btn-ghost mt-7">
            Make your first request
          </Link>
        </div>
      ) : (
        <div className="mt-14 space-y-16">
          {open.length > 0 ? <Group title="Live" requests={open} /> : null}
          {settled.length > 0 ? <Group title="History" requests={settled} /> : null}
        </div>
      )}

      {loadError ? null : (
        <div id="updates" className="mt-16 max-w-md">
          <TelegramConnect connected={telegramLinked} />
        </div>
      )}
    </Section>
  )
}

function Group({ title, requests }: { title: string; requests: BookingRequestFull[] }) {
  return (
    <div>
      <h2 className="eyebrow">
        {title} · {requests.length}
      </h2>

      <div className="mt-6 divide-y divide-line border-y border-line">
        {requests.map((request) => (
          <Reveal key={request.id}>
            <Link
              href={`/account/${request.id}`}
              className="group grid gap-4 py-7 transition-colors duration-500 ease hover:bg-surface md:grid-cols-[1.4fr_1fr_auto] md:items-center md:gap-8 md:px-4"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="eyebrow">{requestTitle(request.category, request.details)}</p>
                  <StatusPill status={request.status} />
                </div>
                <p className="display mt-2.5 text-xl text-ink md:text-2xl">
                  {headline(request)}
                </p>
                <p className="mt-1.5 text-xs text-faint">
                  Asked {relativeTime(request.created_at)}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div>
                  <dt className="text-faint">Dates</dt>
                  <dd className="mt-0.5 text-muted">
                    {dateWindow(request.details?.start_date, request.details?.end_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-faint">{request.quote ? 'Quoted' : 'Budget'}</dt>
                  <dd className="mt-0.5 text-muted">
                    {request.quote
                      ? usd(Number(request.quote.amount_usd))
                      : budgetRange(request.budget_min, request.budget_max)}
                  </dd>
                </div>
              </dl>

              <span className="text-[0.6875rem] tracking-label uppercase text-faint transition-colors duration-500 ease group-hover:text-accent">
                {request.status === 'quoted'
                  ? 'Review and pay'
                  : request.documents.length > 0 || request.confirmation_ref
                    ? 'View paperwork'
                    : 'Open'}
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

/** A one-line label for a request, built from whatever the member actually gave us. */
function headline(request: BookingRequestFull): string {
  const d = request.details ?? {}
  if (d.origin && d.destination) return `${d.origin} to ${d.destination}`
  if (d.location) return d.location
  if (d.start_date) return formatDate(d.start_date)
  return requestTitle(request.category, d)
}
