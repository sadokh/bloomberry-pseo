import type { StructuredDataOffer } from './types.ts'

/**
 * Defaults copied from production comments and helpers:
 * - meta descriptions are kept under 160 characters
 * - validatePageCount warns above 500
 * - fallback related links are sliced to 4
 * - locale tool pages stay noindexed until they have real localized content
 * - tool-claim fragments are the thin-page check's slug list
 */
export interface PseoConfigInput {
  siteUrl: string
  siteName: string
  /** Root-relative route. Production tool pages use "/tools". */
  routePrefix: string
  pageCountLimit?: number
  metaDescriptionMaxLength?: number
  toolClaimPatterns?: string[]
  maxRelatedLinks?: number
  noindexAllLocalePages?: boolean
  defaultLocale?: string
  /** Label for the section crumb. Defaults to the route prefix ("tools" → "Tools"). */
  sectionLabel?: string
  homeLabel?: string
  /** Used when a page definition has no platform. Production assumes LinkedIn. */
  defaultPlatformLabel?: string
  platformLabels?: Record<string, string>
  /**
   * Second sentence of the fallback "what is this?" FAQ.
   * Production talks about learning the reader's voice. Pass your own.
   */
  differentiator?: string
  schema?: {
    applicationCategory?: string
    operatingSystem?: string
    /** Set null to omit the Offer node. Production emits a free web offer. */
    offers?: StructuredDataOffer | null
  }
}

export interface PseoConfig {
  siteUrl: string
  siteName: string
  routePrefix: string
  pageCountLimit: number
  metaDescriptionMaxLength: number
  toolClaimPatterns: string[]
  maxRelatedLinks: number
  noindexAllLocalePages: boolean
  defaultLocale: string
  sectionLabel: string
  homeLabel: string
  defaultPlatformLabel: string
  platformLabels: Record<string, string>
  differentiator: string
  schema: {
    applicationCategory: string
    operatingSystem: string
    offers: StructuredDataOffer | null
  }
}

export const TOOL_CLAIM_PATTERNS = [
  'generator',
  'tool',
  'scheduler',
  'planner',
  'rewriter',
  'guide',
  'playbook',
  'strategy',
  'how-to',
]

export const DEFAULT_PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  blog: 'blog',
}

/** Cache-Control used by the production sitemap route handlers. */
export const SITEMAP_CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400'

function sectionLabelFromPrefix(routePrefix: string): string {
  const segment = routePrefix.split('/').filter(Boolean).pop() ?? 'Pages'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function defineConfig(input: PseoConfigInput): PseoConfig {
  const siteUrl = input.siteUrl.replace(/\/+$/, '')
  const withSlash = input.routePrefix.startsWith('/') ? input.routePrefix : `/${input.routePrefix}`
  const routePrefix = withSlash === '/' ? '/' : withSlash.replace(/\/+$/, '')

  return {
    siteUrl,
    siteName: input.siteName,
    routePrefix,
    pageCountLimit: input.pageCountLimit ?? 500,
    metaDescriptionMaxLength: input.metaDescriptionMaxLength ?? 160,
    toolClaimPatterns: input.toolClaimPatterns ?? TOOL_CLAIM_PATTERNS,
    maxRelatedLinks: input.maxRelatedLinks ?? 4,
    noindexAllLocalePages: input.noindexAllLocalePages ?? true,
    defaultLocale: input.defaultLocale ?? 'en',
    sectionLabel: input.sectionLabel ?? sectionLabelFromPrefix(routePrefix),
    homeLabel: input.homeLabel ?? 'Home',
    defaultPlatformLabel: input.defaultPlatformLabel ?? 'LinkedIn',
    platformLabels: { ...DEFAULT_PLATFORM_LABELS, ...input.platformLabels },
    differentiator:
      input.differentiator ??
      `${input.siteName} should add something specific on this page — a comparison, examples, or a step a neighboring URL does not already cover.`,
    schema: {
      applicationCategory: input.schema?.applicationCategory ?? 'BusinessApplication',
      operatingSystem: input.schema?.operatingSystem ?? 'Web',
      offers:
        input.schema && 'offers' in input.schema
          ? (input.schema.offers ?? null)
          : { price: '0', priceCurrency: 'USD' },
    },
  }
}
