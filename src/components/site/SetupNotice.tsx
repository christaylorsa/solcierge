'use client'

import { useState } from 'react'
import { isConfigured, publicEnv } from '@/lib/env'

/**
 * Shown only when the deployment is missing its Supabase or treasury config, which
 * is the state a fresh clone starts in. Better a plain line at the top of the page
 * than a stack trace on first submit.
 */
export function SetupNotice() {
  const [dismissed, setDismissed] = useState(false)
  if (isConfigured || dismissed) return null

  const missing = [
    !publicEnv.supabaseUrl.startsWith('http') && 'NEXT_PUBLIC_SUPABASE_URL',
    !publicEnv.supabaseAnonKey && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    !publicEnv.treasuryWallet && 'NEXT_PUBLIC_TREASURY_WALLET',
  ].filter(Boolean)

  return (
    <div className="fixed inset-x-0 top-0 z-[65] border-b border-accent/30 bg-[#1a1408] px-[var(--shell-x)] py-2.5">
      <div className="mx-auto flex max-w-shell items-center justify-between gap-4">
        <p className="text-xs leading-relaxed text-accent-soft">
          Setup incomplete. Copy <code className="font-mono">.env.example</code> to{' '}
          <code className="font-mono">.env.local</code> and set {missing.join(', ')}. Browsing works,
          submitting will not.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss setup notice"
          className="shrink-0 text-accent-soft transition-opacity duration-300 ease hover:opacity-70"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" fill="none" />
          </svg>
        </button>
      </div>
    </div>
  )
}
