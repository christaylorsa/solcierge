'use client'

import { useMemo, type ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'
import { publicEnv } from '@/lib/env'
import { SessionProvider } from './SessionProvider'

import '@solana/wallet-adapter-react-ui/styles.css'

/**
 * Wallet plumbing for the whole app.
 *
 * Phantom and Solflare are listed explicitly so they appear in the picker even
 * before their extensions announce themselves; wallet-adapter dedupes those against
 * Wallet Standard detection, so a modern extension is never listed twice.
 */
export function WalletProviders({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], [])
  // Same-origin proxy by default, so the RPC provider's key stays on the server.
  const endpoint = useMemo(
    () =>
      publicEnv.rpcUrl ||
      `${typeof window === 'undefined' ? publicEnv.siteUrl : window.location.origin}/api/rpc`,
    [],
  )

  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: 'confirmed' }}>
      <WalletProvider wallets={wallets} autoConnect onError={(error) => console.warn('[wallet]', error.message)}>
        <WalletModalProvider>
          <SessionProvider>{children}</SessionProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
