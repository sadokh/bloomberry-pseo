import type { PageDefinition } from '../types.ts'
import { dedupePages } from '../validation/dedupe.ts'

/**
 * Modifier prefixes production offers for opt-in expansion.
 * Adding the results to the live registry is a manual step.
 */
export const DEFAULT_EXPANSION_PREFIXES = [
  'best',
  'free',
  'top',
  'ai-powered',
  'automated',
] as const

const PREFIX_TITLE_MODIFIERS: Record<string, string> = {
  best: 'Best',
  free: 'Free',
  top: 'Top',
  'ai-powered': 'AI-Powered',
  automated: 'Automated',
}

const PREFIX_DESCRIPTION_MODIFIERS: Record<string, string> = {
  best: 'the best',
  free: 'a free',
  top: 'a top',
  'ai-powered': 'an AI-powered',
  automated: 'an automated',
}

export interface ExpansionMetaContext {
  descMod: string
  keyword: string
  siteName: string
  prefix: string
  base: PageDefinition
}

export interface ExpansionOptions {
  prefixes?: readonly string[]
  existingSlugs?: Iterable<string>
  siteName?: string
  /**
   * Production only rewrites titles that match /^(AI |LinkedIn |Write )/.
   * When the pattern misses, the original title is kept.
   * Omit the pattern to prepend the modifier to every title.
   */
  titleLeadPattern?: RegExp
  metaDescriptionMaxLength?: number
  metaDescription?: (ctx: ExpansionMetaContext) => string
  onDuplicate?: (slug: string) => void
}

function defaultMeta(ctx: ExpansionMetaContext): string {
  return (
    `Looking for ${ctx.descMod} ${ctx.keyword}? ${ctx.siteName} covers ` +
    `${ctx.keyword.toLowerCase()} in enough detail to stand on its own.`
  )
}

function applyTitleModifier(title: string, titleMod: string, pattern?: RegExp): string {
  if (!pattern) {
    if (title.toLowerCase().startsWith(titleMod.toLowerCase() + ' ')) return title
    return `${titleMod} ${title}`
  }
  const replaced = title.replace(pattern, `${titleMod} $1`)
  return replaced
}

/**
 * Build slug and keyword variants by prefixing existing pages.
 * Collisions with existingSlugs and within the batch are skipped.
 * The return value is not merged into the live catalog.
 */
export function generateKeywordExpansions(
  basePages: PageDefinition[],
  options: ExpansionOptions = {},
): PageDefinition[] {
  const prefixes = options.prefixes ?? [...DEFAULT_EXPANSION_PREFIXES]
  const existing = new Set(options.existingSlugs ?? [])
  const siteName = options.siteName ?? 'This site'
  const max = options.metaDescriptionMaxLength ?? 160
  const describe = options.metaDescription ?? defaultMeta
  const expansions: PageDefinition[] = []

  for (const base of basePages) {
    for (const prefix of prefixes) {
      const expandedSlug = `${prefix}-${base.slug}`
      if (existing.has(expandedSlug)) continue

      const titleMod = PREFIX_TITLE_MODIFIERS[prefix] ?? prefix
      const descMod = PREFIX_DESCRIPTION_MODIFIERS[prefix] ?? `a ${prefix}`
      const expandedKeyword = `${prefix} ${base.keyword}`
      const expandedMeta = describe({
        descMod,
        keyword: base.keyword,
        siteName,
        prefix,
        base,
      }).slice(0, max)

      expansions.push({
        slug: expandedSlug,
        badge: base.badge,
        title: applyTitleModifier(base.title, titleMod, options.titleLeadPattern),
        metaDescription: expandedMeta,
        headline: `${titleMod} ${base.headline}`,
        subheadline: base.subheadline,
        composerPlaceholder: base.composerPlaceholder,
        keyword: expandedKeyword,
        platform: base.platform,
      })
    }
  }

  return dedupePages(expansions, options.onDuplicate).pages
}

export function expandCategory(
  allPages: PageDefinition[],
  filter: (slug: string) => boolean,
  options: ExpansionOptions = {},
): PageDefinition[] {
  return generateKeywordExpansions(
    allPages.filter((page) => filter(page.slug)),
    options,
  )
}
