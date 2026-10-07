'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usd } from '@/lib/format'
import { CODE_MAX, displayCode, referralUrl, shareOnXUrl } from '@/lib/referrals'
import type { ReferralSummary } from '@/lib/data'

/**
 * The member's referral link, their share card, and how their introductions are doing.
 * The card shown is the real rendered PNG, the same file X unfurls and "Download" saves.
 */
export function Introductions({
  code: initialCode,
  siteUrl,
  hasX,
  cardVersion,
  summary,
  canClaim,
}: {
  code: string
  siteUrl: string
  hasX: boolean
  /** Changes when the card's content does, so the browser does not show a stale one. */
  cardVersion: string
  summary: ReferralSummary
  canClaim: boolean
}) {
  const [code, setCode] = useState(initialCode)
  const [draft, setDraft] = useState(displayCode(initialCode))
  const [saving, setSaving] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const link = referralUrl(siteUrl, code)
  const host = new URL(siteUrl).host
  const dirty = draft.trim().toLowerCase() !== code
  const cardSrc = `/card/${displayCode(code)}?v=${encodeURIComponent(cardVersion)}`

  async function saveCode(event: React.FormEvent) {
    event.preventDefault()
    if (!dirty) return
    setSaving(true)
    setCodeError(null)
    try {
      const res = await fetch('/api/me/referral', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: draft }),
      })
      const body = (await res.json().catch(() => ({}))) as { code?: string; error?: string }
      if (!res.ok || !body.code) throw new Error(body.error ?? 'Could not save that code.')
      setCode(body.code)
      setDraft(displayCode(body.code))
      setLoaded(false)
    } catch (cause) {
      setCodeError(cause instanceof Error ? cause.message : 'Could not save that code.')
    } finally {
      setSaving(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      window.prompt('Copy your link', link)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-xl">
          <p className="eyebrow">Introductions</p>
          <h2 className="display mt-4 text-[clamp(2rem,4vw,3rem)] text-ink">Bring someone with you</h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted">
          Share your card. When someone you introduce settles a booking, you share in it, paid by the desk.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
        {/* The card. min-w-0 on both columns: grid items otherwise refuse to shrink below
            the input's intrinsic width and push a phone layout sideways. */}
        <div className="min-w-0">
          <div className="relative overflow-hidden border border-line bg-surface" style={{ aspectRatio: '1200 / 630' }}>
            {!loaded ? <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-raised/60" /> : null}
            <img
              key={cardSrc}
              src={cardSrc}
              alt={`Your Solcierge introduction card, code ${displayCode(code)}`}
              width={1200}
              height={630}
              onLoad={() => setLoaded(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a href={shareOnXUrl(siteUrl, code)} target="_blank" rel="noreferrer noopener" className="btn btn-primary">
              Share on X
            </a>
            <button type="button" onClick={() => void copy()} className="btn btn-ghost">
              {copied ? 'Link copied' : 'Copy link'}
            </button>
            <a href={`${cardSrc}&download=1`} download={`solcierge-${displayCode(code)}.png`} className="btn btn-quiet">
              Download card
            </a>
          </div>

          {!hasX ? (
            <p className="mt-4 text-xs leading-relaxed text-faint">
              <a href="#connections" className="link-underline">
                Connect X
              </a>{' '}
              and your card carries your handle and photo. Otherwise it introduces you as a Solcierge member.
            </p>
          ) : null}
        </div>

        {/* The code and the numbers */}
        <div className="min-w-0 space-y-6">
          <form onSubmit={saveCode} className="border border-line bg-surface p-6 sm:p-7" noValidate>
            <label htmlFor="referral-code" className="eyebrow block">
              Your link
            </label>
            <div className="mt-4 flex items-stretch border border-line bg-bg transition-colors duration-300 ease focus-within:border-accent">
              <span className="flex items-center whitespace-nowrap border-r border-line pl-3.5 pr-2.5 text-sm text-faint">
                {host}/r/
              </span>
              <input
                id="referral-code"
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value.toUpperCase())
                  setCodeError(null)
                }}
                maxLength={CODE_MAX}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(codeError)}
                aria-describedby="referral-code-hint"
                size={1}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 font-medium tracking-[0.14em] text-accent-soft outline-none"
              />
            </div>
            <p id="referral-code-hint" className="mt-2 text-xs leading-relaxed text-faint">
              Make it yours: 3 to 20 letters, numbers or hyphens. Changing it retires links you have already shared.
            </p>
            {codeError ? (
              <p className="mt-3 border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
                {codeError}
              </p>
            ) : null}
            {dirty ? (
              <div className="mt-5 flex gap-3">
                <button type="submit" disabled={saving} className="btn btn-primary">
                  {saving ? 'Saving' : 'Save code'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(displayCode(code))
                    setCodeError(null)
                  }}
                  className="btn btn-quiet"
                >
                  Undo
                </button>
              </div>
            ) : null}
          </form>

          <dl className="grid grid-cols-3 divide-x divide-line border border-line bg-surface">
            <Stat label="Introduced" value={String(summary.introduced)} />
            <Stat label="Booked" value={String(summary.booked)} />
            <Stat label="Value" value={summary.value > 0 ? usd(summary.value) : '—'} />
          </dl>

          <p className="text-xs leading-relaxed text-faint">
            Rewards are paid on settled bookings, once the cancellation window has passed, and the desk confirms
            each one with you. Introducing yourself or a second account of yours does not count.
          </p>

          {canClaim ? <ClaimIntroduction /> : null}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 p-4 sm:p-5">
      <dt className="text-[0.625rem] tracking-label uppercase text-faint">{label}</dt>
      <dd className="display mt-2 truncate text-2xl text-ink lining-nums">{value}</dd>
    </div>
  )
}

/** For members whose share link did not carry through, before their first booking. */
function ClaimIntroduction() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/me/referral', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: value }),
      })
      const body = (await res.json().catch(() => ({}))) as { by?: string | null; error?: string }
      if (!res.ok) throw new Error(body.error ?? 'Could not record that.')
      setDone(body.by ? `Recorded. Introduced by ${body.by}.` : 'Recorded. Thank you.')
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not record that.')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <p className="border-l-2 border-success pl-4 text-sm text-success" role="status">
        {done}
      </p>
    )
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted transition-colors duration-300 ease hover:text-ink">
        Someone introduced you? <span className="link-underline">Add their code</span>
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="border border-line p-5" noValidate>
      <label className="block">
        <span className="field-label">Their code</span>
        <input
          className="field uppercase tracking-[0.14em]"
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          maxLength={CODE_MAX}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(error)}
        />
      </label>
      <p className="mt-2 text-xs text-faint">Only before your first booking, and only once.</p>
      {error ? (
        <p className="mt-3 border-l-2 border-danger pl-4 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy || value.trim().length < 3} className="btn btn-ghost mt-4">
        {busy ? 'Checking' : 'Record introduction'}
      </button>
    </form>
  )
}
