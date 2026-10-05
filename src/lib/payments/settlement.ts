/**
 * What a proven transfer does to its booking.
 *
 * By the time this runs, the ledger has shown the treasury received at least the
 * locked amount, so the funds have moved and the payment is always recorded. This
 * decides only whether the booking may be promoted to `paid` automatically, or
 * whether the desk has to look first. Automatic settlement needs every one of: the
 * booking still waiting on this quote, the lock still the live one, and the transfer
 * landing inside the lock (plus grace). Anything else goes to review with a reason
 * the operator can act on.
 *
 * Pure and import-free so every branch is unit-tested.
 */

export type IntentStatus = 'open' | 'expired' | 'consumed'

export type SettlementInput = {
  bookingStatus: string
  intentStatus: IntentStatus
  intentQuoteId: string
  /** The newest quote on the booking, or null if it has none. */
  currentQuoteId: string | null
  /** Unix seconds the transfer landed, as reported by the ledger. */
  blockTime: number | null
  /** Unix seconds the rate lock expired. */
  lockExpiresAt: number
  graceSeconds: number
}

export type Settlement = { kind: 'paid' } | { kind: 'review'; reason: string }

export function decideSettlement(input: SettlementInput): Settlement {
  if (input.bookingStatus !== 'quoted') {
    return { kind: 'review', reason: `The booking was ${input.bookingStatus} when the transfer arrived.` }
  }
  if (input.intentQuoteId !== input.currentQuoteId) {
    return { kind: 'review', reason: 'It paid a rate lock taken against an earlier quote.' }
  }
  if (input.intentStatus === 'consumed') {
    return { kind: 'review', reason: 'Its rate lock had already been settled by another transfer.' }
  }
  if (input.intentStatus === 'expired') {
    return { kind: 'review', reason: 'It paid a rate lock that had been replaced or withdrawn.' }
  }
  // Without a block time neither "after the quote" nor "inside the lock" can be shown.
  if (input.blockTime === null) {
    return { kind: 'review', reason: 'The ledger did not report when it landed.' }
  }
  if (input.blockTime > input.lockExpiresAt + input.graceSeconds) {
    return { kind: 'review', reason: 'It landed after the 10-minute rate lock expired.' }
  }
  return { kind: 'paid' }
}

/**
 * A signature that is already recorded: harmless on its own booking, a replay on
 * any other. The unique index on payments.tx_signature makes this the arbiter for
 * concurrent verifies too.
 */
export function duplicateOutcome(recordedRequestId: string, requestId: string): 'already_paid' | 'mismatch' {
  return recordedRequestId === requestId ? 'already_paid' : 'mismatch'
}
