import type { PseoConfig } from '../config.ts'
import { canonical, pagePath } from './canonical.ts'
import { shouldIncludeInSitemap, shouldIncludeLocaleInSitemap } from './indexation.ts'
import type { NormalizedPolicy, PageDefinition, SitemapEntry } from '../types.ts'

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderUrl(entry: SitemapEntry): string {
  const lines = [`    <loc>${xmlEscape(entry.loc)}</loc>`]
  if (entry.lastmod) lines.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`)
  if (entry.changefreq) lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
  if (entry.priority !== undefined) lines.push(`    <priority>${entry.priority}</priority>`)
  return `  <url>\n${lines.join('\n')}\n  </url>`
}

/** urlset document. Production tool entries use weekly / 0.7. */
export function renderUrlSet(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(renderUrl).join('\n')}
</urlset>`
}

export function renderSitemapIndex(
  sitemaps: Array<{ loc: string; lastmod?: string }>,
): string {
  const body = sitemaps
    .map((sitemap) => {
      const lastmod = sitemap.lastmod ? `\n    <lastmod>${xmlEscape(sitemap.lastmod)}</lastmod>` : ''
      return `  <sitemap>\n    <loc>${xmlEscape(sitemap.loc)}</loc>${lastmod}\n  </sitemap>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</sitemapindex>`
}

export function collectSitemapEntries(
  pages: Array<Pick<PageDefinition, 'slug' | 'canonicalOverride'>>,
  config: PseoConfig,
  policy: NormalizedPolicy,
  options?: {
    locale?: string
    lastmod?: string
    changefreq?: SitemapEntry['changefreq']
    priority?: number
  },
): SitemapEntry[] {
  const locale = options?.locale ?? config.defaultLocale
  const include =
    locale === config.defaultLocale
      ? (page: Pick<PageDefinition, 'slug' | 'canonicalOverride'>) =>
          shouldIncludeInSitemap(page.slug, policy, page.canonicalOverride)
      : (page: Pick<PageDefinition, 'slug' | 'canonicalOverride'>) =>
          shouldIncludeLocaleInSitemap(page.slug, policy)

  return pages.filter(include).map((page) => ({
    loc: canonical(config, pagePath(config, page.slug, locale)),
    lastmod: options?.lastmod,
    changefreq: options?.changefreq ?? 'weekly',
    priority: options?.priority ?? (locale === config.defaultLocale ? 0.7 : 0.6),
  }))
}
