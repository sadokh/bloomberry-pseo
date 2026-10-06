import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getDefaultContent,
  genericHowItWorks,
  selectHowItWorks,
  slugify,
  unslugify,
  defineConfig,
  type PageDefinition,
} from '../src/index.ts'

test('slugify matches the blog category helper', () => {
  assert.equal(slugify('Best CRM for Startups'), 'best-crm-for-startups')
  assert.equal(slugify('CRM & Pipeline'), 'crm--pipeline')
  assert.equal(unslugify('best-crm-for-startups'), 'Best Crm For Startups')
})

test('how-it-works selection keeps production pattern order', () => {
  const templates = genericHowItWorks('Northwind')
  assert.equal(selectHowItWorks('write-like-a-founder', templates), templates.style)
  assert.equal(selectHowItWorks('ai-thread-generator', templates), templates.thread)
  // "thread" is tested before "thread-to", so this does not use the repurpose steps.
  assert.equal(selectHowItWorks('ai-thread-to-linkedin-generator', templates), templates.thread)
  assert.equal(selectHowItWorks('ai-linkedin-post-generator', templates), templates.linkedin)
  assert.equal(selectHowItWorks('ai-blog-to-thread-generator', templates), templates.thread)
  assert.equal(selectHowItWorks('ai-podcast-to-post-generator', templates), templates.repurpose)
  assert.equal(selectHowItWorks('ai-viral-hook-generator', templates), templates.hook)
  assert.equal(selectHowItWorks('crm-vs-spreadsheets', templates), templates.default)
})

test('fallback content interpolates the keyword and stays marked as fallback by the caller', () => {
  const config = defineConfig({
    siteUrl: 'https://northwind.example',
    siteName: 'Northwind',
    routePrefix: '/compare',
    defaultPlatformLabel: 'the product',
  })
  const page: PageDefinition = {
    slug: 'crm-implementation-guide',
    badge: 'Guide',
    title: 'CRM Implementation Guide',
    metaDescription: 'Placeholder.',
    headline: 'CRM implementation guide',
    subheadline: 'Thin page.',
    composerPlaceholder: 'How do we implement a CRM',
    keyword: 'crm implementation guide',
    platform: 'crm',
  }
  const content = getDefaultContent(page, { config })
  assert.equal(content.faqs[0].question, 'What is crm implementation guide?')
  assert.match(content.examples[0].output, /Northwind/)
  assert.equal(content.faqs.length, 4)
  assert.equal(content.howItWorks.length, 3)
})
