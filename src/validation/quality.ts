import type { PseoConfig } from '../config.ts'
import type { CatalogIssue, NormalizedPolicy, PageDefinition, ResolvedPage } from '../types.ts'
import { dedupePages } from './dedupe.ts'

export function isToolClaim(slug: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => slug.includes(pattern))
}

/**
 * A slug counts as indexable for catalog validation when it is not noindexed,
 * not redirected, and has no canonical override.
 */
export function isCatalogIndexable(
  page: Pick<PageDefinition, 'slug' | 'canonicalOverride'>,
  policy: NormalizedPolicy,
): boolean {
  if (policy.noindexSlugs.has(page.slug)) return false
  if (page.slug in policy.redirects) return false
  if (page.canonicalOverride) return false
  return true
}

export interface ValidateCatalogInput {
  pages: PageDefinition[]
  /** Slugs that have an authored content entry, equivalent to TOOL_CONTENT keys. */
  customContentSlugs: Iterable<string>
  policy: NormalizedPolicy
  config: PseoConfig
  /**
   * Regression list. Production hard-fails if one of these is still indexable.
   * Pass an empty set when you do not have a historical quarantine list.
   */
  genericFaqSlugs?: Iterable<string>
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function redirectTargetSlug(target: string, routePrefix: string): string | null {
  if (target.startsWith('http://') || target.startsWith('https://')) return null
  const prefix = routePrefix === '/' ? '' : routePrefix
  const match = target.match(new RegExp(`^${escapeRegExp(prefix)}/([^/]+)$`))
  return match?.[1] ?? null
}

/**
 * Catalog validation for the record checks in the Bloomberry app's
 * seo-quality-gate script: thin-page claims, generic-FAQ regressions,
 * redirects into noindex, duplicate slugs, meta description length, and
 * catalog size. Checks that read Next.js source files stay in the app.
 */
export function validateCatalog(input: ValidateCatalogInput): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const custom = new Set(input.customContentSlugs)
  const { pages, policy, config } = input
  const deduped = dedupePages(pages, () => {})

  for (const slug of deduped.duplicates) {
    issues.push({
      level: 'error',
      code: 'duplicate-slug',
      slug,
      message: `Duplicate slug "${slug}". Only the first occurrence is used.`,
    })
  }

  if (deduped.pages.length > config.pageCountLimit) {
    issues.push({
      level: 'warning',
      code: 'page-count',
      message:
        `Page count (${deduped.pages.length}) exceeds the ${config.pageCountLimit}-page advisory limit. ` +
        `Review for thin-content risk before deploying additional pages.`,
    })
  }

  const thin: string[] = []
  for (const page of deduped.pages) {
    if (page.metaDescription.length > config.metaDescriptionMaxLength) {
      issues.push({
        level: 'warning',
        code: 'meta-description-length',
        slug: page.slug,
        message: `${page.slug} meta description is ${page.metaDescription.length} characters. Keep it under ${config.metaDescriptionMaxLength}.`,
      })
    }

    if (!isCatalogIndexable(page, policy)) continue
    if (!isToolClaim(page.slug, config.toolClaimPatterns)) continue
    if (custom.has(page.slug)) continue

    thin.push(page.slug)
    issues.push({
      level: 'error',
      code: 'thin-tool-claim',
      slug: page.slug,
      message:
        `${config.routePrefix}/${page.slug} is indexable, claims to be a tool/guide/generator, ` +
        `but has no custom content. Noindex it, redirect it, or write a real content entry.`,
    })
  }

  if (thin.length > 0) {
    issues.push({
      level: 'error',
      code: 'thin-tool-claim-count',
      message: `${thin.length} indexable tool-claim ${thin.length === 1 ? 'page uses' : 'pages use'} fallback content.`,
    })
  }

  for (const slug of input.genericFaqSlugs ?? []) {
    const page = deduped.pages.find((entry) => entry.slug === slug)
    const canonicalOverride = page?.canonicalOverride
    const indexable =
      !policy.noindexSlugs.has(slug) &&
      !(slug in policy.redirects) &&
      !canonicalOverride
    if (indexable) {
      issues.push({
        level: 'error',
        code: 'generic-faq',
        slug,
        message: `${config.routePrefix}/${slug} is indexable but is on the generic-FAQ quarantine list.`,
      })
    }
  }

  for (const [source, target] of Object.entries(policy.redirects)) {
    const targetSlug = redirectTargetSlug(target, config.routePrefix)
    if (targetSlug && policy.noindexSlugs.has(targetSlug)) {
      issues.push({
        level: 'error',
        code: 'redirect-to-noindex',
        slug: source,
        message:
          `${config.routePrefix}/${source} redirects to ${config.routePrefix}/${targetSlug}, ` +
          `but that target is noindexed. Redirect to an indexable URL, or remove the target from the noindex set.`,
      })
    }
  }

  if (!policy.noindexAllLocalePages) {
    issues.push({
      level: 'warning',
      code: 'locale-indexable',
      message:
        'Locale pages are indexable. Confirm they have genuine localized content before publishing those URLs.',
    })
  }

  return issues
}

export function validateResolvedPage(page: ResolvedPage, config: PseoConfig): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const { definition } = page

  if (!definition.slug.trim()) {
    issues.push({ level: 'error', code: 'missing-slug', message: 'Page is missing a slug.' })
  }
  if (!definition.title.trim()) {
    issues.push({
      level: 'error',
      code: 'missing-title',
      slug: definition.slug,
      message: `${definition.slug} is missing a title.`,
    })
  }
  if (!definition.keyword.trim()) {
    issues.push({
      level: 'error',
      code: 'missing-keyword',
      slug: definition.slug,
      message: `${definition.slug} is missing a keyword.`,
    })
  }
  if (definition.metaDescription.length > config.metaDescriptionMaxLength) {
    issues.push({
      level: 'warning',
      code: 'meta-description-length',
      slug: definition.slug,
      message: `${definition.slug} meta description is ${definition.metaDescription.length} characters. Keep it under ${config.metaDescriptionMaxLength}.`,
    })
  }
  if (definition.metaDescription.length === 0 && page.indexation.index) {
    issues.push({
      level: 'warning',
      code: 'missing-meta-description',
      slug: definition.slug,
      message: `${definition.slug} is indexable and has an empty meta description.`,
    })
  }

  if (
    page.indexation.includeInSitemap &&
    page.contentSource === 'fallback' &&
    isToolClaim(definition.slug, config.toolClaimPatterns)
  ) {
    issues.push({
      level: 'error',
      code: 'thin-tool-claim',
      slug: definition.slug,
      message:
        `${page.path} is in the sitemap, claims to be a tool/guide/generator, and uses fallback content.`,
    })
  }

  return issues
}

export function hasErrors(issues: CatalogIssue[]): boolean {
  return issues.some((issue) => issue.level === 'error')
}
