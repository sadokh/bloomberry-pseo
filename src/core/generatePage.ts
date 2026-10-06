import type { PseoConfig } from '../config.ts'
import { defineConfig, type PseoConfigInput } from '../config.ts'
import { getDefaultContent, type DefaultContentInput } from '../generators/defaultContent.ts'
import { buildHreflangMap, type HreflangInput } from '../linking/hreflang.ts'
import { canonical, pagePath } from '../seo/canonical.ts'
import { decideIndexation, normalizePolicy } from '../seo/indexation.ts'
import { buildMetadata } from '../seo/metadata.ts'
import { buildStructuredData, type StructuredDataBlock } from '../seo/structuredData.ts'
import type {
  CatalogIssue,
  FAQ,
  ExampleOutput,
  IndexationPolicyInput,
  LinkRules,
  PageContent,
  PageDefinition,
  PageMetadata,
  ResolvedPage,
  SlugMap,
} from '../types.ts'
import { validateResolvedPage } from '../validation/quality.ts'

export interface GeneratePageInput {
  definition: PageDefinition
  config: PseoConfig | PseoConfigInput
  policy?: IndexationPolicyInput
  /** Authored content. Omit it and the page is filled from the fallback templates. */
  content?: PageContent | null
  examples?: Record<string, ExampleOutput[]>
  faqs?: Record<string, FAQ[]>
  linkRules?: LinkRules
  howItWorks?: DefaultContentInput['howItWorks']
  locale?: string
  slugMapping?: SlugMap[]
  hreflangLocales?: readonly string[]
}

export interface GeneratedPage {
  page: ResolvedPage
  metadata: PageMetadata
  /** Empty when the page redirects. Production redirects before JSON-LD renders. */
  structuredData: StructuredDataBlock[]
  validation: CatalogIssue[]
}

export function resolvePage(input: GeneratePageInput): ResolvedPage {
  const config = defineConfig(input.config)
  const policy = normalizePolicy(input.policy, config)
  const locale = input.locale ?? config.defaultLocale
  const contentSource = input.content ? 'custom' : 'fallback'
  const content =
    input.content ??
    getDefaultContent(input.definition, {
      config,
      examples: input.examples,
      faqs: input.faqs,
      linkRules: input.linkRules,
      howItWorks: input.howItWorks,
    })

  const path = pagePath(config, input.definition.slug, locale)
  return {
    definition: input.definition,
    content,
    contentSource,
    locale,
    path,
    url: canonical(config, path),
    indexation: decideIndexation(input.definition, policy, locale, config.defaultLocale),
  }
}

export function generatePage(input: GeneratePageInput): GeneratedPage {
  const config = defineConfig(input.config)
  const page = resolvePage({ ...input, config })

  let languages: Record<string, string> | undefined
  if (input.slugMapping && input.slugMapping.length > 0) {
    const hreflang: HreflangInput = {
      locale: page.locale,
      slug: page.definition.slug,
      config,
      mapping: input.slugMapping,
      locales: input.hreflangLocales,
    }
    const map = buildHreflangMap(hreflang)
    if (Object.keys(map).length > 0) languages = map
  }

  const metadata = buildMetadata(page, config, languages)
  const structuredData = page.indexation.redirectTo ? [] : buildStructuredData(page, config)
  const validation = validateResolvedPage(page, config)

  return { page, metadata, structuredData, validation }
}
