/**
 * Operator rights, decided from the identity a session actually proved.
 *
 * A wallet session proved its wallet with a signature; an email session proved its
 * email through a Supabase magic link. Columns on the users row are not proof of
 * anything (a member can write their own contact details), so they never take part
 * in this decision. Kept free of imports so the rule is unit-testable on its own.
 */
export type ProvenIdentity = { kind: 'wallet'; wallet: string } | { kind: 'email'; email: string }

export type AdminAllowlist = { wallets: readonly string[]; emails: readonly string[] }

export function isAdminIdentity(identity: ProvenIdentity, allow: AdminAllowlist): boolean {
  if (identity.kind === 'wallet') return allow.wallets.includes(identity.wallet)
  return allow.emails.includes(identity.email.toLowerCase())
}
