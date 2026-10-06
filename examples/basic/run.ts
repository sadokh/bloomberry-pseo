/**
 * End-to-end run of the engine against a fictional CRM catalog.
 *
 *   npm run example
 *
 * The dataset is the page-record catalog. The script dedupes it, runs
 * catalog validation, quarantines a thin page, and prints the page object
 * plus the sitemap URLs.
 */

import { readFileSync } from 'node:fs'
import {
  collectSitemapEntries,
  createRegistry,
  defineConfig,
  generateKeywordExpansions,
  generatePage,
  getClusterSiblings,
  hasErrors,
  normalizePolicy,
  renderUrlSet,
  slugify,
  validateCatalog,
  type IndexationPolicyInput,
  type LinkRules,
  type PageContent,
  type PageDefinition,
  type RelatedPage,
} from '../../src/index.ts'

const dataset = JSON.parse(
  readFileSync(new URL('./dataset.json', import.meta.url), 'utf8'),
) as {
  routePrefix: string
  genericFaqSlugs: string[]
  policy: { noindexSlugs: string[]; redirects: Record<string, string>; noindexAllLocalePages: boolean }
  linkRules: LinkRules
  clusters: Record<string, RelatedPage[]>
  pages: PageDefinition[]
  content: Record<string, PageContent>
}

const siteUrl = 'https://northwind.example'
const siteName = 'Northwind'

const pages = dataset.pages as PageDefinition[]
const contentBySlug = dataset.content as Record<string, PageContent>
const linkRules = dataset.linkRules as LinkRules
const clusters = dataset.clusters as Record<string, RelatedPage[]>

const config = defineConfig({
  siteUrl,
  siteName,
  routePrefix: dataset.routePrefix,
  defaultPlatformLabel: 'the product',
  differentiator:
    'This page should answer that query with a rule, an example, or a comparison a neighboring URL does not already cover.',
  schema: {
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: null,
  },
})

for (const page of pages) {
  if (page.canonicalOverride) {
    page.canonicalOverride = `${config.siteUrl}${config.routePrefix}/best-crm-for-startups`
  }
}

const registry = createRegistry(pages, config, {
  onDuplicate(slug) {
    console.warn(`[SEO] Duplicate slug skipped: "${slug}" — only the first occurrence is used.`)
  },
})

const policy: IndexationPolicyInput = {
  noindexSlugs: [...dataset.policy.noindexSlugs],
  redirects: dataset.policy.redirects,
  noindexAllLocalePages: dataset.policy.noindexAllLocalePages,
}

function report(title: string, issues: ReturnType<typeof validateCatalog>) {
  console.log(`\n${title}`)
  if (issues.length === 0) {
    console.log('  no issues')
    return
  }
  for (const issue of issues) {
    const where = issue.slug ? ` ${issue.slug}` : ''
    console.log(`  ${issue.level.toUpperCase()} [${issue.code}]${where}: ${issue.message}`)
  }
}

console.log(`\n${siteName} programmatic SEO example`)
console.log(`${config.siteUrl}${config.routePrefix}`)
console.log(`records in dataset: ${pages.length}`)
console.log(`records after dedupe: ${registry.pages.length}`)
console.log(`duplicate slugs dropped: ${registry.duplicates.join(', ') || '(none)'}`)
console.log(`slugify("best crm for startups") = ${slugify('best crm for startups')}`)

const before = validateCatalog({
  pages: registry.pages,
  customContentSlugs: Object.keys(contentBySlug),
  policy: normalizePolicy(policy, config),
  config,
  genericFaqSlugs: dataset.genericFaqSlugs,
})
report('Validation before quarantine', before)

const thin = before.find((issue) => issue.code === 'thin-tool-claim')
if (!thin) {
  console.error('\nExpected the implementation guide to fail the thin-page check.')
  process.exit(1)
}

policy.noindexSlugs = [...(policy.noindexSlugs ?? []), 'crm-implementation-guide']
console.log('\nQuarantine: noindex /compare/crm-implementation-guide')
console.log('Reason: the slug claims to be a guide and has no authored content.')

