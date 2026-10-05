import { LAMPORTS_PER_SOL, PublicKey, type VersionedTransactionResponse } from '@solana/web3.js'
import type { PaymentToken } from '@/lib/types'

const BASE58_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/

/** Cheap shape check, so obvious junk never costs an RPC call. */
export function looksLikeSignature(value: unknown): value is string {
  return typeof value === 'string' && BASE58_SIGNATURE.test(value)
}

export const USDC_DECIMALS = 6
export const SOL_DECIMALS = 9
export const LAMPORTS = LAMPORTS_PER_SOL

export type VerifyRequest = {
  signature: string
  /** Treasury address that must have received the funds. */
  recipient: string
  token: PaymentToken
  /** Expected amount in UI units. Comes from the server-held intent, never the client. */
  expectedAmount: number
  /** Required for USDC. The transfer must move this exact mint. */
  mint?: string | null
  /**
   * The signed-in member's wallet. Required: the fee payer must be this address, which
   * is what stops one member settling their booking with another member's transfer.
   */
  expectedPayer: string
  /** Unix seconds. Rejects a transaction that landed before the intent existed. */
  notBefore?: number
}

export type VerifyResult =
  | {
      status: 'confirmed'
      payer: string
      slot: number
      blockTime: number | null
      /** What actually arrived, in UI units. */
      observedAmount: number
    }
  | { status: 'not_found'; reason: string }
  | { status: 'failed'; reason: string }
  | { status: 'mismatch'; reason: string }

/** Minimal shape of the resolved account-key list, including address-table lookups. */
type AccountKeys = { length: number; get(index: number): PublicKey | undefined }

type Credit = { credited: bigint } | { error: string }

/** One base unit of slack, to absorb float representation only. Not an amount tolerance. */
const DUST = 1n

/**
 * How the verifier reads a transaction. Production passes fetchTransaction from
 * ./connection; tests pass a fixture. Keeping this an argument rather than an import
 * is what makes the module below pure, and therefore testable against transactions no
 * cluster would produce on request.
 */
export type VerifyDeps = {
  getTransaction: (signature: string) => Promise<VersionedTransactionResponse | null>
}

/**
 * The only thing that may promote a request to `paid`.
 *
 * Reads the transaction from RPC and proves, from the ledger alone, that the
 * treasury received at least the expected amount of the expected asset. The
 * client supplies a signature and nothing else that matters: amount, recipient
 * and mint all come from the server-held payment intent.
 */
export async function verifyTransfer(input: VerifyRequest, deps: VerifyDeps): Promise<VerifyResult> {
  if (!looksLikeSignature(input.signature)) {
    return { status: 'mismatch', reason: 'That is not a valid transaction signature.' }
  }

  let recipient: PublicKey
  try {
    recipient = new PublicKey(input.recipient)
  } catch {
    return {
      status: 'mismatch',
      reason: 'Treasury wallet is not a valid address. Check NEXT_PUBLIC_TREASURY_WALLET.',
    }
  }

  // Without a payer to bind to, any transfer to the treasury would do, including
  // someone else's. Refuse before spending an RPC call.
  if (!input.expectedPayer) {
    return { status: 'mismatch', reason: 'Sign in with the wallet you are paying from.' }
  }

  const tx = await deps.getTransaction(input.signature)

  if (!tx) {
    return { status: 'not_found', reason: 'The network has not confirmed this transaction yet.' }
  }
  if (tx.meta?.err) {
    return {
      status: 'failed',
      reason: 'The transaction was included but failed on chain. No funds moved.',
    }
  }

  // Address-table lookups mean the static keys are not the whole picture.
  const keys: AccountKeys = tx.transaction.message.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  })

  const feePayer = keys.get(0)?.toBase58()
  if (!feePayer) {
    return { status: 'mismatch', reason: 'Could not read the fee payer from the transaction.' }
  }
  if (feePayer !== input.expectedPayer) {
    return {
      status: 'mismatch',
      reason: 'That transaction was signed by a different wallet than the one on this account.',
    }
  }
  if (input.notBefore && tx.blockTime && tx.blockTime < input.notBefore) {
    return {
      status: 'mismatch',
      reason: 'That transaction predates this quote, so it cannot be the payment for it.',
    }
  }

  const observed =
    input.token === 'SOL' ? readSolCredit(tx, keys, recipient) : readTokenCredit(tx, recipient, input.mint)

  if ('error' in observed) return { status: 'mismatch', reason: observed.error }

  const decimals = input.token === 'SOL' ? SOL_DECIMALS : USDC_DECIMALS
  const expectedBase = toBaseUnits(input.expectedAmount, decimals)

  if (observed.credited + DUST < expectedBase) {
    return {
      status: 'mismatch',
      reason: `Treasury received ${fromBaseUnits(observed.credited, decimals)} ${input.token}, expected ${fromBaseUnits(expectedBase, decimals)} ${input.token}.`,
    }
  }

  return {
    status: 'confirmed',
    payer: feePayer,
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    observedAmount: Number(fromBaseUnits(observed.credited, decimals)),
  }
}

