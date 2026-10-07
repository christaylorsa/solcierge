import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { displayCode } from '@/lib/referrals'

/**
 * The referral share card: 1200x630, the size X and every other unfurler expects.
 * Rendered by Satori, so layout is flexbox only and every element with more than one
 * child says display:flex. Colours are the site tokens written out, since there is
 * no stylesheet here.
 */

export const CARD_SIZE = { width: 1200, height: 630 }

const C = {
  bg: '#08070a',
  ink: '#f4f1ea',
  muted: '#a19a8d',
  faint: '#6b6559',
  accent: '#c9a94e',
  accentSoft: '#e3cd8c',
  line: 'rgba(201,169,78,0.22)',
}

const ASSETS = join(process.cwd(), 'assets', 'card')

type Fonts = NonNullable<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']>

let assets: Promise<{ fonts: Fonts; grain: string }> | null = null

function loadAssets() {
  assets ??= (async () => {
    const [light, lightItalic, regular, inter, interMedium, grain] = await Promise.all(
      [
        'cormorant-garamond-latin-300-normal.woff',
        'cormorant-garamond-latin-300-italic.woff',
        'cormorant-garamond-latin-400-normal.woff',
        'inter-latin-400-normal.woff',
        'inter-latin-500-normal.woff',
        'grain.png',
      ].map((file) => readFile(join(ASSETS, file))),
    )
    return {
      fonts: [
        { name: 'Cormorant', data: light, weight: 300 as const, style: 'normal' as const },
        { name: 'Cormorant', data: lightItalic, weight: 300 as const, style: 'italic' as const },
        { name: 'Cormorant', data: regular, weight: 400 as const, style: 'normal' as const },
        { name: 'Inter', data: inter, weight: 400 as const, style: 'normal' as const },
        { name: 'Inter', data: interMedium, weight: 500 as const, style: 'normal' as const },
      ],
      grain: `data:image/png;base64,${grain.toString('base64')}`,
    }
  })()
  // A failed read should be retried on the next request, not cached forever.
  assets.catch(() => {
    assets = null
  })
  return assets
}

/**
 * The avatar as a data URI, or null. Fetched here rather than left to Satori, so a
 * slow or missing image falls back to the monogram instead of failing the card.
 * Only X's image host is ever stored (see safeAvatarUrl), so this cannot be pointed
 * anywhere else.
 */
async function avatarData(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500), next: { revalidate: 3600 } })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !/^image\/(jpeg|png|webp|gif)$/.test(type)) return null
    const bytes = Buffer.from(await res.arrayBuffer())
    if (bytes.length > 1_500_000) return null
    return `data:${type};base64,${bytes.toString('base64')}`
  } catch {
    return null
  }
}

export type CardInput = {
  code: string
  siteHost: string
  x: { username: string; name: string | null; avatar_url: string | null } | null
}

const label = {
  fontFamily: 'Inter',
  fontSize: 15,
  letterSpacing: '0.28em',
  textTransform: 'uppercase' as const,
  color: C.faint,
}

export async function renderCard(input: CardInput, init?: ResponseInit): Promise<ImageResponse> {
  const [{ fonts, grain }, avatar] = await Promise.all([loadAssets(), avatarData(input.x?.avatar_url ?? null)])
  const code = displayCode(input.code)
  const handle = input.x ? `@${input.x.username}` : null
  const initial = (input.x?.name ?? input.x?.username ?? 'S').trim().charAt(0).toUpperCase() || 'S'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          backgroundColor: C.bg,
          color: C.ink,
          fontFamily: 'Inter',
        }}
      >
        {/* Warm light from the top right, kept faint so it reads as depth, not a spotlight. */}
        <div
          style={{
            position: 'absolute',
            top: -360,
            right: -260,
            width: 1100,
            height: 1100,
            display: 'flex',
            backgroundImage: 'radial-gradient(circle at center, rgba(201,169,78,0.17) 0%, rgba(201,169,78,0.06) 38%, rgba(8,7,10,0) 68%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -420,
            left: -300,
            width: 900,
            height: 900,
            display: 'flex',
            backgroundImage: 'radial-gradient(circle at center, rgba(201,169,78,0.07) 0%, rgba(8,7,10,0) 65%)',
          }}
        />
        {/* Grain over the glow: stops the gradient banding into rings after recompression. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage: `url(${grain})`,
            backgroundRepeat: 'repeat',
            backgroundSize: '160px 160px',
          }}
        />

        {/* Inset frame */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 28,
            right: 28,
            bottom: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            border: `1px solid ${C.line}`,
            padding: '44px 56px 46px',
          }}
        >
          {/* Masthead */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ fontFamily: 'Cormorant', fontWeight: 400, fontSize: 44, letterSpacing: '-0.01em' }}>
                Solcierge
              </span>
              <span style={{ ...label, fontSize: 12 }}>Est. 2026</span>
            </div>
            <span style={{ ...label, color: C.accent }}>By introduction</span>
          </div>

          {/* Who it is from */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
            <div
              style={{
                width: 148,
                height: 148,
                borderRadius: 999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${C.accent}`,
                padding: 6,
              }}
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element -- Satori, not the DOM
                <img src={avatar} width={134} height={134} style={{ borderRadius: 999, objectFit: 'cover' }} alt="" />
              ) : (
                <div
                  style={{
                    width: 134,
                    height: 134,
                    borderRadius: 999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#14121a',
                    color: C.accentSoft,
                    fontFamily: 'Cormorant',
                    fontWeight: 300,
                    fontSize: 72,
                  }}
                >
                  {initial}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={label}>An introduction from</span>
              <span
                style={{
                  marginTop: 14,
                  fontFamily: 'Cormorant',
                  fontWeight: 300,
                  fontSize: handle && handle.length > 12 ? 64 : 78,
                  lineHeight: 1,
                  letterSpacing: '-0.015em',
                }}
              >
                {handle ?? 'A Solcierge member'}
              </span>
              <span
                style={{
                  marginTop: 16,
                  fontFamily: 'Cormorant',
                  fontStyle: 'italic',
                  fontWeight: 300,
                  fontSize: 34,
                  color: C.muted,
                }}
              >
                Book anything. Pay in crypto.
              </span>
            </div>
          </div>

          {/* Footer: what it is, and the code */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 17, color: C.muted, letterSpacing: '0.04em' }}>
                Jets · Yachts · Villas · Cars · Tables · Access
              </span>
              <span style={{ fontSize: 17, color: C.faint, letterSpacing: '0.04em' }}>
                Quoted in USD. Settled in SOL or USDC.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ ...label, fontSize: 12 }}>Introduction code</span>
              <span
                style={{
                  marginTop: 8,
                  fontFamily: 'Inter',
                  fontWeight: 500,
                  fontSize: code.length > 12 ? 34 : 44,
                  letterSpacing: '0.14em',
                  color: C.accentSoft,
                }}
              >
                {code}
              </span>
              <span style={{ marginTop: 8, fontSize: 16, color: C.faint, letterSpacing: '0.02em' }}>
                {`${input.siteHost}/r/${code}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...CARD_SIZE, fonts, ...init },
  )
}
