/**
 * Where the contact details a member types into a brief end up.
 *
 * users.email is a login identity: a magic-link sign-in resolves to the row holding
 * that address. So only a verified Supabase sign-in may ever set it. Whatever a member
 * types is unverified, so it is kept on the request (where the desk and the alert see
 * it) and never written to users.email. It may fill an empty users.contact_email,
 * the profile's address for booking updates, which is not an identity. The name is not an identity, so it can still
 * fill an empty profile name.
 */
export type ContactInput = { contact_name?: string; contact_email?: string }

export function contactRecord(input: ContactInput, viewer: { name: string | null; contact_email?: string | null }) {
  const details: ContactInput = {}
  if (input.contact_name) details.contact_name = input.contact_name
  if (input.contact_email) details.contact_email = input.contact_email.toLowerCase()

  // users.contact_email is the profile's unverified address for updates, not a login,
  // so it may be backfilled. users.email never is.
  const userPatch: { name?: string; contact_email?: string } = {}
  if (input.contact_name && !viewer.name) userPatch.name = input.contact_name
  if (details.contact_email && !viewer.contact_email) userPatch.contact_email = details.contact_email

  return { details, userPatch }
}
