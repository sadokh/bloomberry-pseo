/**
 * Record shapes for the page-record engine.
 * These match the production registries in lib/seo.
 */

export interface PageDefinition {
  /** URL slug. Production tool pages become /tools/{slug}. */
  slug: string
  /** Short label shown as a badge above the headline. */
  badge: string
  /** Full document title. */
  title: string
  /** Meta description. Production comments say to keep this under 160 characters. */
  metaDescription: string
  /** H1. */
  headline: string
  /** Supporting line under the H1. */
  subheadline: string
  /**
   * Seed text for example inputs and fallback copy.
   * In production this is not rendered as a live composer.
   */
  composerPlaceholder: string
  /** Primary query this page is trying to satisfy. */
  keyword: string
  /** Hint used by example cards and fallback copy. */
  platform?: string
  /**
   * When set, metadata canonical points here and the page is left out of the
   * tool sitemap. The page itself is not automatically noindexed.
   */
  canonicalOverride?: string
}

export interface ExampleOutput {
  label: string
  input: string
  output: string
  platform?: string
}

export interface HowItWorksStep {
  step: string
  description: string
}

export interface ComparisonRow {
  feature: string
  /** Production comparison tables name this column "bloomberry". */
  ours: boolean | string
  competitor: boolean | string
}

export interface ComparisonTable {
  competitorName: string
  rows: ComparisonRow[]
}

export interface RelatedPage {
  label: string
  href: string
  description?: string
}

export interface FAQ {
  question: string
  answer: string
}

export interface PageContent {
  examples: ExampleOutput[]
  howItWorks: HowItWorksStep[]
  faqs: FAQ[]
  relatedPages: RelatedPage[]
  ctaHeadline?: string
  ctaSubtext?: string
  primaryKeyword?: string
  definition?: string
  definitionOutcome?: string
  capabilities?: string[]
  problem?: { title: string; bullets: string[] }
  comparison?: ComparisonTable
}

export type ContentSource = 'custom' | 'fallback'

export interface IndexationDecision {
  /** False for noindex slugs, redirects, and suppressed locale pages. */
  index: boolean
  follow: boolean
  /** Path or absolute URL. Render should 308 here and skip the page body. */
  redirectTo: string | null
  /** False for noindex, redirects, canonical overrides, and suppressed locales. */
  includeInSitemap: boolean
}

export interface ResolvedPage {
  definition: PageDefinition
  content: PageContent
  /** custom = an authored content entry. fallback = getDefaultContent(). */
  contentSource: ContentSource
  locale: string
  path: string
  url: string
  indexation: IndexationDecision
}

export interface PageMetadata {
  title: string
  description?: string
  robots?: { index: false; follow: true }
  canonical: string
  openGraph?: {
    title: string
    description: string
    url: string
    siteName: string
    type: 'website'
  }
  twitter?: {
    card: 'summary_large_image'
    title: string
    description: string
  }
  languages?: Record<string, string>
}

export interface StructuredDataOffer {
  price: string
  priceCurrency: string
}

export interface IndexationPolicyInput {
  noindexSlugs?: Iterable<string>
  /** slug → redirect target (root-relative path or absolute URL). */
  redirects?: Record<string, string>
  noindexRoutes?: Iterable<string>
  redirectRoutes?: Record<string, string>
  /**
   * When true, every non-default-locale page is noindexed and left out of
   * sitemaps. Production keeps this on until localized content exists.
   */
  noindexAllLocalePages?: boolean
}

export interface NormalizedPolicy {
  noindexSlugs: Set<string>
  redirects: Record<string, string>
  noindexRoutes: Set<string>
  redirectRoutes: Record<string, string>
  noindexAllLocalePages: boolean
}

export interface HowItWorksTemplates {
  default: HowItWorksStep[]
  thread: HowItWorksStep[]
  linkedin: HowItWorksStep[]
  repurpose: HowItWorksStep[]
  hook: HowItWorksStep[]
  style: HowItWorksStep[]
}

export interface LinkRuleGroup {
  prefix: string
  links: RelatedPage[]
}

export interface LinkRules {
  /**
   * Checked before platform groups. A match is not passed through the max cap.
   * Production uses this for slugs that start with "write-like-".
   */
  prefixSets?: LinkRuleGroup[]
  /** Keyed by the value returned from classify(), usually "x" or "linkedin". */
  groups: Record<string, RelatedPage[]>
  classify?: (slug: string) => string
  /** Applied to group matches. Production slices to 4. Prefix sets are not sliced. */
  max?: number
}

export interface SlugMap {
  [locale: string]: string | undefined
}

export interface InternalLinkMap {
  tools: string[]
  blogs: string[]
  homepageSection: string
}

export interface CatalogIssue {
  level: 'error' | 'warning'
  code: string
  slug?: string
  message: string
}

export interface SitemapEntry {
  loc: string
  lastmod?: string
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority?: number
}

export interface RobotsRule {
  userAgent: string
  allow: string
  disallow: string[]
}

export interface RobotsPolicy {
  rules: RobotsRule[]
  sitemap: string[]
}
