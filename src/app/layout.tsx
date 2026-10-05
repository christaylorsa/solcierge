import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { WalletProviders } from '@/components/auth/WalletProviders'
import { SmoothScroll } from '@/components/motion/SmoothScroll'
import { MotionFeatures } from '@/components/motion/MotionFeatures'
import { SiteHeader } from '@/components/site/SiteHeader'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SetupNotice } from '@/components/site/SetupNotice'
import { publicEnv } from '@/lib/env'
import './globals.css'

/**
 * Two families, no more: a display serif for headings and one text face for
 * everything else. Both self-hosted by next/font with swap, so no third-party
 * request and no invisible text on first paint.
 */
const display = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

const text = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: 'Solcierge · Book anything. Pay in crypto.',
    template: '%s · Solcierge',
  },
  description:
    'A crypto-native luxury concierge. Brief us on jets, yachts, villas, cars, tables or access, take a quote, and settle in SOL or USDC.',
  // Cache-busted, so a favicon change is not stuck behind a browser cache.
  icons: { icon: [{ url: '/icon.svg?v=1', type: 'image/svg+xml' }] },
  openGraph: {
    title: 'Solcierge · Book anything. Pay in crypto.',
    description:
      'Request-and-fulfil luxury concierge. Quoted in USD, settled in SOL or USDC, verified on chain.',
    url: publicEnv.siteUrl,
    siteName: 'Solcierge',
    type: 'website',
    images: [{ url: '/media/hero-1.jpg', width: 1920, height: 1200, alt: 'Solcierge' }],
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#08070a',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-bg"
        >
          Skip to content
        </a>

        <MotionFeatures>
          <WalletProviders>
            <SmoothScroll />
            <SetupNotice />
            <SiteHeader />
            <main id="main" className="pt-[72px]">
              {children}
            </main>
            <SiteFooter />
          </WalletProviders>
        </MotionFeatures>
      </body>
    </html>
  )
}
