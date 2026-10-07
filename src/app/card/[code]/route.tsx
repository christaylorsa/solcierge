import { findReferrer } from '@/lib/data'
import { publicEnv } from '@/lib/env'
import { renderCard } from '@/lib/card/render'
import { displayCode } from '@/lib/referrals'

export const dynamic = 'force-dynamic'

/**
 * A member's share card as a PNG. It is the link preview for /r/<code> and the file
 * behind "Download card". Shows only what the member already made public: their X
 * handle and avatar, if connected, and the code. Never their name, spend or tier.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const referrer = await findReferrer(code).catch(() => null)
  if (!referrer) return new Response('Not found', { status: 404 })

  const download = new URL(request.url).searchParams.has('download')
  return renderCard(
    { code: referrer.code, siteHost: new URL(publicEnv.siteUrl).host, x: referrer.x },
    {
      headers: {
        // Short, so a new avatar or code shows up the same day.
        'cache-control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
        ...(download
          ? { 'content-disposition': `attachment; filename="solcierge-${displayCode(referrer.code)}.png"` }
          : {}),
      },
    },
  )
}
