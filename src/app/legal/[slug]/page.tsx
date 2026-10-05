import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Section } from '@/components/site/Section'

/**
 * Placeholder legal copy.
 *
 * These are structured drafts, not advice, and each one is explicit about what a
 * lawyer still has to decide. Shipping empty pages behind footer links is worse than
 * shipping honest ones: a member clicking "refund policy" should at least learn what
 * is undecided.
 */
type Page = {
  title: string
  intro: string
  sections: { heading: string; body: string[]; todo?: string }[]
}

const PAGES: Record<string, Page> = {
  'concierge-terms': {
    title: 'Concierge terms',
    intro:
      'Solcierge acts as your agent in sourcing and arranging bookings. We are not the operator of the aircraft, vessel, property, vehicle or venue, and we do not resell inventory we hold.',
    sections: [
      {
        heading: 'What we do',
        body: [
          'You submit a request. We source options from operators and suppliers, then present a single quote in USD covering the arrangement as described in the quote notes.',
          'Accepting a quote and settling it instructs us to contract with the supplier on your behalf. The supplier delivers the service and their own terms apply alongside these.',
        ],
      },
      {
        heading: 'What the quote covers',
        body: [
          'The quote notes are the definition of scope. Anything not listed there is not included, including but not limited to gratuities, taxes levied at the point of service, provisioning billed at cost, fuel surcharges and damage deposits.',
          'Where a supplier requires a deposit held against damage or excess, we will say so in the quote notes, along with the conditions for its release.',
        ],
      },
      {
        heading: 'Your obligations',
        body: [
          'Information you give us is relied on directly, including passenger names, ages, licence details, dietary requirements and medical needs. An inaccurate brief can make a booking undeliverable at your cost.',
          'You confirm the funds you settle with are lawfully yours and not subject to any restriction.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'Our liability is limited to the concierge fee element of any booking. Suppliers are responsible for the service they deliver.',
        ],
        todo: 'Counsel to set the liability cap, governing law, jurisdiction and the arbitration position. Also to confirm agency-versus-principal characterisation in each operating market, since it changes both consumer-protection duties and the tax treatment of the fee.',
      },
    ],
  },
  'crypto-risk': {
    title: 'Crypto volatility notice',
    intro:
      'You settle bookings in SOL or USDC. Both are volatile relative to the currencies our suppliers invoice in, and the mechanics below exist to keep that volatility from landing on you unexpectedly.',
    sections: [
      {
        heading: 'Quotes are in USD',
        body: [
          'Every quote is a USD figure, because that is what suppliers invoice. USDC settles one for one against it. SOL is converted at pay-time.',
        ],
      },
      {
        heading: 'The rate lock',
        body: [
          'When you open the pay panel we take a live SOL/USD rate, write down the exact amount of SOL we will accept, and start a ten-minute countdown you can see.',
          'Inside that window the amount cannot change. If the window lapses before you sign, the amount is void and you take a fresh rate. We will never quietly re-price a lock you are looking at.',
        ],
      },
      {
        heading: 'Payments are final',
        body: [
          'A confirmed Solana transaction cannot be reversed by us, by you, or by anyone else. There is no chargeback mechanism. Check the amount and the recipient before you approve anything in your wallet.',
          'If you send to the wrong address, or send an amount that does not match your locked quote, we may be unable to recover it. Contact the desk immediately and we will do what can be done.',
        ],
      },
      {
        heading: 'What we verify',
        body: [
          'Before a booking is marked paid, our server reads your transaction from a Solana RPC and checks the recipient, the asset, the mint in the case of USDC, and the amount credited. A payment is never confirmed on the strength of what a browser reports.',
        ],
        todo: 'Counsel to confirm the disclosure wording required in each market, and whether taking SOL as settlement triggers any licensing, VAT or money-transmission obligation for the operating entity.',
      },
    ],
  },
  refunds: {
    title: 'Cancellation and refunds',
    intro:
      'Refund terms on a booking are the supplier’s terms, and they vary enormously. A charter cancelled inside seven days is usually unrecoverable; a restaurant table often costs nothing to release.',
    sections: [
      {
        heading: 'Before you settle',
        body: [
          'Nothing is committed. You can let a quote expire or ask the desk to close the request, at no cost.',
        ],
      },
      {
        heading: 'After you settle',
        body: [
          'We pass your instruction to the supplier immediately, so what can be refunded depends on their cancellation schedule at that moment. The applicable schedule is stated in the quote notes before you pay.',
          'Where a refund is due, we return the same asset you paid in, to the wallet that paid. Because crypto prices move, the value in USD terms at the time of the refund may differ from the value at the time of payment, in either direction. We refund the asset amount, not the dollar amount.',
        ],
      },
      {
        heading: 'If we cannot deliver',
        body: [
          'If we accept a payment and then cannot deliver the booking, you get a full refund of the asset amount you sent, less any network fee, without needing to ask.',
        ],
        todo: 'Open decisions for counsel and the desk: whether refunds go out in the original asset or in USDC by default; who absorbs the price move between payment and refund; the concierge fee retention on member-initiated cancellations; and the timeframe we commit to in writing. Until this is settled, the desk agrees refund terms case by case and states them in the quote notes.',
      },
    ],
  },
  privacy: {
    title: 'Privacy',
    intro:
      'We hold the minimum needed to arrange a booking: your wallet address, an email if you give us one, and the briefs you send us.',
    sections: [
      {
        heading: 'What we store',
        body: [
          'Your wallet address, which is your account identity. Optionally a name, an email for confirmations and a phone number for the day of travel. The content of your requests, the quotes we issue, and the signature of any payment.',
          'Once a booking is confirmed, the booking reference, itinerary and documents the supplier issues, such as tickets and vouchers. These sit in private storage that only you, signed in, and the desk can open.',
          'For flights, each passenger\'s full name, date of birth, nationality and passport number and expiry, because the aircraft operator must file them with border authorities. These are encrypted before they are stored, seen only by the desk and the operator, and deleted automatically after the trip, or straight away if the booking is cancelled.',
          'If you connect Telegram, the id of that chat, so we can send you booking updates. Send /stop to the bot, or disconnect on your account page, and we forget it.',
          'We do not store private keys, seed phrases, or card details. We never ask for them, and no part of this product has a field for them.',
        ],
      },
      {
        heading: 'What is public',
        body: [
          'Solana is a public ledger. A payment to our treasury is visible to anyone, including the amount, the timing, and the wallet it came from. That is a property of the chain, not a choice we made about your data.',
        ],
      },
      {
        heading: 'Who sees your brief',
        body: [
          'The concierge working your request, and the suppliers we must approach to source it. Suppliers are told what they need to quote and deliver. They are not told your budget.',
        ],
        todo: 'Counsel to confirm the lawful basis under GDPR, the retention schedule, the processor list, cross-border transfer mechanism, and the wording of the data subject access route.',
      },
    ],
  },
}

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const page = PAGES[slug]
  return page ? { title: page.title, description: page.intro } : { title: 'Legal' }
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = PAGES[slug]
  if (!page) notFound()

  return (
    <Section>
      <div className="max-w-prose">
        <nav className="flex items-center gap-2 text-xs text-faint" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors duration-300 ease hover:text-accent-soft">
            Solcierge
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-muted">{page.title}</span>
        </nav>

        <h1 className="display mt-6 text-[clamp(2.25rem,6vw,3.5rem)] text-ink">{page.title}</h1>

        <p className="mt-4 border border-accent/25 bg-surface px-4 py-3 text-xs leading-relaxed text-accent-soft">
          Draft, pending review by counsel. Structure and the desk's actual practice are
          accurate. Anything marked below as an open decision is not yet settled and should not
          be relied on.
        </p>

        <p className="lede mt-8">{page.intro}</p>

        <div className="mt-14 space-y-12">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="display text-2xl text-ink">{section.heading}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
              {section.todo ? (
                <p className="mt-5 border-l-2 border-accent/50 pl-4 text-xs leading-relaxed text-faint">
                  <span className="tracking-label text-accent">OPEN DECISION</span>
                  <br />
                  {section.todo}
                </p>
              ) : null}
            </section>
          ))}
        </div>

        <p className="mt-16 border-t border-line pt-8 text-xs leading-relaxed text-faint">
          Questions about any of this go to the desk, not to a form. A concierge will answer, and
          where the answer is "undecided" they will say so.
        </p>
      </div>
    </Section>
  )
}
