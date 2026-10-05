/**
 * Whether the connected wallet may pay (SA-18).
 *
 * The server only accepts a transfer whose fee payer is the signed-in wallet. If the
 * extension has switched accounts since sign-in, the money would reach the treasury
 * and then fail verification, leaving a transfer nobody has recorded. So the pay panel
 * checks first and says what to do. Import-free so it is unit-tested.
 */
export function payingWalletProblem(connected: string, sessionWallet: string | null): string | null {
  if (!sessionWallet) {
    return 'Approve the sign-in message in your wallet first, then pay from that wallet.'
  }
  if (connected !== sessionWallet) {
    const short = `${sessionWallet.slice(0, 4)}…${sessionWallet.slice(-4)}`
    return `Your wallet is now on a different account from the one you signed in with. Switch back to ${short} to pay, or sign out and sign in with this account.`
  }
  return null
}
