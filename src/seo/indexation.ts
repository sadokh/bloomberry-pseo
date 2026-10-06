import type { PseoConfig } from '../config.ts'
import type {
  IndexationDecision,
  IndexationPolicyInput,
  NormalizedPolicy,
  PageDefinition,
} from '../types.ts'

export function normalizePolicy(
  input: IndexationPolicyInput | undefined,
  config: Pick<PseoConfig, 'noindexAllLocalePages'>,
): NormalizedPolicy {
  return {
    noindexSlugs: new Set(input?.noindexSlugs ?? []),
    redirects: { ...(input?.redirects ?? {}) },
    noindexRoutes: new Set(input?.noindexRoutes ?? []),
    redirectRoutes: { ...(input?.redirectRoutes ?? {}) },
    noindexAllLocalePages: input?.noindexAllLocalePages ?? config.noindexAllLocalePages,
  }
}

export function shouldNoindexSlug(policy: NormalizedPolicy, slug: string): boolean {
  return policy.noindexSlugs.has(slug)
}

export function getRedirectTarget(policy: NormalizedPolicy, slug: string): string | null {
  return policy.redirects[slug] ?? null
}

export function shouldNoindexRoute(policy: NormalizedPolicy, pathname: string): boolean {
  return policy.noindexRoutes.has(pathname)
}

/**
 * Tool sitemap membership. A canonical override is excluded even though the
 * page can still render with an indexable robots policy. The override URL is
 * the one that should be submitted.
 */
export function shouldIncludeInSitemap(
  slug: string,
  policy: NormalizedPolicy,
  canonicalOverride?: string,
): boolean {
  if (canonicalOverride) return false
  if (policy.noindexSlugs.has(slug)) return false
  if (slug in policy.redirects) return false
  return true
}

/**
 * Locale sitemap membership. When noindexAllLocalePages is set, every locale
 * URL is excluded. Otherwise the same noindex and redirect rules apply.
 */
export function shouldIncludeLocaleInSitemap(slug: string, policy: NormalizedPolicy): boolean {
  if (policy.noindexAllLocalePages) return false
  if (policy.noindexSlugs.has(slug)) return false
  if (slug in policy.redirects) return false
  return true
}

export function decideIndexation(
  page: Pick<PageDefinition, 'slug' | 'canonicalOverride'>,
  policy: NormalizedPolicy,
  locale: string,
  defaultLocale: string,
): IndexationDecision {
  const redirectTo = getRedirectTarget(policy, page.slug)
  const localeSuppressed = locale !== defaultLocale && policy.noindexAllLocalePages
  const noindex = shouldNoindexSlug(policy, page.slug)
  const index = !noindex && !redirectTo && !localeSuppressed

  const includeInSitemap =
    locale === defaultLocale
      ? shouldIncludeInSitemap(page.slug, policy, page.canonicalOverride)
      : shouldIncludeLocaleInSitemap(page.slug, policy)

  return {
    index,
    follow: true,
    redirectTo,
    includeInSitemap,
  }
}
