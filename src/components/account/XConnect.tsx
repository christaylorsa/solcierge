'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MemberAvatar } from './MemberAvatar'
import type { XLink } from '@/lib/data'

const OUTCOME: Record<string, { tone: 'ok' | 'error'; text: string }> = {
  connected: { tone: 'ok', text: 'X connected. Your card now carries your handle and photo.' },
  cancelled: { tone: 'error', text: 'Connection cancelled at X. Nothing was changed.' },
  expired: { tone: 'error', text: 'That attempt timed out. Try again.' },
  taken: { tone: 'error', text: 'That X account is already connected to another Solcierge member.' },
  failed: { tone: 'error', text: 'X did not answer as expected. Try again in a minute.' },
  busy: { tone: 'error', text: 'Too many attempts. Wait a few minutes and try again.' },
  signin: { tone: 'error', text: 'Sign in first, then connect X.' },
  unavailable: { tone: 'error', text: 'Connecting X is not switched on yet.' },
}

/**
 * Optional X link. Not a sign-in: the wallet stays the account. We read the public
 * profile once and keep the handle, name and photo, nothing else.
 */
export function XConnect({ x, outcome, available }: { x: XLink | null; outcome: string | null; available: boolean }) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const message = outcome ? OUTCOME[outcome] : undefined

  async function disconnect() {
    setRemoving(true)
    setError(null)
    try {
      const res = await fetch('/api/me/x', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.replace('/account/profile#connections')
      router.refresh()
    } catch {
      setError('Could not disconnect. Try again.')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="border border-line bg-surface p-6 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <p className="eyebrow">X account</p>
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" className="text-faint">
          <path
            fill="currentColor"
            d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z"
          />
        </svg>
      </div>

      {x ? (
        <>
          <div className="mt-5 flex items-center gap-4">
            <MemberAvatar src={x.avatar_url} name={x.name ?? x.username} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm text-ink">{x.name ?? x.username}</p>
              <a
                href={`https://x.com/${x.username}`}
                target="_blank"
                rel="noreferrer noopener"
                className="link-underline text-xs"
              >
                @{x.username}
              </a>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-faint">
            Shown on your profile and your introduction card. Solcierge never posts or reads anything else.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/api/x/start" className="btn btn-quiet !px-0">
              Refresh photo
            </a>
            <button type="button" onClick={() => void disconnect()} disabled={removing} className="btn btn-quiet">
              {removing ? 'Disconnecting' : 'Disconnect'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Optional. Puts your handle and photo on your profile and on the card you share. Your wallet stays
            your sign-in.
          </p>
          {available ? (
            <a href="/api/x/start" className="btn btn-ghost mt-5">
              Connect X
            </a>
          ) : (
            <p className="mt-5 text-xs text-faint">Coming shortly.</p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-faint">
            We read your public profile once and never post, follow or read your messages.
          </p>
        </>
      )}

      {message ? (
        <p
          className={`mt-5 border-l-2 pl-4 text-sm ${message.tone === 'ok' ? 'border-success text-success' : 'border-danger text-danger'}`}
          role={message.tone === 'ok' ? 'status' : 'alert'}
        >
          {message.text}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
