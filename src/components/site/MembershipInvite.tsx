'use client'

import { useEffect, useRef, useState } from 'react'
import { EmailSignIn } from '@/components/auth/EmailSignIn'
import { useSession } from '@/components/auth/SessionProvider'

const SEEN_KEY = 'solcierge:invite-seen'
const DELAY_MS = 22_000

/**
 * One quiet offer, once per session.
 *
 * Four ways out (the X, "Not now", clicking the backdrop, Escape), it never returns
 * once dismissed, and it does not appear for members who are already signed in. What
 * it offers is real: the same magic link used everywhere else, so a visitor without a
 * wallet can still brief the desk.
 */
export function MembershipInvite() {
  const { viewer, loaded } = useSession()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!loaded || viewer) return
    if (sessionStorage.getItem(SEEN_KEY)) return

    const timer = setTimeout(() => {
      // Re-checked at fire time, not only when scheduled: during the delay the visitor
      // may have signed in, or dismissed this in another tab. Either way the offer is
      // no longer wanted.
      if (sessionStorage.getItem(SEEN_KEY)) return
      setOpen(true)
    }, DELAY_MS)
    return () => clearTimeout(timer)
  }, [loaded, viewer])

  useEffect(() => {
    if (!open) return

    const dismiss = () => {
      sessionStorage.setItem(SEEN_KEY, '1')
      setOpen(false)
    }

    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && dismiss()
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()

    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  const dismiss = () => {
    sessionStorage.setItem(SEEN_KEY, '1')
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(event) => {
        if (!panelRef.current?.contains(event.target as Node)) dismiss()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
        className="reveal in-view w-full max-w-md border border-line bg-surface p-7 shadow-2xl shadow-black/70 sm:p-9"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">No wallet yet</p>
            <h2 id="invite-title" className="display mt-3 text-3xl text-ink">
              Brief the desk by email
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-9 w-9 items-center justify-center text-faint transition-colors duration-300 ease hover:text-ink"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Connecting a wallet is only needed when you settle. Leave an email and we will
          send a link that opens your account, so you can put a request in front of a
          concierge now and decide how to pay later.
        </p>

        <div className="mt-7">
          <EmailSignIn />
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 text-xs tracking-wide text-faint transition-colors duration-300 ease hover:text-muted"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
