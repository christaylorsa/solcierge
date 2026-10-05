/**
 * Tests for the payment verifier.
 *
 * This is the one piece of the product where being wrong means either taking a
 * booking that was never paid for, or refusing one that was. Every case below is a
 * transaction we either must accept or must refuse, built by hand so the assertions
 * do not depend on a live cluster.
 *
 *   npm test
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { PublicKey, type VersionedTransactionResponse } from '@solana/web3.js'
import { verifyTransfer, toBaseUnits, fromBaseUnits, USDC_DECIMALS, SOL_DECIMALS } from './verify.ts'

const TREASURY = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
const PAYER = 'A1TMhSGzQxMr1TboBKtgixKz1sS6REASMxPo1qsyTSJd'
const OTHER = 'BQWWFhzBdw2vKKBUX17NHeFbCoFQHfRARpdztPE2tDJp'
const USDC = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'
const FAKE_USDC = 'So11111111111111111111111111111111111111112'

/** 88 base58 characters, the shape looksLikeSignature() expects. */
const SIG = '5'.repeat(88)

type TokenBalance = {
  accountIndex: number
  mint: string
  owner: string
  amount: string
}

/**
 * Builds something shaped like the RPC response, including the getAccountKeys()
 * accessor the verifier uses to resolve address-table lookups.
 */
function txFixture(options: {
  accounts: string[]
  preBalances?: number[]
  postBalances?: number[]
  preTokenBalances?: TokenBalance[]
  postTokenBalances?: TokenBalance[]
  err?: unknown
  blockTime?: number | null
  decimals?: number
}): VersionedTransactionResponse {
  const keys = options.accounts.map((address) => new PublicKey(address))
  const decimals = options.decimals ?? USDC_DECIMALS

  const toRpcBalance = (balance: TokenBalance) => ({
    accountIndex: balance.accountIndex,
    mint: balance.mint,
    owner: balance.owner,
    uiTokenAmount: {
      amount: balance.amount,
      decimals,
      uiAmount: Number(balance.amount) / 10 ** decimals,
      uiAmountString: balance.amount,
    },
  })

  return {
    slot: 300_000_000,
    blockTime: options.blockTime === undefined ? 1_800_000_000 : options.blockTime,
    transaction: {
      message: {
        getAccountKeys: () => ({
          length: keys.length,
          get: (index: number) => keys[index],
        }),
      },
      signatures: [SIG],
    },
    meta: {
      err: options.err ?? null,
      fee: 5000,
      preBalances: options.preBalances ?? [],
      postBalances: options.postBalances ?? [],
      preTokenBalances: (options.preTokenBalances ?? []).map(toRpcBalance),
      postTokenBalances: (options.postTokenBalances ?? []).map(toRpcBalance),
      innerInstructions: [],
      logMessages: [],
      loadedAddresses: { readonly: [], writable: [] },
    },
  } as unknown as VersionedTransactionResponse
}

const deps = (tx: VersionedTransactionResponse | null) => ({ getTransaction: async () => tx })

const SOL_BASE = {
  signature: SIG,
  recipient: TREASURY,
  token: 'SOL' as const,
  expectedAmount: 2.5,
  expectedPayer: PAYER,
}

const USDC_BASE = {
  signature: SIG,
  recipient: TREASURY,
  token: 'USDC' as const,
  expectedAmount: 118_000,
  mint: USDC,
  expectedPayer: PAYER,
}

// --- base unit maths -------------------------------------------------------

test('base units convert without floating point drift', () => {
  assert.equal(toBaseUnits(2.5, SOL_DECIMALS), 2_500_000_000n)
  assert.equal(toBaseUnits(0.1, SOL_DECIMALS) + toBaseUnits(0.2, SOL_DECIMALS), 300_000_000n)
  assert.equal(toBaseUnits('1430.000000001', SOL_DECIMALS), 1_430_000_000_001n)
  assert.equal(toBaseUnits(118_000, USDC_DECIMALS), 118_000_000_000n)
  // A value with more precision than the asset has is truncated, not rounded up,
  // so we can never require more than the member was shown.
  assert.equal(toBaseUnits('1.9999999999', SOL_DECIMALS), 1_999_999_999n)
})

