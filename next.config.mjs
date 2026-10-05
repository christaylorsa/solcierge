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
}

export default nextConfig