const after = validateCatalog({
  pages: registry.pages,
  customContentSlugs: Object.keys(contentBySlug),
  policy: normalizePolicy(policy, config),
  config,
  genericFaqSlugs: dataset.genericFaqSlugs,
})
report('Validation after quarantine', after)

if (hasErrors(after)) {
  console.error('\nCatalog still has errors after quarantine.')
  process.exit(1)
}

const featured = registry.find('best-crm-for-startups')
if (!featured || featured.headline.startsWith('Discarded')) {
  console.error('\nDedupe kept the wrong best-crm-for-startups row.')
  process.exit(1)
}

const generated = registry.pages.map((definition) =>
  generatePage({
    definition,
    config,
    policy,
    content: contentBySlug[definition.slug] ?? null,
    linkRules,
  }),
)

const featuredPage = generated.find((entry) => entry.page.definition.slug === 'best-crm-for-startups')
if (!featuredPage) {
  console.error('\nFeatured page did not resolve.')
  process.exit(1)
}

console.log('\nFeatured page')
console.log(JSON.stringify({
  slug: featuredPage.page.definition.slug,
  keyword: featuredPage.page.definition.keyword,
  path: featuredPage.page.path,
  url: featuredPage.page.url,
  contentSource: featuredPage.page.contentSource,
  indexation: featuredPage.page.indexation,
  metadata: featuredPage.metadata,
  relatedPages: featuredPage.page.content.relatedPages,
  clusterSiblings: getClusterSiblings(clusters, featuredPage.page.definition.slug),
  faqs: featuredPage.page.content.faqs,
  examples: featuredPage.page.content.examples,
  howItWorks: featuredPage.page.content.howItWorks,
  structuredDataTypes: featuredPage.structuredData.map((block) => block['@type']),
  validation: featuredPage.validation,
}, null, 2))

const expansions = generateKeywordExpansions([featured], {
  prefixes: ['best', 'free'],
  existingSlugs: registry.pages.map((page) => page.slug),
  siteName,
  metaDescriptionMaxLength: config.metaDescriptionMaxLength,
})
console.log('\nKeyword expansions (not published)')
for (const page of expansions) console.log(`  ${page.slug} — ${page.keyword}`)
console.log('  Review search intent and overlap before adding any of these to the registry.')

const publishedPolicy = normalizePolicy(policy, config)
const sitemapEntries = collectSitemapEntries(registry.pages, config, publishedPolicy, {
  lastmod: '2026-10-06',
})
const sitemap = renderUrlSet(sitemapEntries)
const sitemapPages = sitemapEntries.map((entry) => entry.loc)

console.log('\nSitemap URLs')
for (const loc of sitemapPages) console.log(`  ${loc}`)

const omitted = ['crm-implementation-guide', 'best-startup-crm', 'simple-crm']
for (const slug of omitted) {
  if (sitemap.includes(`/compare/${slug}<`)) {
    console.error(`\n${slug} should not be in the sitemap.`)
    process.exit(1)
  }
}
if (!sitemap.includes('/compare/best-crm-for-startups')) {
  console.error('\nThe featured page is missing from the sitemap.')
  process.exit(1)
}

const redirectPage = generated.find((entry) => entry.page.definition.slug === 'best-startup-crm')
if (!redirectPage?.page.indexation.redirectTo || redirectPage.structuredData.length !== 0) {
  console.error('\nRedirect page should point at the canonical and emit no structured data.')
  process.exit(1)
}

console.log(`\nRedirect: /compare/best-startup-crm → ${redirectPage.page.indexation.redirectTo}`)
const alias = generated.find((entry) => entry.page.definition.slug === 'simple-crm')
console.log(`Canonical override: /compare/simple-crm → ${alias?.metadata.canonical} (left out of the sitemap)`)
console.log(`Indexable pages in sitemap: ${sitemapPages.length}`)
console.log('\nExample finished.\n')
