'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useSession } from '@/components/auth/SessionProvider'
import { EmailSignIn } from '@/components/auth/EmailSignIn'
import { AirportInput } from './AirportInput'
import { LocationPicker } from './LocationPicker'
import { isPlaceCategory, type PlaceCategory } from '@/lib/places'
import type { Category } from '@/lib/categories'
import type { Experience } from '@/lib/experiences'

type Values = {
  origin: string
  destination: string
  location: string
  start_date: string
  end_date: string
  party_size: string
  budget_min: string
  budget_max: string
  details: string
  contact_name: string
  contact_email: string
}

const EMPTY: Values = {
  origin: '',
  destination: '',
  location: '',
  start_date: '',
  end_date: '',
  party_size: '2',
  budget_min: '',
  budget_max: '',
  details: '',
  contact_name: '',
  contact_email: '',
}

const MIN_DETAILS = 20

/** With `experience`, the brief is for that experience: its bases replace the place search. */
export function RequestForm({ category, experience }: { category: Category; experience?: Experience }) {
  const { viewer, loaded } = useSession()
  const { setVisible } = useWalletModal()
  const router = useRouter()

  const [values, setValues] = useState<Values>(EMPTY)
  const [status, setStatus] = useState<'idle' | 'sending' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [field, setField] = useState<string | null>(null)
  // Flights only. Off means one way, and the return date is cleared and locked.
  const [returnFlight, setReturnFlight] = useState(false)

  const set = (key: keyof Values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }))

  const setValue = (key: keyof Values) => (value: string) => setValues((current) => ({ ...current, [key]: value }))

  const has = (name: Parameters<typeof category.fields.includes>[0]) => category.fields.includes(name)
  const isFlight = has('route')
  const wantsEndDate = has('dates') && (!isFlight || returnFlight)

  if (!loaded) {
    return <div className="border border-line bg-surface p-8 text-sm text-faint">Checking your session</div>
  }

  if (!viewer) {
    return (
      <div className="border border-line bg-surface p-8">
        <p className="eyebrow">One step first</p>
        <h2 className="display mt-4 text-3xl text-ink">Connect a wallet</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Your wallet address is your account, so there is nothing to fill in and no password to
          keep. You will be asked to sign a short message, which proves the wallet is yours. It
          authorises no transaction.
        </p>

        <button type="button" onClick={() => setVisible(true)} className="btn btn-primary mt-7 w-full sm:w-auto">
          Connect wallet
        </button>

        <div className="mt-9 border-t border-line pt-7">
          <EmailSignIn />
        </div>
      </div>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (status === 'sending') return

    if (values.details.trim().length < MIN_DETAILS) {
      setError('Give us at least a sentence or two to work with.')
      setField('details')
      setStatus('error')
      return
    }

    setStatus('sending')
    setError(null)
    setField(null)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          category: category.slug,
          origin: has('route') ? values.origin.trim() || undefined : undefined,
          destination: has('route') ? values.destination.trim() || undefined : undefined,
          location: has('location') ? values.location.trim() || undefined : undefined,
          start_date: values.start_date || undefined,
          end_date: wantsEndDate ? values.end_date || undefined : undefined,
          trip: isFlight ? (returnFlight ? 'return' : 'one_way') : undefined,
          experience: experience?.slug,
          party_size: has('party_size') && values.party_size ? Number(values.party_size) : undefined,
          budget_min: values.budget_min ? Number(values.budget_min) : undefined,
          budget_max: values.budget_max ? Number(values.budget_max) : undefined,
          details: values.details.trim(),
          contact_name: values.contact_name.trim() || undefined,
          contact_email: values.contact_email.trim() || undefined,
        }),
      })

      const body = (await res.json()) as { request?: { id: string }; error?: string; field?: string }
      if (!res.ok || !body.request) {
        setField(body.field ?? null)
        throw new Error(body.error ?? 'That request could not be sent.')
      }

      router.push(`/account/${body.request.id}?new=1`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'That request could not be sent.')
      setStatus('error')
    }
  }

  const sending = status === 'sending'

  return (
    <form onSubmit={submit} className="border border-line bg-surface p-6 sm:p-8" noValidate>
      <div className="space-y-6">
        {has('route') ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="From" hint="City, airport or code">
              <AirportInput value={values.origin} onChange={setValue('origin')} placeholder="Nice (NCE)" />
            </Field>
            <Field label="To" hint="City, airport or code">
              <AirportInput value={values.destination} onChange={setValue('destination')} placeholder="Ibiza (IBZ)" />
            </Field>
          </div>
        ) : null}

        {experience ? (
          <BasePicker bases={experience.bases} value={values.location} onChange={setValue('location')} />
        ) : has('location') && isPlaceCategory(category.slug) ? (
          <LocationPicker
            category={category.slug}
            value={values.location}
            onChange={setValue('location')}
            {...LOCATION_COPY[category.slug]}
          />
        ) : null}

        {isFlight ? (
          <ReturnSwitch
            checked={returnFlight}
            onChange={(next) => {
              setReturnFlight(next)
              if (!next) setValues((current) => ({ ...current, end_date: '' }))
            }}
          />
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={isFlight ? 'Depart' : has('dates') ? 'First day' : 'Date'}>
            <input className="field" type="date" value={values.start_date} onChange={set('start_date')} />
          </Field>

          {has('dates') ? (
            <Field
              label={isFlight ? 'Return' : 'Last day'}
              hint={
                isFlight
                  ? returnFlight
                    ? 'Leave blank if the return date is still open'
                    : 'One way. Switch on return flight to add a date'
                  : 'Leave blank for a single day'
              }
            >
              <input
                className="field disabled:cursor-not-allowed disabled:opacity-40"
                type="date"
                value={values.end_date}
                min={values.start_date || undefined}
                onChange={set('end_date')}
                disabled={!wantsEndDate}
                aria-invalid={field === 'end_date'}
              />
            </Field>
          ) : null}

          {has('party_size') && !has('dates') ? (
            <Field label="Party size">
              <input
                className="field"
                type="number"
                min={1}
                max={500}
                value={values.party_size}
                onChange={set('party_size')}
              />
            </Field>
          ) : null}
        </div>

        {has('party_size') && has('dates') ? (
          <Field label="Party size" hint="Everyone travelling, including children">
            <input
              className="field sm:max-w-[10rem]"
              type="number"
              min={1}
              max={500}
              value={values.party_size}
              onChange={set('party_size')}
            />
          </Field>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Budget from" hint="USD, indicative">
            <input
              className="field"
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={values.budget_min}
              onChange={set('budget_min')}
              placeholder="25000"
            />
          </Field>
          <Field label="Budget to" hint="USD, your genuine ceiling">
            <input
              className="field"
              type="number"
              min={0}
              step={100}
              inputMode="numeric"
              value={values.budget_max}
              onChange={set('budget_max')}
              placeholder="40000"
              aria-invalid={field === 'budget_max'}
            />
          </Field>
        </div>

        <Field label="The brief" hint={`${values.details.trim().length} of ${MIN_DETAILS} characters minimum`}>
          <textarea
            className="field min-h-[10rem] resize-y leading-relaxed"
            value={values.details}
            onChange={set('details')}
            placeholder={experience?.briefPrompt ?? category.detailsPrompt}
            aria-invalid={field === 'details'}
            required
          />
        </Field>
        <p className="-mt-3 text-xs leading-relaxed text-faint">
          If you include health, accessibility, allergy or dietary information, you consent to us
          using it, and sharing it with the supplier, to arrange this booking. See our{' '}
          <a href="/legal/privacy" className="underline decoration-line underline-offset-2 hover:text-muted">
            privacy notice
          </a>
          .
        </p>

        {!viewer.name || !(viewer.email || viewer.contact_email) ? (
          <div className="grid gap-5 border-t border-line pt-6 sm:grid-cols-2">
            {!viewer.name ? (
              <Field label="Your name" hint="How the desk should address you">
                <input
                  className="field"
                  value={values.contact_name}
                  onChange={set('contact_name')}
                  autoComplete="name"
                  placeholder="Optional"
                />
              </Field>
            ) : null}
            {!(viewer.email || viewer.contact_email) ? (
              <Field label="Email" hint="For confirmations, never marketing">
                <input
                  className="field"
                  type="email"
                  value={values.contact_email}
                  onChange={set('contact_email')}
                  autoComplete="email"
                  placeholder="Optional"
                  aria-invalid={field === 'contact_email'}
                />
              </Field>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mt-6 border-l-2 border-danger pl-4 text-sm leading-relaxed text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-5 border-t border-line pt-7">
        <button type="submit" className="btn btn-primary" disabled={sending}>
          {sending ? 'Sending to the desk' : 'Send to the desk'}
        </button>
        <p className="text-xs leading-relaxed text-faint">
          No fee to ask. You are not committed until you settle a quote.
        </p>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint ? <span className="mt-2 block text-xs text-faint">{hint}</span> : null}
    </label>
  )
}

/**
 * Where an experience is based. The experience's own bases as one-click picks, plus
 * a free box for anything else, since "wherever the snow is best" is a fine answer.
 */
function BasePicker({
  bases,
  value,
  onChange,
}: {
  bases: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <span className="field-label">Where you would like to be</span>
      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Suggested bases">
        {bases.map((base) => {
          const selected = value === base
          return (
            <button
              key={base}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? '' : base)}
              className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs tracking-wide transition-colors duration-300 ease ${
                selected
                  ? 'border-accent bg-accent/10 text-accent-soft'
                  : 'border-line text-muted hover:border-accent/50 hover:text-ink'
              }`}
            >
              {selected ? (
                <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                  <path d="M1.5 5.2l2.2 2.2L8.5 2.6" stroke="currentColor" strokeWidth="1.3" fill="none" />
                </svg>
              ) : null}
              {base}
            </button>
          )
        })}
      </div>
      <input
        className="field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={160}
        placeholder="Or somewhere else, or leave it to us"
        aria-label="Where you would like to be"
      />
      <span className="mt-2 block text-xs text-faint">Not sure yet? Leave it blank and we will suggest the best fit.</span>
    </div>
  )
}

function ReturnSwitch({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-3 text-sm text-ink"
    >
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-300 ${
          checked ? 'border-accent bg-accent/25' : 'border-line bg-surface'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full transition-transform duration-300 ${
            checked ? 'translate-x-6 bg-accent' : 'translate-x-1 bg-faint'
          }`}
        />
      </span>
      <span>
        Return flight
        <span className="ml-2 text-xs text-faint">{checked ? 'Round trip' : 'One way'}</span>
      </span>
    </button>
  )
}

/** What the "Where" field is called and asks for, per category. */
const LOCATION_COPY: Record<PlaceCategory, { label: string; hint: string; placeholder: string }> = {
  villas: {
    label: 'Where',
    hint: 'Pick a destination or search for one. Add the exact area in the brief if you have it.',
    placeholder: 'Search destinations, or type your own',
  },
  yachts: {
    label: 'Cruising ground',
    hint: 'Pick where you want to cruise. Name an embarkation port in the brief if you have one.',
    placeholder: 'Search cruising grounds and ports',
  },
  cars: {
    label: 'City',
    hint: 'Pick the city. Give the delivery address and time in the brief.',
    placeholder: 'Search cities',
  },
  dining: {
    label: 'City',
    hint: 'Where the table is, or where the chef should come to.',
    placeholder: 'Search cities and destinations',
  },
  events: {
    label: 'Event',
    hint: 'Pick the event, or search for one. Name the session or day in the brief.',
    placeholder: 'Search events, or type the one you want',
  },
  bespoke: {
    label: 'Where',
    hint: 'Pick a place, or describe it in your own words.',
    placeholder: 'Search places, or describe it',
  },
}
