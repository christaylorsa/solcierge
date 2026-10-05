import type { Metadata } from 'next'
import Link from 'next/link'
import { ProfileForm } from '@/components/account/ProfileForm'
import { SignedOutPanel } from '@/components/account/SignedOutPanel'
import { TelegramConnect } from '@/components/account/TelegramConnect'
import { Section, SectionHead } from '@/components/site/Section'
import { getViewer } from '@/lib/auth'
import { getProfile } from '@/lib/data'
import { explorerAddressUrl } from '@/lib/env'
import { shortAddress } from '@/lib/format'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const viewer = await getViewer()

  if (!viewer) {
    return (
      <Section>
        <SectionHead eyebrow="Your account" title="Sign in to edit your profile" />
        <div className="mt-12 max-w-md">
          <SignedOutPanel />
        </div>
      </Section>
    )
  }

  const profile = await getProfile(viewer.id)

  return (
    <Section>
      <nav className="flex items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
        <Link href="/account" className="transition-colors duration-300 ease hover:text-accent-soft">
          My bookings
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-muted">Profile</span>
      </nav>

      <SectionHead
        eyebrow="Your account"
        title={profile.name ? profile.name : 'Your profile'}
        lede="How the desk addresses you and reaches you. Only you and your concierge see this."
      />

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
        <ProfileForm
          initial={{
            name: profile.name ?? '',
            contact_email: profile.contact_email ?? '',
            phone: profile.phone ?? '',
          }}
          verifiedEmail={viewer.email}
        />

        <div className="space-y-6">
          <div className="border border-line bg-surface p-6 sm:p-7">
            <p className="eyebrow">Signed in with</p>
            {viewer.wallet_address ? (
              <>
                <a
                  href={explorerAddressUrl(viewer.wallet_address)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-underline mt-4 inline-block font-mono text-sm text-ink"
                  title={viewer.wallet_address}
                >
                  {shortAddress(viewer.wallet_address, 6)}
                </a>
                <p className="mt-3 text-xs leading-relaxed text-faint">
                  Your wallet is your account. It cannot be changed here: sign in with another
                  wallet and you get a separate account.
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink">{viewer.email}</p>
            )}
          </div>

          <TelegramConnect connected={profile.telegram_linked} />
        </div>
      </div>
    </Section>
  )
}
