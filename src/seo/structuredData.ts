import type { PseoConfig } from '../config.ts'
import { canonical } from './canonical.ts'
import type { FAQ, ResolvedPage } from '../types.ts'

export interface StructuredDataBlock {
  '@context': 'https://schema.org'
  '@type': string
  [key: string]: unknown
}

/**
 * SoftwareApplication + BreadcrumbList, matching the JSON-LD emitted by
 * app/tools/[slug]/page.tsx. FAQPage matches the visible FAQ block in
 * SEOFeaturePage. Redirected pages should not call this: production
 * permanentRedirects before the scripts render.
 */
export function buildStructuredData(page: ResolvedPage, config: PseoConfig): StructuredDataBlock[] {
  const sectionPath =
    page.locale === config.defaultLocale
      ? config.routePrefix
      : `/${page.locale}${config.routePrefix === '/' ? '' : config.routePrefix}`

  const application: StructuredDataBlock = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: page.definition.headline,
    description: page.definition.metaDescription,
    url: page.url,
    applicationCategory: config.schema.applicationCategory,
    operatingSystem: config.schema.operatingSystem,
  }

  if (config.schema.offers) {
    application.offers = {
      '@type': 'Offer',
      price: config.schema.offers.price,
      priceCurrency: config.schema.offers.priceCurrency,
    }
  }

  const breadcrumb: StructuredDataBlock = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: config.homeLabel, item: config.siteUrl },
      { '@type': 'ListItem', position: 2, name: config.sectionLabel, item: canonical(config, sectionPath) },
      { '@type': 'ListItem', position: 3, name: page.definition.headline, item: page.url },
    ],
  }

  const blocks = [application, breadcrumb]
  if (page.content.faqs.length > 0) {
    blocks.push(buildFaqPage(page.content.faqs))
  }
  return blocks
}

export function buildFaqPage(faqs: FAQ[]): StructuredDataBlock {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  }
}
