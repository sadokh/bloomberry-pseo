import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildMetadata,
  buildStructuredData,
  canonical,
  collectSitemapEntries,
  defineConfig,
  generatePage,
  normalizePolicy,
  renderUrlSet,
  type PageDefinition,
} from '../src/index.ts'

function page(overrides: Partial<PageDefinition> = {}): PageDefinition {
  return {
    slug: 'acme-overview',
    badge: 'Overview',
    title: 'Acme Overview Title',
    metaDescription: 'Meta description for Acme.',
    headline: 'Acme headline',
    subheadline: 'Sub',
    composerPlaceholder: 'note',
    keyword: 'acme overview',
    ...overrides,
  }
}

const config = defineConfig({
  siteUrl: 'https://example.com/',
  siteName: 'Example',
  routePrefix: 'tools',
  schema: { offers: { price: '0', priceCurrency: 'USD' } },
})

test('canonical joins a root-relative path and strips a trailing site slash', () => {
  assert.equal(config.siteUrl, 'https://example.com')
  assert.equal(config.routePrefix, '/tools')
  assert.equal(canonical(config, 'tools/acme-overview'), 'https://example.com/tools/acme-overview')
  assert.equal(canonical(config, 'https://other.example/a'), 'https://other.example/a')
})

test('indexable metadata includes description and uses a canonical override', () => {
  const generated = generatePage({
    definition: page({ canonicalOverride: 'https://example.com/acme' }),
    config,
    content: {
      examples: [],
      howItWorks: [],
      faqs: [{ question: 'Q', answer: 'A' }],
      relatedPages: [],
    },
  })
  assert.equal(generated.metadata.description, 'Meta description for Acme.')
  assert.equal(generated.metadata.canonical, 'https://example.com/acme')
  assert.equal(generated.metadata.robots, undefined)
  assert.equal(generated.metadata.openGraph?.siteName, 'Example')
  assert.equal(generated.page.indexation.index, true)
  assert.equal(generated.page.indexation.includeInSitemap, false)
})

test('noindex and redirect metadata omit the description', () => {
  const noindex = generatePage({
    definition: page(),
    config,
    policy: { noindexSlugs: ['acme-overview'] },
  })
  assert.deepEqual(noindex.metadata.robots, { index: false, follow: true })
  assert.equal(noindex.metadata.description, undefined)
  assert.equal(noindex.metadata.canonical, 'https://example.com/tools/acme-overview')

  const redirect = generatePage({
    definition: page({ slug: 'acme-alias' }),
    config,
    policy: { redirects: { 'acme-alias': '/tools/acme-overview' } },
  })
  assert.equal(redirect.metadata.canonical, 'https://example.com/tools/acme-overview')
  assert.equal(redirect.structuredData.length, 0)
  assert.equal(redirect.page.indexation.redirectTo, '/tools/acme-overview')
})

test('structured data includes the FAQ block only when FAQs exist', () => {
  const generated = generatePage({
    definition: page(),
    config,
    content: {
      examples: [],
      howItWorks: [{ step: '1', description: 'Do the thing.' }],
      faqs: [{ question: 'What is it?', answer: 'A page.' }],
      relatedPages: [],
    },
  })
  const types = generated.structuredData.map((block) => block['@type'])
  assert.deepEqual(types, ['SoftwareApplication', 'BreadcrumbList', 'FAQPage'])
  const faq = generated.structuredData[2]
  const questions = faq.mainEntity as Array<{ name: string }>
  assert.equal(questions[0].name, 'What is it?')
  const app = generated.structuredData[0]
  assert.equal((app.offers as { price: string }).price, '0')
})

test('sitemap omits noindex, redirects, and canonical overrides', () => {
  const pages = [
    page(),
    page({ slug: 'thin-guide' }),
    page({ slug: 'alias' }),
    page({ slug: 'mirror', canonicalOverride: 'https://example.com/tools/acme-overview' }),
  ]
  const policy = normalizePolicy(
    {
      noindexSlugs: ['thin-guide'],
      redirects: { alias: '/tools/acme-overview' },
    },
    config,
  )
  const entries = collectSitemapEntries(pages, config, policy, { lastmod: '2026-10-06' })
  assert.deepEqual(entries.map((entry) => entry.loc), ['https://example.com/tools/acme-overview'])
  const xml = renderUrlSet(entries)
  assert.match(xml, /<loc>https:\/\/example.com\/tools\/acme-overview<\/loc>/)
  assert.doesNotMatch(xml, /thin-guide/)
  assert.equal(entries[0].priority, 0.7)
  assert.equal(entries[0].changefreq, 'weekly')
})

test('locale pages stay out of the sitemap while the production flag is on', () => {
  const policy = normalizePolicy({ noindexAllLocalePages: true }, config)
  const entries = collectSitemapEntries([page()], config, policy, { locale: 'es' })
  assert.equal(entries.length, 0)

  const generated = generatePage({
    definition: page(),
    config,
    policy: { noindexAllLocalePages: true },
    locale: 'es',
  })
  assert.equal(generated.page.path, '/es/tools/acme-overview')
  assert.equal(generated.page.indexation.index, false)
  assert.equal(generated.metadata.robots?.index, false)
})

test('buildMetadata is available for a page that was already resolved', () => {
  const generated = generatePage({ definition: page(), config })
  const metadata = buildMetadata(generated.page, config)
  assert.equal(metadata.title, 'Acme Overview Title')
  const blocks = buildStructuredData(generated.page, config)
  assert.equal(blocks[0]['@type'], 'SoftwareApplication')
})
