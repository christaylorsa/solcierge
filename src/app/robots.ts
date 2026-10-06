import type { MetadataRoute } from 'next'
import { publicEnv } from '@/lib/env'

/** Public pages are crawlable; the desk, member pages and the API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/account', '/api/', '/auth/'] },
    sitemap: `${publicEnv.siteUrl}/sitemap.xml`,
  }
}
