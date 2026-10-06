import type { RelatedPage } from '../types.ts'

/**
 * Landing-page cluster lookup. Accepts a slug or a pathname.
 * Unknown slugs return an empty list rather than a guessed neighborhood.
 */
export function getClusterSiblings(
  clusters: Record<string, RelatedPage[]>,
  slugOrPath: string,
  limit = 5,
): RelatedPage[] {
  const slug = slugOrPath.startsWith('/') ? slugOrPath.slice(1) : slugOrPath
  const siblings = clusters[slug]
  if (!siblings) return []
  return siblings.slice(0, limit)
}
