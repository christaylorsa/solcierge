'use client'

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  type TransactionInstruction,
} from '@solana/web3.js'
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { toBaseUnits, SOL_DECIMALS, USDC_DECIMALS } from './verify'
import type { PaymentToken } from '@/lib/types'

export type BuildTransferInput = {
  connection: Connection
  payer: PublicKey
  recipient: string
  token: PaymentToken
  /** UI units, taken from the server-issued intent. */
  amount: number
  mint?: string | null
}

export type BuiltTransfer = {
  transaction: Transaction
  blockhash: string
  lastValidBlockHeight: number
}

/** Thrown for problems the member can act on, so the pay panel can show them verbatim. */
export class TransferSetupError extends Error {}

export async function buildTransferTransaction(input: BuildTransferInput): Promise<BuiltTransfer> {
  const recipient = new PublicKey(input.recipient)
  const instructions: TransactionInstruction[] =
    input.token === 'SOL'
      ? [solInstruction(input.payer, recipient, input.amount)]
      : await usdcInstructions(input, recipient)

  const { blockhash, lastValidBlockHeight } = await input.connection.getLatestBlockhash('confirmed')
  const transaction = new Transaction({
    feePayer: input.payer,
    blockhash,
    lastValidBlockHeight,
  }).add(...instructions)

  return { transaction, blockhash, lastValidBlockHeight }
}

function solInstruction(payer: PublicKey, recipient: PublicKey, amount: number): TransactionInstruction {
  const lamports = toBaseUnits(amount, SOL_DECIMALS)
  if (lamports <= 0n) throw new TransferSetupError('This quote has no amount to pay.')
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: recipient,
    lamports: Number(lamports),
  })
}

async function usdcInstructions(
  input: BuildTransferInput,
  recipient: PublicKey,
): Promise<TransactionInstruction[]> {
  if (!input.mint) throw new TransferSetupError('No USDC mint is configured for this deployment.')
  const mint = new PublicKey(input.mint)

  // Mints live under either the original Token program or Token-2022. Reading the
  // owner is cheaper and more reliable than assuming.
  const mintAccount = await input.connection.getAccountInfo(mint)
  if (!mintAccount) {
    throw new TransferSetupError('The configured USDC mint does not exist on this cluster.')
  }
  const programId = mintAccount.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID

  const source = getAssociatedTokenAddressSync(mint, input.payer, false, programId)
  // allowOwnerOffCurve, because a treasury is often a multisig PDA rather than a keypair.
  const destination = getAssociatedTokenAddressSync(mint, recipient, true, programId)

  const amount = toBaseUnits(input.amount, USDC_DECIMALS)
  if (amount <= 0n) throw new TransferSetupError('This quote has no amount to pay.')

  const [sourceInfo, destinationInfo] = await input.connection.getMultipleAccountsInfo([source, destination])

  if (!sourceInfo) {
    throw new TransferSetupError(
      'This wallet holds no USDC account on this cluster. Fund it with USDC, or pay in SOL instead.',
    )
  }

  const instructions: TransactionInstruction[] = []
  if (!destinationInfo) {
    // First USDC payment to this treasury. The member covers the ~0.002 SOL rent.
    instructions.push(
      createAssociatedTokenAccountInstruction(input.payer, destination, recipient, mint, programId),
    )
  }

  instructions.push(
    createTransferCheckedInstruction(
      source,
      mint,
      destination,
      input.payer,
      amount,
      USDC_DECIMALS,
      [],
      programId,
    ),
  )

  return instructions
}
