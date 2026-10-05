/**
 * Which network an RPC endpoint is really on.
 *
 * A transfer is only worth anything on the cluster the deployment says it settles
 * on. If SOLANA_RPC_URL were left on devnet while NEXT_PUBLIC_SOLANA_CLUSTER says
 * mainnet-beta, free devnet SOL would verify against real bookings. Every cluster
 * has a fixed genesis hash, so asking the endpoint for it settles the question.
 */
export const GENESIS_HASHES = {
  'mainnet-beta': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
  devnet: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  testnet: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY',
} as const

export type KnownCluster = keyof typeof GENESIS_HASHES

/** Null when the endpoint is on the expected cluster, otherwise what is wrong. */
export function clusterMismatch(expected: KnownCluster, genesisHash: string): string | null {
  if (genesisHash === GENESIS_HASHES[expected]) return null
  const actual = (Object.keys(GENESIS_HASHES) as KnownCluster[]).find((name) => GENESIS_HASHES[name] === genesisHash)
  return `SOLANA_RPC_URL is on ${actual ?? 'an unknown cluster'}, but NEXT_PUBLIC_SOLANA_CLUSTER is ${expected}.`
}
