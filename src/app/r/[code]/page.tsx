import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MemberAvatar } from '@/components/account/MemberAvatar'
import { Section } from '@/components/site/Section'
import { findReferrer } from '@/lib/data'
import { displayCode } from '@/lib/referrals'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ code: string }> }

/**
 * Where a shared card lands. The middleware has already remembered the code by the
 * time this renders; the page only has to welcome the visitor and point them on.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const referrer = await findReferrer(code).catch(() => null)
  if (!referrer) return { title: 'Introduction not found', robots: { index: false } }

  const shown = displayCode(referrer.code)
  const from = referrer.x ? `@${referrer.x.username}` : 'A Solcierge member'
  const title = `${from} has introduced you to Solcierge`
  const description = 'Book anything. Pay in crypto. Jets, yachts, villas, cars, tables and access, quoted in USD and settled in SOL or USDC.'
  const image = { url: `/card/${shown}`, width: 1200, height: 630, alt: `${title}. Code ${shown}.` }

  return {
    title: { absolute: `${title} · Solcierge` },
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description, type: 'website', siteName: 'Solcierge', url: `/r/${shown}`, images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function IntroductionPage({ params }: Props) {
  const { code } = await params
  const referrer = await findReferrer(code).catch(() => null)
  if (!referrer) notFound()

  const handle = referrer.x ? `@${referrer.x.username}` : null

  return (
    <Section className="relative overflow-hidden">
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <MemberAvatar src={referrer.x?.avatar_url ?? null} name={referrer.x?.name ?? handle} size={104} />
        <p className="eyebrow mt-8">By introduction</p>
        <h1 className="display mt-5 text-[clamp(2.5rem,6vw,4.25rem)] text-ink">
          {handle ? (
            <>
              {handle}
              <span className="block italic text-muted">has introduced you</span>
            </>
          ) : (
            <>
              A member
              <span className="block italic text-muted">has introduced you</span>
            </>
          )}
        </h1>
        <p className="lede mt-8 max-w-xl">
          Solcierge books jets, yachts, villas, cars, tables and access. Tell us what you want, take a quote in USD,
          and settle in SOL or USDC. There is no fee to ask.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/request" className="btn btn-primary">
            Make a request
          </Link>
          <Link href="/#how" className="btn btn-ghost">
            How it works
          </Link>
        </div>

        <p className="mt-10 text-xs leading-relaxed text-faint">
          Introduction code <span className="tracking-[0.14em] text-accent-soft">{displayCode(referrer.code)}</span> is
          saved on this device for 30 days and applied when you open your account.
        </p>
      </div>
    </Section>
  )
}
