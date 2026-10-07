// Sent on every response (SA-15). No script-src yet: a strict one needs per-request
// nonces and testing against the wallet adapters (SA-22). These directives cannot
// break scripts: they stop framing, plugin content, <base> hijacks and form posts
// to other origins.
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A production build normally writes over .next, which is also where a running
  // `next dev` keeps its chunks: build while the dev server is up and it starts
  // throwing "Cannot find module './xxx.js'" for chunks that no longer exist.
  // `npm run build:check` sets this so verification builds land somewhere else.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The Solana wallet adapters ship ESM that references optional peer deps.
  // Keeping them external to the server bundle avoids resolution noise at build time.
  serverExternalPackages: ['@solana/web3.js'],
  poweredByHeader: false,
  // The share card reads its fonts and grain from disk at request time, which the
  // bundler cannot see, so they are traced into the function explicitly.
  outputFileTracingIncludes: {
    '/card/[code]': ['./assets/card/**'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
