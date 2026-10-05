import { STATUS_COPY } from '@/lib/format'
import type { RequestStatus } from '@/lib/types'

const TONE: Record<RequestStatus, string> = {
  pending: 'border-line text-muted',
  quoted: 'border-accent/50 text-accent-soft',
  paid: 'border-success/45 text-success',
  fulfilled: 'border-success/30 text-success/80',
  cancelled: 'border-line text-faint',
}

export function StatusPill({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[0.625rem] tracking-label uppercase ${TONE[status]}`}
    >
      <span className="block h-1 w-1 rounded-full bg-current" aria-hidden="true" />
      {STATUS_COPY[status].label}
    </span>
  )
}
