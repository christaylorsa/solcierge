'use client'

import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { publicEnv } from '@/lib/env'

/**
 * Fallback identity for members who would rather not connect a wallet yet. They can
 * brief the desk and read quotes by email; settling still needs a wallet, which the
 * copy says plainly rather than discovering at the pay step.
 */
export function EmailSignIn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (status === 'sending') return

    setStatus('sending')
    setMessage(null)

    try {
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/account` },
      })
      if (error) throw new Error(friendlyError(error.message))
      setStatus('sent')
      setMessage('Check your inbox. The link signs you straight in and expires in an hour.')
    } catch (cause) {
      setStatus('error')
      setMessage(cause instanceof Error ? cause.message : 'Could not send that link.')
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-sm leading-relaxed text-muted" role="status">
        {message}
      </p>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div>
        <label className="field-label" htmlFor="email-signin">
          Or sign in by email
        </label>
        <input
          id="email-signin"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@domain.com"
          className="field"
          aria-invalid={status === 'error'}
        />
      </div>

      <button type="submit" className="btn btn-ghost w-full" disabled={status === 'sending' || !email.trim()}>
        {status === 'sending' ? 'Sending link' : 'Email me a link'}
      </button>

      {status === 'error' && message ? (
        <p className="text-xs leading-relaxed text-danger" role="alert">
          {message}
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-faint">
        Email access lets you brief the desk and read quotes. Settling a booking needs a
        connected wallet, since payment happens on chain.
      </p>
    </form>
  )
}

/**
 * Supabase's raw errors read like server logs. Delivery refusals (an address the mail
 * provider will not send to, or its hourly cap) point the visitor at the wallet route,
 * which needs no email at all.
 */
function friendlyError(raw: string): string {
  const text = raw.toLowerCase()
  if (text.includes('invalid')) return 'That email address does not look right. Check it and try again.'
  if (text.includes('not authorized') || text.includes('rate limit') || text.includes('security purposes')) {
    return 'We could not send a link just now. Connect a wallet instead: it takes a few seconds and needs no email.'
  }
  return raw
}
