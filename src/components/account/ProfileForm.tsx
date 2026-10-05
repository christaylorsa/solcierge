'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/auth/SessionProvider'

type Values = { name: string; contact_email: string; phone: string }

/** The member's name and how the desk reaches them. */
export function ProfileForm({ initial, verifiedEmail }: { initial: Values; verifiedEmail: string | null }) {
  const router = useRouter()
  const { refresh } = useSession()
  const [values, setValues] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)

  const dirty = (Object.keys(values) as (keyof Values)[]).some((key) => values[key].trim() !== saved[key])

  const set = (key: keyof Values) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [key]: event.target.value }))
    setState('idle')
    if (error?.field === key) setError(null)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setState('saving')
    setError(null)
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        field?: string
        profile?: { name: string | null; contact_email: string | null; phone: string | null }
      }
      if (!res.ok || !body.profile) {
        setError({ field: body.field, message: body.error ?? 'Could not save. Try again.' })
        setState('idle')
        return
      }
      const next = {
        name: body.profile.name ?? '',
        contact_email: body.profile.contact_email ?? '',
        phone: body.profile.phone ?? '',
      }
      setValues(next)
      setSaved(next)
      setState('saved')
      // The header shows the name, so the session needs the new one too.
      await refresh()
      router.refresh()
    } catch {
      setError({ message: 'Could not reach us. Check your connection and try again.' })
      setState('idle')
    }
  }

  return (
    <form onSubmit={submit} className="border border-line bg-surface p-6 sm:p-7" noValidate>
      <p className="eyebrow">Your details</p>

      <div className="mt-6 space-y-5">
        <label className="block">
          <span className="field-label">Name</span>
          <input
            className="field"
            value={values.name}
            onChange={set('name')}
            autoComplete="name"
            maxLength={80}
            placeholder="How the desk should address you"
            aria-invalid={error?.field === 'name'}
          />
          <span className="mt-2 block text-xs text-faint">Shown in the header and to your concierge.</span>
        </label>

        <label className="block">
          <span className="field-label">Email for updates</span>
          <input
            className="field"
            type="email"
            value={values.contact_email}
            onChange={set('contact_email')}
            autoComplete="email"
            maxLength={200}
            placeholder="Optional"
            aria-invalid={error?.field === 'contact_email'}
          />
          <span className="mt-2 block text-xs text-faint">
            {verifiedEmail
              ? `You sign in as ${verifiedEmail}, so updates go there. This is a fallback.`
              : 'Quotes and confirmations, never marketing. Your wallet stays your sign-in.'}
          </span>
        </label>

        <label className="block">
          <span className="field-label">Phone</span>
          <input
            className="field"
            type="tel"
            value={values.phone}
            onChange={set('phone')}
            autoComplete="tel"
            maxLength={24}
            placeholder="+44 7700 900123"
            aria-invalid={error?.field === 'phone'}
          />
          <span className="mt-2 block text-xs text-faint">
            Optional. For the desk, or a driver or host on the day. Include the country code.
          </span>
        </label>
      </div>

      {error ? (
        <p className="mt-6 border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
          {error.message}
        </p>
      ) : null}

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={state === 'saving' || !dirty}>
          {state === 'saving' ? 'Saving' : 'Save profile'}
        </button>
        {state === 'saved' && !dirty ? (
          <span className="text-xs text-success" role="status">
            Saved
          </span>
        ) : null}
      </div>
    </form>
  )
}
