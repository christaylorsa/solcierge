import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminRequestCard } from '@/components/admin/AdminRequestCard'
import { SignedOutPanel } from '@/components/account/SignedOutPanel'
import { Section, SectionHead } from '@/components/site/Section'
import { getViewer } from '@/lib/auth'
import { countByStatus, getMemberSignals, listAllRequests, type MemberSignal } from '@/lib/data'
import { getManifests, type Manifest } from '@/lib/manifests'
import { REQUEST_STATUSES, isRequestStatus, type RequestStatus } from '@/lib/types'
import { STATUS_COPY } from '@/lib/format'

export const metadata: Metadata = { title: 'Operator desk', robots: { index: false } }
export const dynamic = 'force-dynamic'

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const [query, viewer] = await Promise.all([searchParams, getViewer()])

  if (!viewer) {
    return (
      <Section>
        <SectionHead eyebrow="Operator desk" title="Sign in to continue" />
        <div className="mt-12 max-w-md">
          <SignedOutPanel />
        </div>
      </Section>
    )
  }

  if (!viewer.isAdmin) {
    return (
      <Section>
        <SectionHead
          eyebrow="Operator desk"
          title="Not your desk"
          lede="This area is restricted to Solcierge operators. If it should be yours, add the wallet to ADMIN_WALLETS and sign in again."
        />
        <Link href="/account" className="btn btn-ghost mt-10">
          Back to my bookings
        </Link>
      </Section>
    )
  }

  const filter = isRequestStatus(query.status) ? query.status : undefined

  let requests: Awaited<ReturnType<typeof listAllRequests>> = []
  let counts: Record<RequestStatus, number> | null = null
  let manifests = new Map<string, Manifest>()
  let signals = new Map<string, MemberSignal>()
  let loadError: string | null = null

  try {
    ;[requests, counts] = await Promise.all([listAllRequests(filter), countByStatus()])
    ;[manifests, signals] = await Promise.all([
      getManifests(
        requests.filter((r) => r.category === 'jets' && (r.status === 'paid' || r.status === 'fulfilled')).map((r) => r.id),
      ),
      getMemberSignals(requests.map((r) => r.user_id)),
    ])
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Could not load the desk.'
  }

  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0

  return (
    <Section>
      <SectionHead
        eyebrow="Operator desk"
        title="Requests"
        lede="Everything on the desk, newest first. Set a quote in USD and the member converts at pay-time under a ten-minute lock."
      />

      {loadError ? (
        <p className="mt-12 border border-danger/40 bg-surface p-6 text-sm leading-relaxed text-danger">
          {loadError} Check the Supabase keys and that <code>supabase/schema.sql</code> has been run.
        </p>
      ) : (
        <>
          <div className="mt-12 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            <FilterChip href="/admin" active={!filter} label="All" count={total} />
            {REQUEST_STATUSES.map((status) => (
              <FilterChip
                key={status}
                href={`/admin?status=${status}`}
                active={filter === status}
                label={STATUS_COPY[status].label}
                count={counts?.[status] ?? 0}
              />
            ))}
          </div>

          {requests.length === 0 ? (
            <p className="mt-12 border border-line bg-surface p-8 text-sm text-muted">
              Nothing here{filter ? ` with status ${filter}` : ' yet'}. Seed the database with{' '}
              <code>supabase/seed.sql</code> to see every state.
            </p>
          ) : (
            <div className="mt-10 space-y-4">
              {requests.map((request) => (
                <AdminRequestCard
                  key={request.id}
                  request={request}
                  manifest={manifests.get(request.id) ?? null}
                  signal={signals.get(request.user_id) ?? null}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Section>
  )
}

function FilterChip({
  href,
  active,
  label,
  count,
}: {
  href: string
  active: boolean
  label: string
  count: number
}) {
  return (
    <Link
      href={href}
      className={`border px-3.5 py-2 text-xs tracking-wide transition-colors duration-400 ease ${
        active
          ? 'border-accent bg-accent/10 text-accent-soft'
          : 'border-line text-muted hover:border-accent/40 hover:text-ink'
      }`}
      aria-current={active ? 'true' : undefined}
    >
      {label}
      <span className="ml-2 text-faint">{count}</span>
    </Link>
  )
}
