/**
 * Static page-record engine.
 *
 * records → dedupe → authored content or fallback → indexation
 * → metadata and structured data → related links → sitemap URLs
 */

export { defineConfig, TOOL_CLAIM_PATTERNS, DEFAULT_PLATFORM_LABELS, SITEMAP_CACHE_CONTROL } from './config.ts'
export type { PseoConfig, PseoConfigInput } from './config.ts'

export type {
  PageDefinition,
  PageContent,
  ResolvedPage,
  ExampleOutput,
  HowItWorksStep,
  HowItWorksTemplates,
  ComparisonRow,
  ComparisonTable,
  RelatedPage,
  FAQ,
  ContentSource,
  IndexationDecision,
  PageMetadata,
  StructuredDataOffer,
  IndexationPolicyInput,
  NormalizedPolicy,
  LinkRules,
  LinkRuleGroup,
  SlugMap,
  InternalLinkMap,
  CatalogIssue,
  SitemapEntry,
  RobotsRule,
  RobotsPolicy,
} from './types.ts'

export { slugify, unslugify } from './utils/slug.ts'
export { localePrefix, PRODUCTION_LOCALES } from './utils/locales.ts'

export { dedupePages, assessPageCount, warnIfPageCountExceeded } from './validation/dedupe.ts'
export {
  validateCatalog,
  validateResolvedPage,
  hasErrors,
  isToolClaim,
  isCatalogIndexable,
} from './validation/quality.ts'

export { canonical, localizedCanonical, pagePath } from './seo/canonical.ts'
export {
  normalizePolicy,
  decideIndexation,
  shouldNoindexSlug,
  getRedirectTarget,
  shouldNoindexRoute,
  shouldIncludeInSitemap,
  shouldIncludeLocaleInSitemap,
} from './seo/indexation.ts'
export { buildMetadata } from './seo/metadata.ts'
export { buildStructuredData, buildFaqPage } from './seo/structuredData.ts'
export type { StructuredDataBlock } from './seo/structuredData.ts'
export { renderUrlSet, renderSitemapIndex, collectSitemapEntries, xmlEscape } from './seo/sitemap.ts'
export { buildRobotsPolicy, renderRobotsTxt, PRODUCTION_ROBOTS_USER_AGENTS } from './seo/robots.ts'

export {
  generateKeywordExpansions,
  expandCategory,
  DEFAULT_EXPANSION_PREFIXES,
} from './generators/keywordExpansions.ts'
export type { ExpansionOptions, ExpansionMetaContext } from './generators/keywordExpansions.ts'
export {
  getDefaultContent,
  selectHowItWorks,
  genericHowItWorks,
  platformLabel,
} from './generators/defaultContent.ts'
export { buildRelatedPages, inferToolLinkGroup } from './linking/relatedPages.ts'
export { getClusterSiblings } from './linking/clusters.ts'
export { buildHreflangMap, buildFallbackHreflang } from './linking/hreflang.ts'
export type { HreflangInput, LocaleSiblingPage } from './linking/hreflang.ts'
export { getInternalLinks, missingInternalLinkSlots } from './linking/internalLinks.ts'

export { createRegistry } from './core/registry.ts'
export type { PageRegistry } from './core/registry.ts'
export { generatePage, resolvePage } from './core/generatePage.ts'
export type { GeneratePageInput, GeneratedPage } from './core/generatePage.ts'
