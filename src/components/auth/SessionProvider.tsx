'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useRouter } from 'next/navigation'
import bs58 from 'bs58'
import type { Viewer } from '@/lib/types'

type SignInState = 'idle' | 'signing' | 'ready' | 'error'

type SessionValue = {
  viewer: Viewer | null
  /** False only while the very first /api/me call is in flight. */
  loaded: boolean
  state: SignInState
  error: string | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
  /** Re-prompts for the sign-in signature after a decline. Null when no wallet is connected. */
  retrySignIn: (() => Promise<void>) | null
  dismissError: () => void
}

const SessionContext = createContext<SessionValue | null>(null)

/**
 * Turns a connected wallet into a server session.
 *
 * The wallet adapter only proves the browser can talk to an extension. The server
 * will not accept an address on its own, so as soon as a wallet connects we fetch a
 * nonce, ask for a signature over it, and exchange that for an httpOnly session
 * cookie. A member who declines the signature stays connected but signed out, which
 * is honest about what has and has not happened.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet()
  const router = useRouter()

  const [viewer, setViewer] = useState<Viewer | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [state, setState] = useState<SignInState>('idle')
  const [error, setError] = useState<string | null>(null)

  // Wallets we have already tried, so a declined signature is not re-prompted in a loop.
  const attempted = useRef<Set<string>>(new Set())
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' })
      const body = (await res.json()) as { viewer: Viewer | null }
      setViewer(body.viewer ?? null)
    } catch {
      setViewer(null)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signIn = useCallback(
    async (address: string) => {
      if (inFlight.current) return
      if (!signMessage) {
        setError('This wallet cannot sign messages in the browser. Try Phantom or Solflare.')
        setState('error')
        return
      }

      inFlight.current = true
      setState('signing')
      setError(null)

      try {
        const nonceRes = await fetch(`/api/auth/nonce?wallet=${encodeURIComponent(address)}`, {
          cache: 'no-store',
        })
        const nonceBody = (await nonceRes.json()) as { nonce?: string; message?: string; error?: string }
        if (!nonceRes.ok || !nonceBody.nonce || !nonceBody.message) {
          throw new Error(nonceBody.error ?? 'Could not start sign-in.')
        }

        const signature = await signMessage(new TextEncoder().encode(nonceBody.message))

        const verifyRes = await fetch('/api/auth/wallet', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            wallet: address,
            nonce: nonceBody.nonce,
            signature: bs58.encode(signature),
          }),
        })
        const verifyBody = (await verifyRes.json()) as { error?: string }
        if (!verifyRes.ok) throw new Error(verifyBody.error ?? 'Sign-in failed.')

        await refresh()
        setState('ready')
        // Server components hold the bookings, so they need to re-render as us.
        router.refresh()
      } catch (cause) {
        const message =
          cause instanceof Error && /reject|denied|cancel/i.test(cause.message)
            ? 'Signature declined. Approve the message to open your concierge account.'
            : cause instanceof Error
              ? cause.message
              : 'Sign-in failed.'
        setError(message)
        setState('error')
      } finally {
        inFlight.current = false
      }
    },
    [refresh, router, signMessage],
  )

  // Reconcile the connected wallet with the server session.
  useEffect(() => {
    if (!loaded) return

    if (!connected || !publicKey) {
      attempted.current.clear()
      return
    }

    const address = publicKey.toBase58()
    if (viewer?.wallet_address === address) {
      setState('ready')
      return
    }
    if (attempted.current.has(address)) return

    attempted.current.add(address)
    void signIn(address)
  }, [connected, publicKey, viewer?.wallet_address, loaded, signIn])

  const signOut = useCallback(async () => {
    attempted.current.clear()
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      try {
        await disconnect()
      } catch {
        // Extension already gone; the server session is what matters.
      }
      setViewer(null)
      setState('idle')
      setError(null)
      router.refresh()
      router.push('/')
    }
  }, [disconnect, router])

  const retrySignIn = useCallback(async () => {
    if (!publicKey) return
    const address = publicKey.toBase58()
    attempted.current.add(address)
    await signIn(address)
  }, [publicKey, signIn])

  return (
    <SessionContext.Provider
      value={{
        viewer,
        loaded,
        state,
        error,
        refresh,
        signOut,
        retrySignIn: connected && publicKey ? retrySignIn : null,
        dismissError: () => {
          setError(null)
          setState('idle')
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession must be used inside <WalletProviders>.')
  return value
}
