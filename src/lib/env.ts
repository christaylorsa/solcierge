/**
 * Environment access in one place.
 *
 * `publicEnv` is inlined at build time and safe in the browser. `serverEnv()`
 * throws if a secret is missing, and is only ever called from route handlers or
 * server components, so a misconfigured deploy fails loudly at the first request
 * instead of silently writing nowhere.
 */

const PUBLIC_RPC = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
} as const

const USDC_MINTS = {
  'mainnet-beta': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  testnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
} as const

export type Cluster = keyof typeof USDC_MINTS

function cluster(): Cluster {
  const raw = process.env.NEXT_PUBLIC_SOLANA_CLUSTER
  return raw === 'mainnet-beta' || raw === 'devnet' || raw === 'testnet' ? raw : 'devnet'
}

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  treasuryWallet: process.env.NEXT_PUBLIC_TREASURY_WALLET ?? '',
  /** Optional direct browser endpoint. Empty means the browser goes through /api/rpc. */
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? '',
  cluster: cluster(),
  usdcMint: process.env.NEXT_PUBLIC_USDC_MINT || USDC_MINTS[cluster()],
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
}

/** True when Supabase and the treasury are configured. Drives the setup banner. */
export const isConfigured =
  publicEnv.supabaseUrl.startsWith('http') &&
  publicEnv.supabaseAnonKey.length > 0 &&
  publicEnv.treasuryWallet.length > 0

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

/** The session signing secret. Too short to resist brute force counts as missing (SA-13). */
function sessionSecret(): string {
  const value = required('SESSION_SECRET')
  if (value.length < 32) throw new Error('Missing environment variable: SESSION_SECRET (needs at least 32 characters)')
  return value
}

function list(name: string): string[] {
  return (process.env[name] ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function serverEnv() {
  return {
    supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    sessionSecret: sessionSecret(),
    rpcUrl: process.env.SOLANA_RPC_URL || publicEnv.rpcUrl || PUBLIC_RPC[cluster()],
    treasuryWallet: required('NEXT_PUBLIC_TREASURY_WALLET'),
    usdcMint: publicEnv.usdcMint,
    adminWallets: list('ADMIN_WALLETS'),
    adminEmails: list('ADMIN_EMAILS').map((e) => e.toLowerCase()),
    priceSource: process.env.PRICE_SOURCE === 'coingecko' ? 'coingecko' : 'jupiter',
    coingeckoKey: process.env.COINGECKO_API_KEY ?? '',
    rateLockSeconds: Number(process.env.RATE_LOCK_SECONDS ?? 600) || 600,
    // Operator alerts. Each channel is optional and skipped when unset.
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
    telegramChatIds: list('TELEGRAM_CHAT_IDS'),
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    alertEmails: list('ALERT_EMAILS'),
    alertFrom: process.env.ALERT_FROM || 'Solcierge Desk <desk@solcierge.xyz>',
  }
}

export function explorerTxUrl(signature: string): string {
  const suffix = publicEnv.cluster === 'mainnet-beta' ? '' : `?cluster=${publicEnv.cluster}`
  return `https://explorer.solana.com/tx/${signature}${suffix}`
}

export function explorerAddressUrl(address: string): string {
  const suffix = publicEnv.cluster === 'mainnet-beta' ? '' : `?cluster=${publicEnv.cluster}`
  return `https://explorer.solana.com/address/${address}${suffix}`
}
