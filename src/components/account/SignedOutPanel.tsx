'use client'

import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { EmailSignIn } from '@/components/auth/EmailSignIn'

export function SignedOutPanel() {
  const { setVisible } = useWalletModal()

  return (
    <div className="border border-line bg-surface p-8">
      <p className="text-sm leading-relaxed text-muted">
        Connecting asks you to sign a short message. It proves the wallet is yours, authorises
        no transaction, and costs nothing.
      </p>
      <button type="button" onClick={() => setVisible(true)} className="btn btn-primary mt-7 w-full">
        Connect wallet
      </button>
      <div className="mt-9 border-t border-line pt-7">
        <EmailSignIn />
      </div>
    </div>
  )
}
