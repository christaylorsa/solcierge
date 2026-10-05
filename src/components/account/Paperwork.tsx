import { formatBytes } from '@/lib/documents'
import { formatDate } from '@/lib/format'
import type { BookingRequestFull } from '@/lib/types'

export function hasPaperwork(request: BookingRequestFull): boolean {
  return Boolean(request.confirmation_ref || request.itinerary || request.documents.length > 0)
}

/** What the desk has handed the member: the booking reference, the itinerary and the files. */
export function Paperwork({ request }: { request: BookingRequestFull }) {
  return (
    <div className="border border-accent/40 bg-surface p-6 sm:p-7">
      <h2 className="eyebrow text-accent-soft">Your paperwork</h2>

      {request.confirmation_ref ? (
        <div className="mt-6">
          <p className="text-[0.6875rem] tracking-label uppercase text-faint">Booking reference</p>
          <p className="mt-1.5 select-all font-mono text-lg text-ink">{request.confirmation_ref}</p>
        </div>
      ) : null}

      {request.itinerary ? (
        <div className={request.confirmation_ref ? 'mt-7 border-t border-line pt-6' : 'mt-6'}>
          <p className="text-[0.6875rem] tracking-label uppercase text-faint">Itinerary and what to do</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">{request.itinerary}</p>
        </div>
      ) : null}

      {request.documents.length > 0 ? (
        <div className={request.confirmation_ref || request.itinerary ? 'mt-7 border-t border-line pt-6' : 'mt-6'}>
          <p className="text-[0.6875rem] tracking-label uppercase text-faint">Documents</p>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {request.documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={`/api/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener"
                  className="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3.5 transition-colors duration-300 ease hover:text-accent-soft"
                >
                  <span className="text-sm text-ink group-hover:text-accent-soft">{doc.title}</span>
                  <span className="text-xs text-faint">
                    {formatBytes(Number(doc.size_bytes))} · {formatDate(doc.created_at)} ·{' '}
                    <span className="tracking-label uppercase group-hover:text-accent">Open</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            Only you can open these, while signed in. Save a copy to your phone before you travel.
          </p>
        </div>
      ) : null}
    </div>
  )
}
