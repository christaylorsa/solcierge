'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { countryOptions } from '@/lib/countries'
import {
  EMPTY_PASSENGER,
  MAX_PASSENGERS,
  checkPassengers,
  expiresSoonAfter,
  type Passenger,
} from '@/lib/passengers'

type FieldError = { index: number; field: keyof Passenger | null; message: string }

/**
 * The passenger list for a paid flight: what the operator needs to confirm, and what
 * goes to border authorities as advance passenger information. Checked here for
 * quick feedback; the API checks again and is what counts.
 */
export function PassengerForm({
  requestId,
  initial,
  partySize,
  travelDate,
}: {
  requestId: string
  initial: Passenger[] | null
  partySize: number | null
  travelDate: string | null
}) {
  const router = useRouter()
  const countries = useMemo(() => countryOptions(), [])
  const [passengers, setPassengers] = useState<Passenger[]>(
    initial && initial.length > 0
      ? initial
      : Array.from({ length: Math.min(Math.max(partySize ?? 1, 1), MAX_PASSENGERS) }, () => ({ ...EMPTY_PASSENGER })),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(initial !== null && initial.length > 0)
  const [error, setError] = useState<FieldError | null>(null)
  const today = new Date().toISOString().slice(0, 10)

  function update(index: number, field: keyof Passenger, value: string) {
    setPassengers((list) => list.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
    setSaved(false)
    if (error?.index === index && error.field === field) setError(null)
  }

  function add() {
    setPassengers((list) => (list.length >= MAX_PASSENGERS ? list : [...list, { ...EMPTY_PASSENGER }]))
    setSaved(false)
  }

  function remove(index: number) {
    setPassengers((list) => list.filter((_, i) => i !== index))
    setSaved(false)
    setError(null)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const checked = checkPassengers(passengers, { today, travelDate })
    if (!checked.ok) {
      setError(checked.error)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/requests/${requestId}/passengers`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passengers: checked.passengers }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; index?: number; field?: keyof Passenger }
      if (!res.ok) {
        setError({ index: body.index ?? -1, field: body.field ?? null, message: body.error ?? 'Could not save. Try again.' })
        return
      }
      setPassengers(checked.passengers)
      setSaved(true)
      router.refresh()
    } catch {
      setError({ index: -1, field: null, message: 'Could not reach us. Check your connection and try again.' })
    } finally {
      setSaving(false)
    }
  }

  const invalid = (index: number, field: keyof Passenger) => error?.index === index && error.field === field

  return (
    <form onSubmit={submit} className="border border-accent/40 bg-surface p-6 sm:p-7" noValidate>
      <h2 className="eyebrow text-accent-soft">Passenger details</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The operator needs these to confirm your flight. Enter every name exactly as it appears in
        the passport. You can edit them until we confirm the booking.
      </p>

      <div className="mt-7 space-y-8">
        {passengers.map((p, index) => (
          <fieldset key={index} className="border-t border-line pt-6">
            <div className="flex items-baseline justify-between gap-4">
              <legend className="text-[0.6875rem] tracking-label uppercase text-faint">Passenger {index + 1}</legend>
              {passengers.length > 1 ? (
                <button type="button" onClick={() => remove(index)} className="btn btn-quiet !px-0 !py-0 text-xs">
                  Remove
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="field-label">Full name, as in the passport</span>
                <input
                  className="field"
                  value={p.full_name}
                  onChange={(event) => update(index, 'full_name', event.target.value)}
                  autoComplete={index === 0 ? 'name' : 'off'}
                  maxLength={120}
                  aria-invalid={invalid(index, 'full_name')}
                  required
                />
              </label>
              <label className="block">
                <span className="field-label">Date of birth</span>
                <input
                  className="field"
                  type="date"
                  value={p.date_of_birth}
                  max={today}
                  onChange={(event) => update(index, 'date_of_birth', event.target.value)}
                  autoComplete={index === 0 ? 'bday' : 'off'}
                  aria-invalid={invalid(index, 'date_of_birth')}
                  required
                />
              </label>
              <label className="block">
                <span className="field-label">Nationality</span>
                <select
                  className="field"
                  value={p.nationality}
                  onChange={(event) => update(index, 'nationality', event.target.value)}
                  aria-invalid={invalid(index, 'nationality')}
                  required
                >
                  <option value="">Choose</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="field-label">Passport number</span>
                <input
                  className="field font-mono uppercase"
                  value={p.passport_number}
                  onChange={(event) => update(index, 'passport_number', event.target.value)}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={24}
                  aria-invalid={invalid(index, 'passport_number')}
                  required
                />
              </label>
              <label className="block">
                <span className="field-label">Passport expiry</span>
                <input
                  className="field"
                  type="date"
                  value={p.passport_expiry}
                  min={today}
                  onChange={(event) => update(index, 'passport_expiry', event.target.value)}
                  autoComplete="off"
                  aria-invalid={invalid(index, 'passport_expiry')}
                  required
                />
                {p.passport_expiry && p.passport_expiry >= today && expiresSoonAfter(p.passport_expiry, travelDate, today) ? (
                  <span className="mt-2 block text-xs text-accent-soft">
                    Expires within six months of travel. Some countries refuse entry on that, so check
                    the rules for your destination.
                  </span>
                ) : null}
              </label>
            </div>
          </fieldset>
        ))}
      </div>

      {passengers.length < MAX_PASSENGERS ? (
        <button type="button" onClick={add} className="btn btn-quiet mt-6 !px-0">
          + Add a passenger
        </button>
      ) : null}

      <div className="mt-7 border-l-2 border-accent/50 bg-bg/40 py-4 pl-5 pr-4">
        <p className="text-[0.6875rem] tracking-label uppercase text-accent-soft">Your privacy</p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          We treat passenger data with the utmost care. It is encrypted the moment it reaches us,
          seen only by the concierge handling your booking and the aircraft operator, who must file
          it with border authorities, and used for nothing else. We delete it automatically a short
          time after your trip.
        </p>
      </div>

      {error ? (
        <p className="mt-6 border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-5">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving securely' : saved ? 'Save changes' : 'Send passenger details'}
        </button>
        {saved && !saving ? (
          <p className="text-xs text-success" role="status">
            Saved. The desk has them and will confirm with the operator.
          </p>
        ) : null}
      </div>
    </form>
  )
}
