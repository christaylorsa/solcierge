import { Reveal } from '@/components/motion/Reveal'
import { Eyebrow, MaskedHeading } from '@/components/motion/MaskedHeading'
import { RateLockRing } from '@/components/motion/RateLockRing'
import { Aurora } from '@/components/motion/Aurora'
import { Section } from '@/components/site/Section'
import { publicEnv, explorerAddressUrl } from '@/lib/env'
import { shortAddress } from '@/lib/format'

const POINTS = [
  {
    title: 'Quoted in USD, settled in crypto',
    body: 'Suppliers invoice in fiat, so that is what we quote. USDC settles one for one. SOL converts at a live rate we pull at the moment you open the pay panel.',
  },
  {
    title: 'Verified from the ledger, not the browser',
    body: 'When your wallet returns a signature, our server reads that transaction from a Solana RPC and checks the recipient, the mint and the amount credited. A client claiming success proves nothing.',
  },
  {
    title: 'Your receipt is a block explorer link',
    body: 'Every settled booking stores its signature. One click takes you to the transaction, so the record of what you paid is not something we can quietly edit.',
  },
]

/**
 * The rate lock, made the centrepiece.
 *
 * This section used to explain the ten-minute lock in a paragraph. The lock is the
 * brand's proof of trust, so it is now demonstrated instead: a live ring running a real
 * ten-minute cycle, with the remaining time rolling underneath. Reading "the rate holds
 * for ten minutes" and watching ten minutes visibly held are not the same claim.
 */
export function CryptoRails() {
  return (
    <Section id="pay" tone="surface" className="relative overflow-hidden">
      <Aurora />

      <div className="relative">
        <div className="max-w-2xl">
          <Eyebrow>Payment rails</Eyebrow>
          <MaskedHeading
            lines={['Crypto, handled', 'properly']}
            className="display mt-5 text-[clamp(2.25rem,5vw,3.5rem)] text-ink"
          />
          <p className="lede mt-6">
            Taking crypto is easy. Taking it without exposing either side to a bad rate or an
            unverified transfer is the part that needs care.
          </p>
        </div>

        <div className="mt-20 grid gap-16 lg:grid-cols-[minmax(0,1fr)_1.1fr] lg:items-center lg:gap-24">
          <Reveal className="flex flex-col items-center">
            <RateLockRing className="w-full max-w-[320px]" />

            <p className="mt-10 max-w-sm text-center text-sm leading-relaxed text-muted">
              Open the pay panel and we pull a live SOL rate, write the exact amount down, and
              start this countdown. Inside the window the figure cannot move. Let it lapse and
              you get a fresh rate, never a surprise one.
            </p>

            <dl className="mt-10 w-full max-w-sm space-y-3 border border-line bg-bg p-6">
              <Row label="Network">{publicEnv.cluster}</Row>
              <Row label="Accepted">SOL, USDC</Row>
              <Row label="USDC mint">
                <a
                  href={explorerAddressUrl(publicEnv.usdcMint)}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="link-underline font-mono"
                >
                  {shortAddress(publicEnv.usdcMint, 6)}
                </a>
              </Row>
              <Row label="Treasury">
                {publicEnv.treasuryWallet ? (
                  <a
                    href={explorerAddressUrl(publicEnv.treasuryWallet)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline font-mono"
                  >
                    {shortAddress(publicEnv.treasuryWallet, 6)}
                  </a>
                ) : (
                  <span className="text-danger">not configured</span>
                )}
              </Row>
            </dl>
          </Reveal>

          <Reveal>
            <ul className="space-y-10">
              {POINTS.map((point) => (
                <li key={point.title} className="border-l border-line pl-6">
                  <h3 className="display text-2xl text-ink">{point.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{point.body}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </Section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3 last:border-0 last:pb-0">
      <dt className="text-[0.6875rem] tracking-label uppercase text-faint">{label}</dt>
      <dd className="text-sm text-ink">{children}</dd>
    </div>
  )
}
