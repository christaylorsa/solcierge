import type { Metadata } from 'next'
import Link from 'next/link'
import { Introductions } from '@/components/account/Introductions'
import { MemberHeader } from '@/components/account/MemberHeader'
import { Privileges } from '@/components/account/Privileges'
import { ProfileForm } from '@/components/account/ProfileForm'
import { SignedOutPanel } from '@/components/account/SignedOutPanel'
import { TelegramConnect } from '@/components/account/TelegramConnect'
import { TierLadder } from '@/components/account/TierLadder'
import { XConnect } from '@/components/account/XConnect'
import { Section, SectionHead } from '@/components/site/Section'
import { getViewer } from '@/lib/auth'
import { ensureReferralCode, getProfile, getReferralSummary, listRequestsForUser } from '@/lib/data'
import { explorerAddressUrl, publicEnv, serverEnv } from '@/lib/env'
import { shortAddress } from '@/lib/format'
import { lifetimeSpend, standing } from '@/lib/tiers'

export const metadata: Metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

const X_OUTCOMES = new Set(['connected', 'cancelled', 'expired', 'taken', 'failed', 'busy', 'signin', 'unavailable'])

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ x?: string }> }) {
  const [viewer, query] = await Promise.all([getViewer(), searchParams])

  if (!viewer) {
    return (
      <Section>
        <SectionHead eyebrow="Your account" title="Sign in to see your profile" />
        <div className="mt-12 max-w-md">
          <SignedOutPanel />
        </div>
      </Section>
    )
  }

  const [profile, requests, summary] = await Promise.all([
    getProfile(viewer.id),
    listRequestsForUser(viewer.id),
    getReferralSummary(viewer.id),
  ])
  const code = await ensureReferralCode(viewer.id, profile.referral_code)
  const position = standing(lifetimeSpend(requests))

  let xAvailable = false
  try {
    const env = serverEnv()
    xAvailable = Boolean(env.xClientId && env.xClientSecret)
  } catch {
    xAvailable = false
  }
  const xOutcome = query.x && X_OUTCOMES.has(query.x) ? query.x : null

  return (
    <Section>
      <nav className="flex items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
        <Link href="/account" className="transition-colors duration-300 ease hover:text-accent-soft">
          My bookings
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-muted">Profile</span>
      </nav>

      <div className="mt-8">
        <MemberHeader name={profile.name} x={profile.x} memberSince={profile.member_since} standing={position} />
      </div>

      <div className="mt-24 sm:mt-28">
        <TierLadder standing={position} />
      </div>

      <div className="rule mt-24 sm:mt-28" aria-hidden="true" />

      <div className="mt-24 sm:mt-28">
        <Privileges tier={position.tier} />
      </div>

      <div className="rule mt-24 sm:mt-28" aria-hidden="true" />

      <div className="mt-24 sm:mt-28">
        <Introductions
          code={code}
          siteUrl={publicEnv.siteUrl}
          hasX={Boolean(profile.x)}
          cardVersion={profile.x?.avatar_url ?? profile.x?.username ?? 'member'}
          summary={summary}
          canClaim={!profile.referred && position.spend === 0}
        />
      </div>

      <div id="connections" className="mt-24 scroll-mt-28 sm:mt-28">
        <p className="eyebrow">Your details</p>
        <h2 className="display mt-4 text-[clamp(2rem,4vw,3rem)] text-ink">How the desk reaches you</h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
          Only you and your concierge see these. Your name is never shown on your card.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
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
                    Your wallet is your account. It cannot be changed here: sign in with another wallet and you
                    get a separate account.
                  </p>
                </>
              ) : (
                <p className="mt-4 text-sm text-ink">{viewer.email}</p>
              )}
            </div>

            <XConnect x={profile.x} outcome={xOutcome} available={xAvailable} />
            <TelegramConnect connected={profile.telegram_linked} />
          </div>
        </div>
      </div>
    </Section>
  )
}
