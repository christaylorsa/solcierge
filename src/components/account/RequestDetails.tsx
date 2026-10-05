import { budgetRange, dateWindow, formatDate } from '@/lib/format'
import type { BookingRequestFull } from '@/lib/types'

/** The brief as the member wrote it. Shared by the account detail page and the operator desk. */
export function RequestDetails({ request }: { request: BookingRequestFull }) {
  const d = request.details ?? {}
  const rows: [string, string][] = []

  if (d.origin || d.destination) {
    rows.push(['Route', [d.origin, d.destination].filter(Boolean).join(' to ') || '—'])
  }
  if (d.location) rows.push(['Where', d.location])
  if (d.trip) {
    rows.push(['Depart', d.start_date ? formatDate(d.start_date) : 'Date open'])
    rows.push(['Return', d.trip === 'one_way' ? 'One way' : d.end_date ? formatDate(d.end_date) : 'Date open'])
  } else {
    rows.push(['When', dateWindow(d.start_date, d.end_date)])
  }
  if (d.party_size) rows.push(['Party', `${d.party_size} ${d.party_size === 1 ? 'guest' : 'guests'}`])
  rows.push(['Budget', budgetRange(request.budget_min, request.budget_max)])

  return (
    <div>
      <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[0.6875rem] tracking-label uppercase text-faint">{label}</dt>
            <dd className="mt-1.5 text-sm text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      {d.details ? (
        <div className="mt-8 border-t border-line pt-6">
          <p className="text-[0.6875rem] tracking-label uppercase text-faint">The brief</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{d.details}</p>
        </div>
      ) : null}
    </div>
  )
}
