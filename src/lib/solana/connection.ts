import { Connection, type VersionedTransactionResponse } from '@solana/web3.js'
import { serverEnv } from '@/lib/env'

let cached: Connection | null = null

/** Server-side RPC connection. Uses SOLANA_RPC_URL so the private endpoint never reaches the browser. */
export function rpc(): Connection {
  if (cached) return cached
  cached = new Connection(serverEnv().rpcUrl, { commitment: 'confirmed' })
  return cached
}

/**
 * The transaction fetcher handed to verifyTransfer in production.
 *
 * It lives here rather than inside the verifier so that verify.ts stays free of any
 * infrastructure: the verifier is pure decision logic over a transaction, which is
 * what makes it testable against transactions no cluster would give us on demand.
 */
export function fetchTransaction(signature: string): Promise<VersionedTransactionResponse | null> {
  return rpc().getTransaction(signature, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  })
}
