# Deployment

This package builds page objects. Your site renders them. Bloomberry renders them with the Next.js App Router.

## How Bloomberry ships a page

1. Add a `ToolPage` to `lib/seo/toolPages.ts`. If the page claims to be a tool or a guide, add a `TOOL_CONTENT` entry or add the slug to the noindex or redirect set.
2. The module dedupes slugs on import and warns if the catalog exceeds 500.
3. `generateStaticParams()` pre-renders `/tools/{slug}` at build time (`dynamic = 'force-static'`).
4. `generateMetadata()` and the page component apply the indexation policy. Redirects are 308s.
5. `app/sitemap-tools.xml/route.ts` emits only the URLs `shouldIncludeToolInSitemap` allows.
6. `npm run seo:gate` in the Bloomberry app runs the checks listed in `docs/ARCHITECTURE.md`. `validateCatalog()` covers the checks that read page records. The checks that read Next.js source files stay in the app.
7. Sitemap handlers set `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` (`SITEMAP_CACHE_CONTROL`). Do not set `Content-Encoding` yourself. The host compresses the XML.

Operating rules from the production comments, not from a limiter in code:

- Review expansions before they join the registry.
- Add a small batch of new URLs per deployment. The comment on the registry says 25.
- Leave `noindexAllLocalePages` on until the locale body is actually translated, including examples.

## Wiring this package

```ts
import {
  collectSitemapEntries,
  defineConfig,
  generatePage,
  normalizePolicy,
  renderUrlSet,
  SITEMAP_CACHE_CONTROL,
  validateCatalog,
} from 'bloomberry-pseo'

const config = defineConfig({
  siteUrl: 'https://example.com',
  siteName: 'Example',
  routePrefix: '/compare',
})

const policy = normalizePolicy({ noindexSlugs, redirects }, config)

const issues = validateCatalog({
  pages,
  customContentSlugs: Object.keys(contentBySlug),
  policy,
  config,
})

// Fail the deploy when issues contain level === 'error'.

export function buildToolSitemap() {
  const xml = renderUrlSet(collectSitemapEntries(pages, config, policy, {
    lastmod: new Date().toISOString().slice(0, 10),
  }))
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': SITEMAP_CACHE_CONTROL,
    },
  })
}

export function render(slug: string) {
  const definition = pages.find((page) => page.slug === slug)
  if (!definition) return null
  return generatePage({
    definition,
    config,
    policy,
    content: contentBySlug[slug] ?? null,
  })
}
```

If `page.indexation.redirectTo` is set, redirect and do not render `structuredData`. If `indexation.index` is false, keep the page available and emit `robots: { index: false, follow: true }`.

Run `validateCatalog` before the build, not after the sitemap is already submitted.