/**
 * Lamports the treasury gained, taken from the balance ledger rather than by
 * decoding instructions. A transfer buried inside a CPI still shows up here.
 */
function readSolCredit(
  tx: VersionedTransactionResponse,
  keys: AccountKeys,
  recipient: PublicKey,
): Credit {
  const target = recipient.toBase58()
  let index = -1
  for (let i = 0; i < keys.length; i += 1) {
    if (keys.get(i)?.toBase58() === target) {
      index = i
      break
    }
  }
  if (index === -1) return { error: 'The treasury wallet does not appear in that transaction.' }

  const pre = tx.meta?.preBalances?.[index]
  const post = tx.meta?.postBalances?.[index]
  if (pre === undefined || post === undefined) {
    return { error: 'The transaction did not report balances for the treasury account.' }
  }

  const credited = BigInt(post) - BigInt(pre)
  if (credited <= 0n) return { error: 'No SOL reached the treasury in that transaction.' }
  return { credited }
}

/**
 * SPL credit to the treasury, read from pre/post token balances. Matching on both
 * mint and owner is what stops a worthless look-alike token settling a USDC invoice.
 */
function readTokenCredit(
  tx: VersionedTransactionResponse,
  recipient: PublicKey,
  mint: string | null | undefined,
): Credit {
  if (!mint) return { error: 'No mint configured for this payment.' }
  try {
    new PublicKey(mint)
  } catch {
    return { error: 'Configured USDC mint is not a valid address.' }
  }

  const owner = recipient.toBase58()
  const post = (tx.meta?.postTokenBalances ?? []).filter(
    (balance) => balance.mint === mint && balance.owner === owner,
  )
  if (post.length === 0) {
    return {
      error: 'That transaction did not credit the treasury USDC account, or it moved a different mint.',
    }
  }

  const pre = tx.meta?.preTokenBalances ?? []
  let credited = 0n
  for (const entry of post) {
    if (entry.uiTokenAmount.decimals !== USDC_DECIMALS) {
      return { error: 'The token moved does not have USDC decimals.' }
    }
    // A freshly created associated token account has no pre-balance entry: treat it as zero.
    const before = pre.find((p) => p.accountIndex === entry.accountIndex)
    const beforeAmount = before ? BigInt(before.uiTokenAmount.amount) : 0n
    credited += BigInt(entry.uiTokenAmount.amount) - beforeAmount
  }

  if (credited <= 0n) return { error: 'No USDC reached the treasury in that transaction.' }
  return { credited }
}

/** Decimal-string maths, so 0.1 + 0.2 never decides whether an invoice is settled. */
export function toBaseUnits(amount: number | string, decimals: number): bigint {
  const text = typeof amount === 'number' ? amount.toFixed(decimals) : amount.trim()
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.')
  const padded = (fraction + '0'.repeat(decimals)).slice(0, decimals)
  const value = BigInt((whole || '0') + padded)
  return negative ? -value : value
}

export function fromBaseUnits(value: bigint, decimals: number): string {
  const negative = value < 0n
  const digits = (negative ? -value : value).toString().padStart(decimals + 1, '0')
  const whole = digits.slice(0, digits.length - decimals)
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '')
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`
}