test('base units round trip back to a trimmed decimal string', () => {
  assert.equal(fromBaseUnits(2_500_000_000n, SOL_DECIMALS), '2.5')
  assert.equal(fromBaseUnits(118_000_000_000n, USDC_DECIMALS), '118000')
  assert.equal(fromBaseUnits(1n, USDC_DECIMALS), '0.000001')
  assert.equal(fromBaseUnits(0n, SOL_DECIMALS), '0')
})

// --- SOL -------------------------------------------------------------------

test('accepts a SOL transfer that credits the treasury in full', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preBalances: [10_000_000_000, 1_000_000_000],
    postBalances: [7_499_995_000, 3_500_000_000],
  })

  const result = await verifyTransfer({ ...SOL_BASE, expectedPayer: PAYER }, deps(tx))
  assert.equal(result.status, 'confirmed')
  if (result.status !== 'confirmed') return
  assert.equal(result.observedAmount, 2.5)
  assert.equal(result.payer, PAYER)
})

test('accepts a credit larger than the quote: overpaying is not a failure', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preBalances: [10_000_000_000, 0],
    postBalances: [6_000_000_000, 3_000_000_000],
  })

  const result = await verifyTransfer(SOL_BASE, deps(tx))
  assert.equal(result.status, 'confirmed')
})

test('refuses a SOL transfer that is short by one lamport more than dust', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preBalances: [10_000_000_000, 0],
    postBalances: [7_500_000_000, 2_499_999_998],
  })

  const result = await verifyTransfer(SOL_BASE, deps(tx))
  assert.equal(result.status, 'mismatch')
  assert.match((result as { reason: string }).reason, /expected 2\.5 SOL/)
})

test('refuses a transfer the treasury does not appear in', async () => {
  const tx = txFixture({
    accounts: [PAYER, OTHER],
    preBalances: [10_000_000_000, 0],
    postBalances: [7_500_000_000, 2_500_000_000],
  })

  const result = await verifyTransfer(SOL_BASE, deps(tx))
  assert.equal(result.status, 'mismatch')
  assert.match((result as { reason: string }).reason, /does not appear/)
})

test('refuses a transfer where the treasury balance fell', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preBalances: [0, 5_000_000_000],
    postBalances: [1_000_000_000, 4_000_000_000],
  })

  const result = await verifyTransfer(SOL_BASE, deps(tx))
  assert.equal(result.status, 'mismatch')
})

// --- USDC ------------------------------------------------------------------

test('accepts a USDC transfer of the configured mint to the treasury', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preTokenBalances: [{ accountIndex: 3, mint: USDC, owner: TREASURY, amount: '1000000' }],
    postTokenBalances: [
      { accountIndex: 3, mint: USDC, owner: TREASURY, amount: '118001000000' },
    ],
  })

  const result = await verifyTransfer({ ...USDC_BASE, expectedPayer: PAYER }, deps(tx))
  assert.equal(result.status, 'confirmed')
  if (result.status !== 'confirmed') return
  assert.equal(result.observedAmount, 118_000)
})

test('accepts a first USDC payment, where the treasury account has no prior balance', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preTokenBalances: [],
    postTokenBalances: [
      { accountIndex: 4, mint: USDC, owner: TREASURY, amount: '118000000000' },
    ],
  })

  const result = await verifyTransfer(USDC_BASE, deps(tx))
  assert.equal(result.status, 'confirmed')
})

test('refuses a look-alike mint, however large the amount', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    postTokenBalances: [
      { accountIndex: 3, mint: FAKE_USDC, owner: TREASURY, amount: '999999000000' },
    ],
  })

  const result = await verifyTransfer(USDC_BASE, deps(tx))
  assert.equal(result.status, 'mismatch')
  assert.match((result as { reason: string }).reason, /different mint/)
})

