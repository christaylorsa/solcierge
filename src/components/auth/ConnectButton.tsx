'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useSession } from './SessionProvider'
import { Magnetic } from '@/components/motion/Magnetic'
import { shortAddress } from '@/lib/format'

/**
 * Connect, then the account menu. Replaces the adapter's own button so the header
 * only ever speaks in our tokens.
 */
export function ConnectButton({ compact = false }: { compact?: boolean }) {
  const { connected, connecting, publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const { viewer, state, error, signOut, loaded, retrySignIn } = useSession()

  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const busy = connecting || state === 'signing'
  const identity = viewer?.wallet_address ?? publicKey?.toBase58() ?? null

  if (!loaded) {
    return <span className="text-xs tracking-label uppercase text-faint">Loading</span>
  }

  // Connected wallet, or an email session.
  if (viewer || (connected && identity)) {
    const label = identity
      ? shortAddress(identity, 4)
      : (viewer?.email?.split('@')[0] ?? 'Member')

    return (
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="btn btn-ghost !py-2.5 !px-4 font-mono !text-xs !tracking-widest !normal-case"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              viewer ? 'bg-success' : 'bg-accent'
            }`}
            aria-hidden="true"
          />
          {busy ? 'Authorising' : label}
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-64 border border-line bg-surface p-2 shadow-2xl shadow-black/60"
          >
            <div className="px-3 py-2.5">
              <p className="eyebrow">Signed in as</p>
              <p className="mt-1 break-all font-mono text-xs text-ink">
                {viewer?.wallet_address ?? viewer?.email ?? identity}
              </p>
              {!viewer && state !== 'signing' ? (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-danger">
                    Wallet connected but not signed in. {error ?? 'Approve the signature to continue.'}
                  </p>
                  {retrySignIn ? (
                    <button
                      type="button"
                      onClick={() => void retrySignIn()}
                      className="mt-3 text-xs tracking-wide text-accent-soft transition-opacity duration-300 ease hover:opacity-75"
                    >
                      Try the signature again
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>

            <div className="my-1 h-px bg-line" />

            <MenuLink href="/account" onClick={() => setOpen(false)}>
              My bookings
            </MenuLink>
            <MenuLink href="/request" onClick={() => setOpen(false)}>
              New request
            </MenuLink>
            {viewer?.isAdmin ? (
              <MenuLink href="/admin" onClick={() => setOpen(false)}>
                Operator desk
              </MenuLink>
            ) : null}

            <div className="my-1 h-px bg-line" />

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
              className="w-full px-3 py-2.5 text-left text-sm text-muted transition-colors duration-300 ease hover:text-ink"
            >
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Magnetic strength={4}>
      <button
        type="button"
        onClick={() => setVisible(true)}
        disabled={busy}
        className={compact ? 'btn btn-primary !py-2.5 !px-4' : 'btn btn-primary'}
      >
        {busy ? 'Connecting' : 'Connect wallet'}
      </button>
    </Magnetic>
  )
}

function MenuLink({
  href,
  children,
  onClick,
}: {
  href: string
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="block px-3 py-2.5 text-sm text-muted transition-colors duration-300 ease hover:text-accent-soft"
    >
      {children}
    </Link>
  )
}
