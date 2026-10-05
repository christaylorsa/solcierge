'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Countdown } from './Countdown'
import { RateLockRing } from '@/components/motion/RateLockRing'
import { useSession } from '@/components/auth/SessionProvider'
import { buildTransferTransaction, TransferSetupError } from '@/lib/solana/transfer'
import { explorerTxUrl, publicEnv } from '@/lib/env'
import { formatDateTime, shortAddress, sol, usd, usdc } from '@/lib/format'
import { TERMS_LINKS, TERMS_VERSION } from '@/lib/terms'
import type { PaymentIntent, PaymentToken, Quote } from '@/lib/types'

type Phase =
  | 'choose'
  | 'locking'
  | 'locked'
  | 'signing'
  | 'confirming'
  | 'verifying'
  | 'settled'
  | 'review'
  | 'expired'

type Settled = { outcome: string; message: string; signature: string }

// Verification waits for finalization (~13 s after confirmed), so allow ~50 s.
const VERIFY_ATTEMPTS = 20
const VERIFY_DELAY_MS = 2500
const CONFIRM_ATTEMPTS = 20
const CONFIRM_DELAY_MS = 1000

export function PayPanel({ requestId, quote }: { requestId: string; quote: Quote }) {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const { setVisible } = useWalletModal()
  const { viewer } = useSession()
  const router = useRouter()

  const [token, setToken] = useState<PaymentToken>('USDC')
  const [phase, setPhase] = useState<Phase>('choose')
  const [intent, setIntent] = useState<PaymentIntent | null>(null)
  const [lockSeconds, setLockSeconds] = useState(600)
  const [error, setError] = useState<string | null>(null)
  const [settled, setSettled] = useState<Settled | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const quoteExpired = Date.parse(quote.expires_at) < Date.now()

  const lockRate = useCallback(
    async (chosen: PaymentToken) => {
      setPhase('locking')
      setError(null)
      setSettled(null)

      try {
        const res = await fetch('/api/payments/intent', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            request_id: requestId,
            token: chosen,
            accept_terms: true,
            terms_version: TERMS_VERSION,
          }),
        })
        const body = (await res.json()) as {
          intent?: PaymentIntent
          lockSeconds?: number
          error?: string
        }
        if (!res.ok || !body.intent) throw new Error(body.error ?? 'Could not lock a rate.')

        setIntent(body.intent)
        setLockSeconds(body.lockSeconds ?? 600)
        setPhase('locked')
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not lock a rate.')
        setPhase('choose')
      }
    },
    [requestId],
  )

  /** Polls the server verifier: an unconfirmed transaction is normal for a few seconds. */
  const verify = useCallback(
    async (intentId: string, signature: string) => {
      setPhase('verifying')

      for (let attempt = 0; attempt < VERIFY_ATTEMPTS; attempt += 1) {
        setProgress(
          attempt === 0
            ? 'Reading the transaction from the chain'
            : `Waiting for confirmation, attempt ${attempt + 1} of ${VERIFY_ATTEMPTS}`,
        )

        const res = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ intent_id: intentId, signature }),
        })
        const body = (await res.json()) as { outcome?: string; message?: string; error?: string }

        if (body.outcome === 'pending_confirmation') {
          await new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS))
          continue
        }

        setProgress(null)

        if (body.outcome === 'paid' || body.outcome === 'already_paid') {
          setSettled({
            outcome: body.outcome,
            message: body.message ?? 'Payment confirmed on chain.',
            signature,
          })
          setPhase('settled')
          router.refresh()
          return
        }

        if (body.outcome === 'needs_review') {
          setSettled({
            outcome: body.outcome,
            message: body.message ?? 'Received, pending reconciliation.',
            signature,
          })
          setPhase('review')
          router.refresh()
          return
        }

        // failed or mismatch: the transfer exists but does not settle this quote.
        setError(body.error ?? 'That transaction could not be matched to this quote.')
        setSettled({ outcome: body.outcome ?? 'mismatch', message: '', signature })
        setPhase('locked')
        return
      }

      setProgress(null)
      setError(
        'The network has not confirmed your transfer yet. Nothing is lost. Keep the signature below and reopen this page in a few minutes, we will pick it up.',
      )
      setSettled({ outcome: 'pending_confirmation', message: '', signature })
      setPhase('locked')
    },
    [router],
  )

  async function pay() {
    if (!intent || !publicKey) return

    setError(null)
    setPhase('signing')

    let signature: string | null = null
    try {
      const built = await buildTransferTransaction({
        connection,
        payer: publicKey,
        recipient: intent.recipient,
        token: intent.token,
        amount: Number(intent.amount),
        mint: intent.mint,
      })

      signature = await sendTransaction(built.transaction, connection, { skipPreflight: false })

      setPhase('confirming')
      setProgress('Waiting for the cluster to confirm')
      // Polled over HTTP rather than confirmTransaction's websocket subscription:
      // the browser's endpoint is the same-origin /api/rpc proxy, which has no
      // websocket. Running out of attempts says nothing definitive either way;
      // the server verifier is the authority and polls on its own.
      for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt += 1) {
        try {
          const { value } = await connection.getSignatureStatuses([signature])
          const status = value[0]
          if (status?.err || status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
            break
          }
        } catch {
          // Transient RPC failure; keep polling.
        }
        await new Promise((resolve) => setTimeout(resolve, CONFIRM_DELAY_MS))
      }

      await verify(intent.id, signature)
    } catch (cause) {
      setProgress(null)

      if (signature) {
        // Signed and sent, but something after that threw. Verify rather than lose it.
        await verify(intent.id, signature)
        return
      }

      const message =
        cause instanceof TransferSetupError
          ? cause.message
          : cause instanceof Error && /reject|denied|cancel|user/i.test(cause.message)
            ? 'You declined the transaction in your wallet. The rate is still held.'
            : cause instanceof Error && /insufficient|0x1$/i.test(cause.message)
              ? `Not enough ${intent.token} in that wallet to cover the amount plus network fees.`
              : cause instanceof Error
                ? cause.message
                : 'The transfer could not be sent.'

      setError(message)
      setPhase('locked')
    }
  }

  // --- gates ---------------------------------------------------------------

  if (quoteExpired) {
    return (
      <Shell>
        <p className="eyebrow">Quote expired</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          This quote lapsed on {formatDateTime(quote.expires_at)}. Prices in this market move,
          so we will not hold an old one. Ask the desk to refresh it and it will reappear here.
        </p>
      </Shell>
    )
  }

  if (!connected || !publicKey) {
    return (
      <Shell>
        <p className="eyebrow">Settle this quote</p>
        <p className="display mt-3 text-3xl text-ink">{usd(quote.amount_usd)}</p>
        <p className="mt-5 text-sm leading-relaxed text-muted">
          {viewer?.email && !viewer.wallet_address
            ? 'You are signed in by email, which is enough to brief the desk and read quotes. Settling happens on chain, so connect a wallet to pay.'
            : 'Connect your wallet to settle in SOL or USDC.'}
        </p>
        <button type="button" onClick={() => setVisible(true)} className="btn btn-primary mt-7 w-full">
          Connect wallet
        </button>
      </Shell>
    )
  }

  if (phase === 'settled' && settled) {
    return (
      <Shell tone="success">
        <p className="eyebrow text-success">Paid</p>
        <p className="display mt-3 text-3xl text-ink">{usd(quote.amount_usd)}</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{settled.message}</p>
        <Receipt signature={settled.signature} />
        <p className="mt-6 text-xs leading-relaxed text-faint">
          A concierge will now confirm with the supplier. During desk hours we aim to update you
          within the hour. Your booking is confirmed when the supplier confirms, and the
          confirmation will carry the supplier's own terms.
        </p>
      </Shell>
    )
  }

  if (phase === 'review' && settled) {
    return (
      <Shell tone="warn">
        <p className="eyebrow text-accent">Received, reconciling</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{settled.message}</p>
        <Receipt signature={settled.signature} />
      </Shell>
    )
  }

  // --- the panel -----------------------------------------------------------

  const busy = phase === 'locking' || phase === 'signing' || phase === 'confirming' || phase === 'verifying'

  return (
    <Shell>
      <p className="eyebrow">Settle this quote</p>
      <p className="display mt-3 text-4xl text-ink">{usd(quote.amount_usd)}</p>
      <p className="mt-2 text-xs text-faint">
        Quote valid until {formatDateTime(quote.expires_at)}
      </p>

      <div className="mt-7">
        <p className="field-label">Pay with</p>
        <div className="grid grid-cols-2 gap-2">
          {(['USDC', 'SOL'] as PaymentToken[]).map((option) => {
            const active = token === option
            return (
              <button
                key={option}
                type="button"
                disabled={busy}
                onClick={() => {
                  setToken(option)
                  setIntent(null)
                  setError(null)
                  setSettled(null)
                  setPhase('choose')
                }}
                className={`border px-4 py-3 text-sm transition-colors duration-400 ease disabled:opacity-50 ${
                  active
                    ? 'border-accent bg-accent/10 text-accent-soft'
                    : 'border-line text-muted hover:border-accent/40 hover:text-ink'
                }`}
              >
                <span className="block font-mono text-xs tracking-widest">{option}</span>
                <span className="mt-1 block text-[0.6875rem] text-faint">
                  {option === 'USDC' ? 'One for one with USD' : 'Converted at a live rate'}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {intent && (phase === 'locked' || phase === 'expired' || busy) ? (
        <div className="mt-7 border border-line bg-bg p-5">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-[0.6875rem] tracking-label uppercase text-faint">You send</p>
            <p className="font-mono text-lg text-ink">
              {intent.token === 'SOL' ? sol(Number(intent.amount)) : usdc(Number(intent.amount))}
            </p>
          </div>

          {intent.sol_price_usd ? (
            <p className="mt-2 text-xs text-faint">
              Locked at {usd(Number(intent.sol_price_usd), { cents: true })} per SOL
            </p>
          ) : null}

          <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-line pt-4">
            <p className="text-[0.6875rem] tracking-label uppercase text-faint">To treasury</p>
            <p className="font-mono text-xs text-muted">{shortAddress(intent.recipient, 5)}</p>
          </div>

          {/* The same ring as the landing page, on the real expiry. The linear bar
              stays underneath it: the ring carries the feeling, the bar carries the
              precision, and at a glance the bar is easier to read at speed. */}
          <div className="mt-6 flex justify-center">
            <RateLockRing
              expiresAt={intent.expires_at}
              totalSeconds={lockSeconds}
              className="w-full max-w-[212px]"
            />
          </div>

          <div className="mt-5">
            <Countdown
              expiresAt={intent.expires_at}
              totalSeconds={lockSeconds}
              onExpire={() => setPhase((current) => (current === 'locked' ? 'expired' : current))}
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 border-l-2 border-danger pl-4 text-sm leading-relaxed text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {settled && (phase === 'locked' || phase === 'expired') ? (
        <Receipt signature={settled.signature} label="Your transaction" />
      ) : null}

      {progress ? (
        <p className="mt-5 flex items-center gap-2.5 text-sm text-muted" role="status">
          <span className="block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden="true" />
          {progress}
        </p>
      ) : null}

      {phase === 'choose' || phase === 'locking' || phase === 'expired' ? (
        <label className="mt-7 flex cursor-pointer gap-3 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(event) => setAcceptedTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--accent))]"
          />
          <span>
            I am 18 or over, and I accept the{' '}
            {TERMS_LINKS.map((link, position) => (
              <span key={link.href}>
                <a href={link.href} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                  {link.label}
                </a>
                {position < TERMS_LINKS.length - 2 ? ', ' : position === TERMS_LINKS.length - 2 ? ' and ' : ''}
              </span>
            ))}
            , and the supplier terms in the quote notes. I understand my payment is final once
            confirmed on chain.
          </span>
        </label>
      ) : null}

      <div className="mt-7">
        {phase === 'choose' || phase === 'locking' ? (
          <button
            type="button"
            onClick={() => void lockRate(token)}
            disabled={phase === 'locking' || !acceptedTerms}
            className="btn btn-primary w-full"
          >
            {phase === 'locking' ? 'Locking the rate' : `Lock rate and pay in ${token}`}
          </button>
        ) : null}

        {phase === 'locked' ? (
          <button type="button" onClick={() => void pay()} className="btn btn-primary w-full">
            Pay {intent?.token === 'SOL' ? sol(Number(intent.amount)) : usdc(Number(intent?.amount ?? 0))}
          </button>
        ) : null}

        {phase === 'expired' ? (
          <button
            type="button"
            onClick={() => void lockRate(token)}
            disabled={!acceptedTerms}
            className="btn btn-ghost w-full"
          >
            Rate expired, get a fresh one
          </button>
        ) : null}

        {busy && phase !== 'locking' ? (
          <button type="button" disabled className="btn btn-primary w-full">
            {phase === 'signing' ? 'Approve in your wallet' : 'Confirming on chain'}
          </button>
        ) : null}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-faint">
        Sent on {publicEnv.cluster}. Crypto payments are final once confirmed. We verify the
        transfer against the chain before anything is marked paid, and the amount above cannot
        change inside the countdown.
      </p>
    </Shell>
  )
}

function Shell({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'success' | 'warn'
}) {
  const border =
    tone === 'success' ? 'border-success/40' : tone === 'warn' ? 'border-accent/40' : 'border-line'
  return <div className={`border ${border} bg-surface p-6 sm:p-7`}>{children}</div>
}

function Receipt({ signature, label = 'Receipt' }: { signature: string; label?: string }) {
  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="text-[0.6875rem] tracking-label uppercase text-faint">{label}</p>
      <a
        href={explorerTxUrl(signature)}
        target="_blank"
        rel="noreferrer noopener"
        className="link-underline mt-2 inline-block break-all font-mono text-xs"
      >
        {shortAddress(signature, 10)}
      </a>
      <p className="mt-2 text-xs text-faint">Opens on Solana Explorer</p>
    </div>
  )
}
