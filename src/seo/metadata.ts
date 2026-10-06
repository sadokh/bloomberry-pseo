import type { PseoConfig } from '../config.ts'
import { canonical } from './canonical.ts'
import type { PageMetadata, ResolvedPage } from '../types.ts'

/**
 * Mirrors generateMetadata on /tools/[slug] and the locale tool route.
 * Indexable pages get description, Open Graph, and Twitter.
 * Noindex and redirect pages set robots and a canonical, and omit description.
 * Redirect canonicals point at the target, not at the source URL.
 */
export function buildMetadata(
  page: ResolvedPage,
  config: PseoConfig,
  languages?: Record<string, string>,
): PageMetadata {
  const { definition, indexation } = page
  const selfCanonical = definition.canonicalOverride ?? canonical(config, page.path)

  if (!indexation.index) {
    const redirectCanonical = indexation.redirectTo
      ? canonical(config, indexation.redirectTo)
      : selfCanonical
    return {
      title: definition.title,
      robots: { index: false, follow: true },
      canonical: redirectCanonical,
    }
  }

  return {
    title: definition.title,
    description: definition.metaDescription,
    canonical: selfCanonical,
    openGraph: {
      title: definition.headline,
      description: definition.metaDescription,
      url: canonical(config, page.path),
      siteName: config.siteName,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: definition.headline,
      description: definition.metaDescription,
    },
    ...(languages && Object.keys(languages).length > 0 ? { languages } : {}),
  }
}
