import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildFallbackHreflang,
  buildHreflangMap,
  buildRelatedPages,
  defineConfig,
  getClusterSiblings,
  getInternalLinks,
  inferToolLinkGroup,
  missingInternalLinkSlots,
  type LinkRules,
  type RelatedPage,
} from '../src/index.ts'

const config = defineConfig({
  siteUrl: 'https://www.bloomberry.ai',
  siteName: 'Bloomberry',
  routePrefix: '/tools',
})

const hubs: RelatedPage[] = [
  { label: 'Tweet', href: '/tools/ai-tweet-generator', description: 'Tweets' },
  { label: 'Thread', href: '/tools/ai-thread-generator', description: 'Threads' },
  { label: 'Hook', href: '/tools/ai-viral-hook-generator', description: 'Hooks' },
  { label: 'Extra', href: '/tools/ai-extra', description: 'Fifth, must be sliced off' },
  { label: 'Sixth', href: '/tools/ai-sixth', description: 'Also sliced' },
]

const rules: LinkRules = {
  max: 4,
  prefixSets: [
    {
      prefix: 'write-like-',
      links: [
        { label: 'Ghostwriter', href: '/tools/ai-ghostwriter' },
        { label: 'Founder', href: '/tools/write-like-a-founder' },
        { label: 'One', href: '/tools/one' },
        { label: 'Two', href: '/tools/two' },
        { label: 'Three', href: '/tools/three' },
      ],
    },
  ],
  groups: {
    x: hubs,
    linkedin: [{ label: 'LinkedIn', href: '/tools/ai-linkedin-post-generator' }],
  },
}

test('platform groups are capped and never link a page to itself', () => {
  const capped = buildRelatedPages('ai-quote-tweet-generator', rules)
  assert.equal(capped.length, 4)
  assert.equal(capped.at(-1)?.href, '/tools/ai-extra')

  const self = buildRelatedPages('ai-tweet-generator', rules)
  assert.equal(self.some((link) => link.href.endsWith('ai-tweet-generator')), false)
})

test('write-like prefix sets are not passed through the slice cap', () => {
  const links = buildRelatedPages('write-like-a-ceo', rules)
  assert.equal(links.length, 5)
  const self = buildRelatedPages('write-like-a-founder', rules)
  assert.equal(self.some((link) => link.href.endsWith('write-like-a-founder')), false)
  assert.equal(self.length, 4)
})

test('slug classification matches the production fallback linker', () => {
  assert.equal(inferToolLinkGroup('ai-linkedin-post-generator'), 'linkedin')
  assert.equal(inferToolLinkGroup('ai-tweet-generator'), 'x')
  assert.equal(inferToolLinkGroup('ai-thread-generator'), 'x')
  assert.equal(inferToolLinkGroup('weekly-notes'), 'linkedin')
  assert.equal(inferToolLinkGroup('something-x-post'), 'x')
})

test('unknown cluster slugs return no siblings', () => {
  const clusters = {
    'best-crm-for-startups': [{ label: 'Agencies', href: '/compare/crm-for-agencies' }],
  }
  assert.equal(getClusterSiblings(clusters, '/best-crm-for-startups').length, 1)
  assert.deepEqual(getClusterSiblings(clusters, 'missing'), [])
  assert.equal(getClusterSiblings(clusters, 'best-crm-for-startups', 0).length, 0)
})

test('hreflang uses the explicit slug map and ignores unmapped slugs', () => {
  const mapping = [
    { en: 'ai-tweet-generator', fr: 'generateur-tweets-ia', es: 'generador-tweets-ia' },
  ]
  const fromFrench = buildHreflangMap({
    locale: 'fr',
    slug: 'generateur-tweets-ia',
    config,
    mapping,
    locales: ['fr', 'es', 'de'],
  })
  assert.equal(fromFrench.en, 'https://www.bloomberry.ai/tools/ai-tweet-generator')
  assert.equal(fromFrench.fr, 'https://www.bloomberry.ai/fr/tools/generateur-tweets-ia')
  assert.equal(fromFrench.es, 'https://www.bloomberry.ai/es/tools/generador-tweets-ia')
  assert.equal(fromFrench.de, undefined)
  assert.deepEqual(
    buildHreflangMap({ locale: 'en', slug: 'missing', config, mapping }),
    {},
  )
})

test('fallback hreflang matches a locale page by badge or platform', () => {
  const languages = buildFallbackHreflang({
    locale: 'fr',
    slug: 'ai-tweet-generator',
    config,
    locales: ['en', 'fr'],
    badge: 'Tweet Generator',
    platform: 'x',
    pagesByLocale: {
      fr: [{ slug: 'generateur-tweets-ia', badge: 'Tweet Generator', platform: 'x' }],
    },
  })
  assert.equal(languages['x-default'], 'https://www.bloomberry.ai/tools/ai-tweet-generator')
  assert.equal(languages.fr, 'https://www.bloomberry.ai/fr/tools/generateur-tweets-ia')
})

test('blog link maps must point at a tool, another article, and a homepage section', () => {
  const map = {
    'sample-post': {
      tools: ['/tools/ai-tweet-generator'],
      blogs: [] as string[],
      homepageSection: '',
    },
  }
  assert.deepEqual(missingInternalLinkSlots(getInternalLinks(map, 'sample-post')!), ['blogs', 'homepageSection'])
  assert.equal(getInternalLinks(map, 'missing'), undefined)
})
