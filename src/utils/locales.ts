/** English stays unprefixed. Every other locale is /{locale}. */
export function localePrefix(locale: string, defaultLocale = 'en'): string {
  return locale === defaultLocale ? '' : `/${locale}`
}

export const PRODUCTION_LOCALES = ['en', 'es', 'fr', 'de', 'pt'] as const
