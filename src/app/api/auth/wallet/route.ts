import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { z } from 'zod'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { upsertUserByWallet } from '@/lib/auth'
import { consumeNonce, issueWalletSession } from '@/lib/session'
import { signInMessage } from '@/lib/siws'
import { clientIp, createLimiter } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

// Per instance (SA-17). Each success can create a users row, so keep it bounded.
const perIp = createLimiter({ limit: 20, windowMs: 60_000 })

const schema = z.object({
  wallet: z.string().max(64),
  signature: z.string().max(128),
  nonce: z.string().regex(/^[0-9a-f]{32}$/),
})

/**
 * Step two of wallet sign-in. Verifies an ed25519 signature over the nonce message
 * against the claimed public key. Passing a wallet address alone proves nothing, so
 * the signature check here is what makes "wallet address = account identity" safe.
 */
export async function POST(request: Request) {
  try {
    if (!perIp.take(clientIp(request))) return fail('Too many attempts. Wait a minute and try again.', 429)

    const parsed = schema.safeParse(await readJson<unknown>(request))
    if (!parsed.success) return fail('Wallet, signature and nonce are all required.')
    const body = parsed.data

    const challenge = await consumeNonce(body.nonce, body.wallet)
    if (!challenge) {
      return fail('That sign-in request expired. Try connecting again.', 400)
    }

    let publicKey: PublicKey
    try {
      publicKey = new PublicKey(body.wallet)
    } catch {
      return fail('That is not a valid Solana address.')
    }

    let signature: Uint8Array
    try {
      signature = bs58.decode(body.signature)
    } catch {
      return fail('The signature could not be decoded.')
    }
    if (signature.length !== 64) return fail('The signature is the wrong length.')

    // Rebuilt from the fields we signed into the nonce cookie, never from the client.
    const message = new TextEncoder().encode(signInMessage(challenge))
    const valid = nacl.sign.detached.verify(message, signature, publicKey.toBytes())
    if (!valid) return fail('That signature does not match the wallet.', 401)

    const user = await upsertUserByWallet(publicKey.toBase58())
    if (!user) return fail('Could not open an account for that wallet.', 500)

    await issueWalletSession({ wallet: publicKey.toBase58(), userId: user.id })

    return ok({
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
