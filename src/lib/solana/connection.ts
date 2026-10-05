import { Connection, type VersionedTransactionResponse } from '@solana/web3.js'
import { publicEnv, serverEnv } from '@/lib/env'
import { clusterMismatch } from './cluster'

let cached: Connection | null = null

/** Server-side RPC connection. Uses SOLANA_RPC_URL so the private endpoint never reaches the browser. */
export function rpc(): Connection {
  if (cached) return cached
  cached = new Connection(serverEnv().rpcUrl, { commitment: 'confirmed' })
  return cached
}

let clusterChecked: Promise<void> | null = null

/**
 * Proves the RPC endpoint is on the cluster this deployment settles on, once per
 * instance. A failed or mismatched check is not cached, so a fixed config or a
 * recovered endpoint is picked up on the next payment.
 */
function assertCluster(): Promise<void> {
  clusterChecked ??= rpc()
    .getGenesisHash()
    .then((hash) => {
      const problem = clusterMismatch(publicEnv.cluster, hash)
      if (problem) throw new Error(`Misconfigured: ${problem}`)
    })
    .catch((error: unknown) => {
      clusterChecked = null
      throw error
    })
  return clusterChecked
}

/**
 * The transaction fetcher handed to verifyTransfer in production.
 *
 * It lives here rather than inside the verifier so that verify.ts stays free of any
 * infrastructure: the verifier is pure decision logic over a transaction, which is
 * what makes it testable against transactions no cluster would give us on demand.
 */
export async function fetchTransaction(signature: string): Promise<VersionedTransactionResponse | null> {
  await assertCluster()
  // Finalized, not confirmed: a booking marked paid is acted on irreversibly, so it
  // waits the ~13 s for a rooted block (SA-11). Until then this returns null and the
  // pay panel keeps polling.
  return rpc().getTransaction(signature, {
    commitment: 'finalized',
    maxSupportedTransactionVersion: 0,
  })
}
