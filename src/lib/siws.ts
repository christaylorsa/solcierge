/**
 * The sign-in message, in the Sign In With Solana (SIWS) text format.
 *
 * The first line names the domain asking for the signature. Phantom and Solflare
 * recognise this format and warn when that domain is not the page the member is on,
 * so a look-alike site cannot pass off our challenge as its own. The server never
 * trusts the client's copy of the text: it rebuilds it from the fields it signed into
 * the nonce cookie, and verifies the signature against that.
 *
 * Import-free so the exact bytes are unit-tested.
 */
export type SignInFields = {
  /** Host (with port, if any) of the site that issued the challenge. */
  domain: string
  address: string
  /** Origin of the site that issued the challenge. */
  uri: string
  chainId: string
  nonce: string
  /** ISO 8601. */
  issuedAt: string
  /** ISO 8601. */
  expirationTime: string
}

const STATEMENT =
  'Sign in to your Solcierge concierge account. This signature proves you control the wallet. It authorises no transaction and moves no funds.'

/** SIWS chain ids are the bare cluster names, with mainnet-beta written as mainnet. */
export function siwsChainId(cluster: string): string {
  return cluster === 'mainnet-beta' ? 'mainnet' : cluster
}

export function signInMessage(fields: SignInFields): string {
  return [
    `${fields.domain} wants you to sign in with your Solana account:`,
    fields.address,
    '',
    STATEMENT,
    '',
    `URI: ${fields.uri}`,
    'Version: 1',
    `Chain ID: ${fields.chainId}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt}`,
    `Expiration Time: ${fields.expirationTime}`,
  ].join('\n')
}
