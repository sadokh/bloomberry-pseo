import type { LinkRules, RelatedPage } from '../types.ts'

/**
 * Production's fallback linker classifies from the slug, not from page.platform.
 * The "blog" group exists in the source map and is never selected here.
 * Slugs that match none of the fragments fall through to "linkedin".
 */
export function inferToolLinkGroup(slug: string): 'x' | 'linkedin' {
  if (slug.includes('linkedin')) return 'linkedin'
  if (
    slug.includes('tweet') ||
    slug.includes('twitter') ||
    slug.includes('thread') ||
    slug.includes('x-')
  ) {
    return 'x'
  }
  return 'linkedin'
}

function hrefEndsWithSlug(href: string, slug: string): boolean {
  return href.endsWith(slug)
}

/**
 * Pick related links for a slug.
 * Prefix sets (production: write-like-) are returned whole, minus self.
 * Other groups are filtered and then sliced. Production slices to 4.
 */
export function buildRelatedPages(slug: string, rules: LinkRules): RelatedPage[] {
  for (const set of rules.prefixSets ?? []) {
    if (slug.startsWith(set.prefix)) {
      return set.links.filter((link) => !hrefEndsWithSlug(link.href, slug))
    }
  }

  const classify = rules.classify ?? inferToolLinkGroup
  const group = classify(slug)
  const links = rules.groups[group] ?? rules.groups.linkedin ?? rules.groups.default ?? []
  const max = rules.max ?? 4
  return links.filter((link) => !hrefEndsWithSlug(link.href, slug)).slice(0, max)
}
