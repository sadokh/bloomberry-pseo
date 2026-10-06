import type { PseoConfig } from '../config.ts'
import type {
  ExampleOutput,
  FAQ,
  HowItWorksStep,
  HowItWorksTemplates,
  LinkRules,
  PageContent,
  PageDefinition,
} from '../types.ts'
import { buildRelatedPages } from '../linking/relatedPages.ts'

/**
 * Slug-pattern order matches getDefaultContent() in toolContentGenerator.ts.
 * "thread" is tested before "thread-to", so a slug containing both receives
 * the thread steps. The repurpose branch still lists "thread-to" because
 * that is what production writes.
 */
export function selectHowItWorks(slug: string, templates: HowItWorksTemplates): HowItWorksStep[] {
  if (slug.startsWith('write-like-')) return templates.style
  if (slug.includes('thread')) return templates.thread
  if (slug.includes('linkedin')) return templates.linkedin
  if (
    slug.includes('repurpos') ||
    slug.includes('blog-to') ||
    slug.includes('podcast-to') ||
    slug.includes('thread-to')
  ) {
    return templates.repurpose
  }
  if (slug.includes('hook') || slug.includes('opening-line')) return templates.hook
  return templates.default
}

export function genericHowItWorks(siteName: string): HowItWorksTemplates {
  const three = (a: string, b: string, c: string): HowItWorksStep[] => [
    { step: '1', description: a },
    { step: '2', description: b },
    { step: '3', description: c },
  ]
  return {
    default: three(
      'Start from the idea, question, or source material this page is about.',
      `${siteName} fills the page template with the data and examples attached to this slug.`,
      'Publish the page only after it says something the neighboring URLs do not already say.',
    ),
    thread: three(
      'State the single idea the sequence has to carry.',
      'Lay out a hook, a middle, and a payoff as separate steps.',
      'Keep each step specific enough that the page is useful without the next URL.',
    ),
    linkedin: three(
      'Name the audience and the job the page helps them do.',
      'Use examples written for that audience, not a renamed copy of a sibling page.',
      'End on a concrete next step.',
    ),
    repurpose: three(
      'Start from a source the reader already has.',
      'Show the format you are turning it into, with a real before and after.',
      'Link to the source format and the destination format.',
    ),
    hook: three(
      'Show the weak opening and the stronger one.',
      'Explain the pattern in one sentence.',
      'Give the reader a way to try it on their own draft.',
    ),
    style: three(
      'Name the style with enough precision that two writers would recognize it.',
      'Show the moves the style actually uses.',
      'Keep the reader\'s own subject matter in the examples.',
    ),
  }
}

export function platformLabel(config: PseoConfig, platform?: string): string {
  if (!platform) return config.defaultPlatformLabel
  return config.platformLabels[platform] ?? platform
}

export interface DefaultContentInput {
  config: PseoConfig
  examples?: Record<string, ExampleOutput[]>
  faqs?: Record<string, FAQ[]>
  linkRules?: LinkRules
  howItWorks?: HowItWorksTemplates
}

/**
 * Fallback used when a slug has no authored content entry.
 * Production prefers a per-slug example and FAQ bank, then these templates.
 * Indexable pages whose slug claims to be a tool or guide should not ship on
 * this fallback. validateCatalog flags that case.
 */
export function getDefaultContent(page: PageDefinition, input: DefaultContentInput): PageContent {
  const { config } = input
  const label = platformLabel(config, page.platform)
  const templates = input.howItWorks ?? genericHowItWorks(config.siteName)

  const examples: ExampleOutput[] = input.examples?.[page.slug] ?? [
    {
      label: 'Example output',
      input: page.composerPlaceholder,
      output: `${config.siteName} page for “${page.keyword}”. Replace this fallback with a real example before indexing the URL.`,
      platform: page.platform,
    },
  ]

  const faqs: FAQ[] = input.faqs?.[page.slug] ?? [
    {
      question: `What is ${page.keyword}?`,
      answer: `${page.keyword} is the query this page answers for ${label}. ${config.differentiator}`,
    },
    {
      question: `How does ${config.siteName} cover ${label}?`,
      answer: `${config.siteName} builds this page from the ${page.keyword} record: a definition, examples, and links to related pages.`,
    },
    {
      question: `Is ${page.keyword} the same as the other pages in this section?`,
      answer: `It should not be. If the answer is the same as a neighboring URL, redirect this slug or noindex it.`,
    },
    {
      question: `How long does it take to use?`,
      answer: `Read the examples and the steps on this page. If those sections are still the generic fallback, the page is not ready to index.`,
    },
  ]

  return {
    examples,
    howItWorks: selectHowItWorks(page.slug, templates),
    faqs,
    relatedPages: input.linkRules ? buildRelatedPages(page.slug, input.linkRules) : [],
    ctaHeadline: `Read the ${label} page for ${page.keyword}`,
    ctaSubtext: `${config.siteName} only indexes this URL when the content is specific to the query.`,
  }
}
