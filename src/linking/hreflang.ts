import type { PseoConfig } from '../config.ts'
import { canonical, pagePath } from '../seo/canonical.ts'
import type { SlugMap } from '../types.ts'

export interface HreflangInput {
  locale: string
  slug: string
  config: PseoConfig
  mapping: SlugMap[]
  /** Locales to emit besides the default. Defaults to every key present on the matched row. */
  locales?: readonly string[]
}

/**
 * Explicit locale slug map → hreflang alternates.
 * Returns an empty object when this slug has no row. Callers that need the
 * looser badge/platform match can use buildFallbackHreflang.
 */
export function buildHreflangMap(input: HreflangInput): Record<string, string> {
  const { locale, slug, config, mapping } = input
  const defaultLocale = config.defaultLocale

  const enSlug =
    locale === defaultLocale
      ? slug
      : mapping.find((row) => row[locale] === slug)?.[defaultLocale]

  if (!enSlug) return {}

  const entry = mapping.find((row) => row[defaultLocale] === enSlug)
  if (!entry) return {}

  const languages: Record<string, string> = {
    'x-default': canonical(config, pagePath(config, enSlug, defaultLocale)),
    [defaultLocale]: canonical(config, pagePath(config, enSlug, defaultLocale)),
  }

  const locales =
    input.locales ??
    Object.keys(entry).filter((key) => key !== defaultLocale && entry[key])

  for (const loc of locales) {
    const translated = entry[loc]
    if (translated) {
      languages[loc] = canonical(config, pagePath(config, translated, loc))
    }
  }

  return languages
}

export interface LocaleSiblingPage {
  slug: string
  badge?: string
  platform?: string
}

/**
 * Fallback used by the locale tool route when SLUG_MAPPING has no row.
 * It links the same slug on the default locale, then any locale page that
 * shares a badge or a platform. Prefer an explicit slug map.
 */
export function buildFallbackHreflang(input: {
  locale: string
  slug: string
  config: PseoConfig
  locales: readonly string[]
  pagesByLocale: Record<string, LocaleSiblingPage[]>
  badge?: string
  platform?: string
}): Record<string, string> {
  const { config } = input
  const languages: Record<string, string> = {
    'x-default': canonical(config, pagePath(config, input.slug, config.defaultLocale)),
    [config.defaultLocale]: canonical(config, pagePath(config, input.slug, config.defaultLocale)),
  }

  for (const loc of input.locales) {
    if (loc === config.defaultLocale) continue
    const match = (input.pagesByLocale[loc] ?? []).find(
      (page) =>
        (input.badge !== undefined && page.badge === input.badge) ||
        (input.platform !== undefined && page.platform === input.platform),
    )
    if (match) {
      languages[loc] = canonical(config, pagePath(config, match.slug, loc))
    }
  }

  return languages
}
