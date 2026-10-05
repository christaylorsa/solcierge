import { countryName } from '@/lib/countries'
import { formatDate } from '@/lib/format'
import { maskPassport, type Passenger } from '@/lib/passengers'

/** The locked passenger list on a confirmed flight. Passport numbers are masked. */
export function PassengerList({ passengers }: { passengers: Passenger[] }) {
  return (
    <div className="border border-line bg-surface p-6 sm:p-7">
      <h2 className="eyebrow">Passengers</h2>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {passengers.map((p, index) => (
          <li key={index} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
            <span className="text-sm text-ink">{p.full_name}</span>
            <span className="text-xs text-faint">
              {countryName(p.nationality)} · passport <span className="font-mono">{maskPassport(p.passport_number)}</span>{' '}
              · valid to {formatDate(p.passport_expiry)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-faint">
        Sent to the operator and locked. To change a passenger, contact the desk. These details are
        deleted automatically a short time after your trip.
      </p>
    </div>
  )
}
