/**
 * Writes public/icon.svg.
 *
 * The favicon is generated rather than hand-drawn so it always tracks the brand
 * tokens: change the two colours here and in globals.css together. Run after a
 * palette change, then bump the ?v= query in the icons entry in src/app/layout.tsx
 * so browsers do not serve the old one from cache.
 *
 *   node scripts/make-favicon.mjs
 */

import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const BG = '#08070a'
const GOLD = '#c9a94e'
const GOLD_SOFT = '#e3cd8c'

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="10" fill="${BG}"/>
  <rect x="2.5" y="2.5" width="59" height="59" rx="8.5" fill="none" stroke="${GOLD}" stroke-opacity="0.5"/>
  <text x="32" y="45" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="38" fill="${GOLD_SOFT}">S</text>
</svg>
`

await writeFile(join(root, 'public', 'icon.svg'), favicon, 'utf8')
console.log('Wrote public/icon.svg')