test('refuses the right mint credited to the wrong owner', async () => {
  const tx = txFixture({
    accounts: [PAYER, OTHER],
    postTokenBalances: [{ accountIndex: 3, mint: USDC, owner: OTHER, amount: '118000000000' }],
  })

  const result = await verifyTransfer(USDC_BASE, deps(tx))
  assert.equal(result.status, 'mismatch')
})

test('refuses a token whose decimals are not USDC decimals', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    postTokenBalances: [{ accountIndex: 3, mint: USDC, owner: TREASURY, amount: '118000000000' }],
    decimals: 9,
  })

  const result = await verifyTransfer(USDC_BASE, deps(tx))
  assert.equal(result.status, 'mismatch')
  assert.match((result as { reason: string }).reason, /decimals/)
})

test('refuses a short USDC credit', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preTokenBalances: [{ accountIndex: 3, mint: USDC, owner: TREASURY, amount: '0' }],
    postTokenBalances: [{ accountIndex: 3, mint: USDC, owner: TREASURY, amount: '117999000000' }],
  })

  const result = await verifyTransfer(USDC_BASE, deps(tx))
  assert.equal(result.status, 'mismatch')
})

// --- transaction-level guards ---------------------------------------------

test('reports an unconfirmed transaction as not found, which the client retries', async () => {
  const result = await verifyTransfer(SOL_BASE, deps(null))
  assert.equal(result.status, 'not_found')
})

test('refuses a transaction that failed on chain', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preBalances: [10_000_000_000, 0],
    postBalances: [10_000_000_000, 0],
    err: { InstructionError: [0, 'Custom'] },
  })

  const result = await verifyTransfer(SOL_BASE, deps(tx))
  assert.equal(result.status, 'failed')
})

test('refuses a transfer signed by a wallet other than the account holder', async () => {
  const tx = txFixture({
    accounts: [OTHER, TREASURY],
    preBalances: [10_000_000_000, 0],
    postBalances: [7_500_000_000, 2_500_000_000],
  })

  const result = await verifyTransfer({ ...SOL_BASE, expectedPayer: PAYER }, deps(tx))
  assert.equal(result.status, 'mismatch')
  assert.match((result as { reason: string }).reason, /different wallet/)
})

test('refuses replaying a transfer that predates the payment intent', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    preBalances: [10_000_000_000, 0],
    postBalances: [7_500_000_000, 2_500_000_000],
    blockTime: 1_700_000_000,
  })

  const result = await verifyTransfer({ ...SOL_BASE, notBefore: 1_800_000_000 }, deps(tx))
  assert.equal(result.status, 'mismatch')
  assert.match((result as { reason: string }).reason, /predates this quote/)
})

test('refuses a malformed signature before spending an RPC call', async () => {
  let called = false
  const result = await verifyTransfer(
    { ...SOL_BASE, signature: 'not-a-signature' },
    {
      getTransaction: async () => {
        called = true
        return null
      },
    },
  )

  assert.equal(result.status, 'mismatch')
  assert.equal(called, false)
})

test('refuses a USDC payment with no mint configured', async () => {
  const tx = txFixture({
    accounts: [PAYER, TREASURY],
    postTokenBalances: [{ accountIndex: 3, mint: USDC, owner: TREASURY, amount: '118000000000' }],
  })

  const result = await verifyTransfer({ ...USDC_BASE, mint: null }, deps(tx))
  assert.equal(result.status, 'mismatch')
  assert.match((result as { reason: string }).reason, /No mint configured/)
})

test('SA-03: refuses any transfer when there is no signed-in wallet to bind the payer to', async () => {
  // A member signed in by email only. Without a payer, a stranger's transfer to the
  // treasury would settle their booking.
  let called = false
  const tx = txFixture({
    accounts: [OTHER, TREASURY],
    preBalances: [10_000_000_000, 0],
    postBalances: [7_500_000_000, 2_500_000_000],
  })
  const result = await verifyTransfer(
    { ...SOL_BASE, expectedPayer: '' },
    {
      getTransaction: async () => {
        called = true
        return tx
      },
    },
  )

  assert.equal(result.status, 'mismatch')
  assert.equal(called, false)
})
