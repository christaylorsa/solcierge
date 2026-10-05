import { PublicKey } from '@solana/web3.js'
import bs58 from 'bs58'
import nacl from 'tweetnacl'
import { fail, handleError, ok, readJson } from '@/lib/api'
import { upsertUserByWallet } from '@/lib/auth'
import { consumeNonce, issueWalletSession, signInMessage } from '@/lib/session'

export const dynamic = 'force-dynamic'

type Body = { wallet?: string; signature?: string; nonce?: string }

/**
 * Step two of wallet sign-in. Verifies an ed25519 signature over the nonce message
 * against the claimed public key. Passing a wallet address alone proves nothing, so
 * the signature check here is what makes "wallet address = account identity" safe.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson<Body>(request)
    if (!body?.wallet || !body.signature || !body.nonce) {
      return fail('Wallet, signature and nonce are all required.')
    }

    if (!(await consumeNonce(body.nonce, body.wallet))) {
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

    const message = new TextEncoder().encode(signInMessage(body.wallet, body.nonce))
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
