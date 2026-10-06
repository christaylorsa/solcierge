import type { MetadataRoute } from 'next'
import { CATEGORIES } from '@/lib/categories'
import { publicEnv } from '@/lib/env'

const LEGAL_SLUGS = ['concierge-terms', 'crypto-risk', 'refunds', 'privacy']

export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${publicEnv.siteUrl}${path}`
  return [
    { url: url('/'), changeFrequency: 'weekly', priority: 1 },
    { url: url('/request'), changeFrequency: 'monthly', priority: 0.8 },
    ...CATEGORIES.map((category) => ({
      url: url(`/request/${category.slug}`),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...LEGAL_SLUGS.map((slug) => ({
      url: url(`/legal/${slug}`),
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ]
}
