import type { InternalLinkMap } from '../types.ts'

export function getInternalLinks(
  map: Record<string, InternalLinkMap>,
  slug: string,
): InternalLinkMap | undefined {
  return map[slug]
}

/**
 * Production's editorial rule for a blog article: at least one tool URL,
 * one other article, and one homepage section. This reports which are missing.
 * It does not invent links.
 */
export function missingInternalLinkSlots(map: InternalLinkMap): Array<'tools' | 'blogs' | 'homepageSection'> {
  const missing: Array<'tools' | 'blogs' | 'homepageSection'> = []
  if (map.tools.length < 1) missing.push('tools')
  if (map.blogs.length < 1) missing.push('blogs')
  if (!map.homepageSection) missing.push('homepageSection')
  return missing
}
