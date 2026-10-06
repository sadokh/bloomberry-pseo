import type { PseoConfig } from '../config.ts'
import { localePrefix } from '../utils/locales.ts'

/** Absolute URL for a root-relative path. Absolute URLs are returned unchanged. */
export function canonical(config: Pick<PseoConfig, 'siteUrl'>, path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${config.siteUrl}${normalized}`
}

/** English (or whichever locale is default) is unprefixed. Other locales are /{locale}{path}. */
export function localizedCanonical(
  config: Pick<PseoConfig, 'siteUrl' | 'defaultLocale'>,
  locale: string,
  path: string,
): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  if (locale === config.defaultLocale) return `${config.siteUrl}${normalized}`
  return `${config.siteUrl}/${locale}${normalized}`
}

export function pagePath(
  config: Pick<PseoConfig, 'routePrefix' | 'defaultLocale'>,
  slug: string,
  locale?: string,
): string {
  const prefix = config.routePrefix === '/' ? '' : config.routePrefix
  const path = `${prefix}/${slug}`
  if (!locale || locale === config.defaultLocale) return path
  return `${localePrefix(locale, config.defaultLocale)}${path}`
}
