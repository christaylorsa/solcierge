import Link from 'next/link'
import { CATEGORIES } from '@/lib/categories'
import { publicEnv, explorerAddressUrl } from '@/lib/env'
import { shortAddress } from '@/lib/format'

const LEGAL = [
  { href: '/legal/concierge-terms', label: 'Concierge terms' },
  { href: '/legal/crypto-risk', label: 'Crypto volatility notice' },
  { href: '/legal/refunds', label: 'Cancellation and refunds' },
  { href: '/legal/privacy', label: 'Privacy' },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-shell px-[var(--shell-x)] py-16 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-16">
          <div>
            <p className="display text-2xl text-ink">Solcierge</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              A request-and-fulfil concierge. You brief us, we source and quote, you settle in
              SOL or USDC. No inventory, no listings, no middlemen you don't know about. We name the supplier in every quote.
            </p>

            <dl className="mt-8 space-y-2 text-xs">
              <div className="flex gap-2">
                <dt className="text-faint">Network</dt>
                <dd className="text-muted">{publicEnv.cluster}</dd>
              </div>
              <div className="flex flex-wrap gap-2">
                <dt className="text-faint">Treasury</dt>
                <dd>
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
                </dd>
              </div>
            </dl>
          </div>

          <nav aria-label="Categories">
            <p className="eyebrow">Book</p>
            <ul className="mt-5 space-y-3">
              {CATEGORIES.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/request/${category.slug}`}
                    className="text-sm text-muted transition-colors duration-300 ease hover:text-accent-soft"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p className="eyebrow">Small print</p>
            <ul className="mt-5 space-y-3">
              {LEGAL.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted transition-colors duration-300 ease hover:text-accent-soft"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-line pt-8">
          <p className="max-w-3xl text-xs leading-relaxed text-faint">
            Solcierge arranges bookings as your agent. Suppliers deliver the service, and their
            own terms apply alongside ours. Crypto payments are final once confirmed on chain:
            the value of SOL can move sharply, and a quote is only held for the duration shown
            on the countdown. Nothing here is investment advice.
          </p>
          <p className="mt-6 text-xs text-faint">
            © {new Date().getFullYear()} Solcierge. Placeholder legal pages, pending counsel review.
          </p>
        </div>
      </div>
    </footer>
  )
}
