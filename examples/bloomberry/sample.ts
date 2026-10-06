/**
 * How Bloomberry wires the same engine.
 *
 * The live catalog is the TypeScript registries in the Bloomberry app
 * (lib/seo/toolPages.ts and the content banks next to it). Those registries
 * are not shipped here. This file shows the configuration and the copy
 * patterns, with a few public URL shapes filled in as illustration.
 *
 * Production numbers, as of the extract:
 * - 99 English tool pages at /tools/{slug}
 * - 11 of those have authored TOOL_CONTENT entries
 * - 44 slugs are noindexed and 26 redirect
 * - 5 example pages at /examples/{slug}
 * - locale tool pages (es, fr, de, pt) are all noindexed
 */

import { defineConfig, type HowItWorksTemplates, type PageDefinition } from '../../src/index.ts'

export const bloomberryConfig = defineConfig({
  siteUrl: 'https://www.bloomberry.ai',
  siteName: 'Bloomberry',
  routePrefix: '/tools',
  sectionLabel: 'Tools',
  defaultPlatformLabel: 'LinkedIn',
  differentiator:
    'Bloomberry goes further by learning your voice and writing style so every output sounds like you.',
  schema: {
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { price: '0', priceCurrency: 'USD' },
  },
})

/** Private app paths from app/robots.ts. Named crawlers must repeat this list. */
export const BLOOMBERRY_DISALLOW_PATHS = [
  '/api/',
  '/dashboard/',
  '/editor/',
  '/settings/',
  '/writer/',
  '/scheduler/',
  '/extension-auth/',
  '/login/',
  '/sign-in/',
  '/sign-up/',
]

/**
 * Production keyword expansion only rewrites titles that already start with
 * one of these leads. Other titles are left unchanged.
 */
export const BLOOMBERRY_TITLE_LEAD = /^(AI |LinkedIn |Write )/

export function bloomberryExpansionMeta(ctx: {
  descMod: string
  keyword: string
  siteName: string
}): string {
  return (
    `Looking for ${ctx.descMod} ${ctx.keyword}? ${ctx.siteName} combines AI voice personalisation with ` +
    `${ctx.keyword.toLowerCase()} capabilities so you can publish consistently without generic AI output.`
  )
}

/** Step copy from toolContentGenerator.ts, with the site name left as Bloomberry. */
export function bloomberryHowItWorks(): HowItWorksTemplates {
  return {
    default: [
      { step: '1', description: 'Type your idea, rough thought, or topic into the composer.' },
      { step: '2', description: 'Bloomberry analyses your voice profile and the topic context.' },
      { step: '3', description: 'Get publish-ready content in your voice in under 30 seconds.' },
    ],
    thread: [
      { step: '1', description: 'Type the core idea or lesson you want to turn into a thread.' },
      { step: '2', description: 'Bloomberry structures a narrative arc with a hook, body, and payoff.' },
      { step: '3', description: 'Get a full thread you can post immediately or refine in one click.' },
    ],
    linkedin: [
      { step: '1', description: 'Describe the idea, story, or lesson you want to share on LinkedIn.' },
      { step: '2', description: 'Bloomberry uses your voice profile to match your tone and writing style.' },
      { step: '3', description: 'Get a LinkedIn post that sounds exactly like you — ready to publish.' },
    ],
    repurpose: [
      { step: '1', description: 'Paste your existing content or describe the idea you want to repurpose.' },
      { step: '2', description: 'Choose the formats you want — tweet, thread, LinkedIn post, or all three.' },
      { step: '3', description: 'Get platform-optimised versions ready to publish immediately.' },
    ],
    hook: [
      { step: '1', description: 'Enter your topic, idea, or rough draft that needs a stronger opening.' },
      { step: '2', description: 'Bloomberry generates multiple hook variations using proven engagement patterns.' },
      { step: '3', description: 'Pick the hook that resonates and use it to lead any post or thread.' },
    ],
    style: [
      { step: '1', description: 'Enter the topic or idea you want to write about.' },
      { step: '2', description: 'Bloomberry analyses the specified writing style and applies it to your content.' },
      { step: '3', description: 'Get content that captures the essence of the style while staying authentic to your ideas.' },
    ],
  }
}

/**
 * Illustrative records. The production file has one of these per tool URL.
 * Adding a record there is what publishes a page: generateStaticParams reads
 * the array, and the tool sitemap filters it through the indexation policy.
 */
export const samplePages: PageDefinition[] = [
  {
    slug: 'ai-tweet-generator',
    badge: 'Tweet Generator',
    title: 'AI Tweet Generator — Write Viral Tweets in Seconds | Bloomberry',
    metaDescription:
      'Generate tweets in a voice profile you train, instead of a generic model tone. Publish from the same draft.',
    headline: 'AI Tweet Generator That Writes Like You',
    subheadline: 'Turn one idea into a tweet your audience actually engages with.',
    composerPlaceholder: 'Write a tweet about why distribution beats product',
    keyword: 'AI tweet generator',
    platform: 'x',
  },
  {
    slug: 'ai-thread-generator',
    badge: 'Thread Generator',
    title: 'AI Twitter Thread Generator — Turn Ideas Into Threads | Bloomberry',
    metaDescription:
      'Turn one idea into a thread with a hook, a middle, and a payoff. The draft follows the voice profile on the account.',
    headline: 'AI Twitter Thread Generator That Sounds Human',
    subheadline: 'Go from a rough idea to a full thread in under a minute.',
    composerPlaceholder: 'Write a thread about the biggest hiring mistake founders make',
    keyword: 'AI thread generator',
    platform: 'x',
  },
]

/**
 * A sample of the production policy shape. The real sets are longer and live
 * in lib/seo/indexationPolicy.ts. Do not copy a quarantine list into a new
 * site. Build yours from pages that failed the thin-page check.
 */
export const samplePolicy = {
  noindexSlugs: ['linkedin-personal-brand-guide'],
  redirects: {
    'ai-startup-thread-generator': '/tools/ai-thread-generator',
  },
  noindexRoutes: ['/docs'],
  redirectRoutes: {
    '/features/thread-generator': '/ai-twitter-thread-generator',
  },
  noindexAllLocalePages: true,
}

export const sampleSlugMap = [
  {
    en: 'ai-tweet-generator',
    fr: 'generateur-tweets-ia',
    es: 'generador-tweets-ia',
    de: 'ki-tweet-generator',
    pt: 'gerador-tweets-ia',
  },
]
