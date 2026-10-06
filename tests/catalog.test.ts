import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  createRegistry,
  dedupePages,
  defineConfig,
  generateKeywordExpansions,
  hasErrors,
  validateCatalog,
  type PageDefinition,
} from '../src/index.ts'

function page(overrides: Partial<PageDefinition> = {}): PageDefinition {
  return {
    slug: 'acme-overview',
    badge: 'Overview',
    title: 'Acme Overview',
    metaDescription: 'A short description of the page.',
    headline: 'Acme overview',
    subheadline: 'Supporting line.',
    composerPlaceholder: 'A starting note',
    keyword: 'acme overview',
    ...overrides,
  }
}

const config = defineConfig({
  siteUrl: 'https://example.com',
  siteName: 'Example',
  routePrefix: '/tools',
})

test('dedupe keeps the first slug and reports the rest', () => {
  const first = page({ title: 'First' })
  const second = page({ title: 'Second' })
  const result = dedupePages([first, second, page({ slug: 'other' })], () => {})
  assert.deepEqual(result.duplicates, ['acme-overview'])
  assert.equal(result.pages.length, 2)
  assert.equal(result.pages[0].title, 'First')
})

test('registry drops duplicates before lookup', () => {
  const registry = createRegistry(
    [page({ title: 'First' }), page({ title: 'Second' })],
    config,
    { onWarn() {}, onDuplicate() {} },
  )
  assert.equal(registry.find('acme-overview')?.title, 'First')
  assert.deepEqual(registry.duplicates, ['acme-overview'])
})

test('indexable tool-claim pages without custom content fail the thin-page check', () => {
  const issues = validateCatalog({
    pages: [page({ slug: 'acme-guide', keyword: 'acme guide' })],
    customContentSlugs: [],
    policy: {
      noindexSlugs: new Set(),
      redirects: {},
      noindexRoutes: new Set(),
      redirectRoutes: {},
      noindexAllLocalePages: true,
    },
    config,
  })
  assert.equal(hasErrors(issues), true)
  assert.ok(issues.some((issue) => issue.code === 'thin-tool-claim' && issue.slug === 'acme-guide'))
})

test('noindex, custom content, or a redirect clears the thin-page error', () => {
  const guide = page({ slug: 'acme-guide', keyword: 'acme guide' })
  const policy = {
    noindexSlugs: new Set(['acme-guide']),
    redirects: {},
    noindexRoutes: new Set<string>(),
    redirectRoutes: {},
    noindexAllLocalePages: true,
  }
  const noindexed = validateCatalog({
    pages: [guide],
    customContentSlugs: [],
    policy,
    config,
  })
  assert.equal(noindexed.some((issue) => issue.code === 'thin-tool-claim'), false)

  const authored = validateCatalog({
    pages: [guide],
    customContentSlugs: ['acme-guide'],
    policy: { ...policy, noindexSlugs: new Set() },
    config,
  })
  assert.equal(authored.some((issue) => issue.code === 'thin-tool-claim'), false)
})

test('a redirect into a noindexed slug is an error', () => {
  const issues = validateCatalog({
    pages: [
      page({ slug: 'acme-guide' }),
      page({ slug: 'acme-alias', keyword: 'acme alias' }),
    ],
    customContentSlugs: ['acme-guide'],
    policy: {
      noindexSlugs: new Set(['acme-guide']),
      redirects: { 'acme-alias': '/tools/acme-guide' },
      noindexRoutes: new Set(),
      redirectRoutes: {},
      noindexAllLocalePages: true,
    },
    config,
  })
  assert.ok(issues.some((issue) => issue.code === 'redirect-to-noindex' && issue.slug === 'acme-alias'))
})

test('root-level redirect targets are not compared to the tool noindex set', () => {
  const issues = validateCatalog({
    pages: [page({ slug: 'acme-alias', keyword: 'acme alias' })],
    customContentSlugs: [],
    policy: {
      noindexSlugs: new Set(['ai-hook-generator']),
      redirects: { 'acme-alias': '/ai-hook-generator' },
      noindexRoutes: new Set(),
      redirectRoutes: {},
      noindexAllLocalePages: true,
    },
    config,
  })
  assert.equal(issues.some((issue) => issue.code === 'redirect-to-noindex'), false)
})

test('keyword expansions skip existing slugs and cap the meta description', () => {
  const base = page({
    slug: 'acme-overview',
    title: 'AI Acme Overview — Details',
    keyword: 'acme overview',
    metaDescription: 'x'.repeat(40),
  })
  const expansions = generateKeywordExpansions([base], {
    prefixes: ['best'],
    existingSlugs: ['best-acme-overview'],
    siteName: 'Example',
    titleLeadPattern: /^(AI |LinkedIn |Write )/,
    metaDescriptionMaxLength: 160,
    metaDescription: () => 'y'.repeat(400),
    onDuplicate() {},
  })
  assert.equal(expansions.length, 0)

  const created = generateKeywordExpansions([base], {
    prefixes: ['free'],
    siteName: 'Example',
    titleLeadPattern: /^(AI |LinkedIn |Write )/,
    metaDescription: () => 'y'.repeat(400),
    onDuplicate() {},
  })
  assert.equal(created.length, 1)
  assert.equal(created[0].slug, 'free-acme-overview')
  assert.equal(created[0].keyword, 'free acme overview')
  assert.equal(created[0].metaDescription.length, 160)
  assert.equal(created[0].title, 'Free AI Acme Overview — Details')
})

test('titles that miss the production lead pattern stay unchanged', () => {
  const created = generateKeywordExpansions([page({ title: 'Plain Title' })], {
    prefixes: ['best'],
    titleLeadPattern: /^(AI |LinkedIn |Write )/,
    onDuplicate() {},
  })
  assert.equal(created[0].title, 'Plain Title')
})

test('without a lead pattern, the modifier is prepended', () => {
  const created = generateKeywordExpansions([page({ title: 'Plain Title' })], {
    prefixes: ['best'],
    onDuplicate() {},
  })
  assert.equal(created[0].title, 'Best Plain Title')
  assert.equal(created[0].headline.startsWith('Best '), true)
})
