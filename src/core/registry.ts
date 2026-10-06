import type { PseoConfig } from '../config.ts'
import type { PageDefinition } from '../types.ts'
import { dedupePages, warnIfPageCountExceeded, type PageCountResult } from '../validation/dedupe.ts'

export interface PageRegistry {
  pages: PageDefinition[]
  duplicates: string[]
  pageCount: PageCountResult
  find(slug: string): PageDefinition | undefined
}

/**
 * In-memory page registry. This is the production store: a deduped list of
 * page records, looked up by slug with a linear scan of the kept list.
 */
export function createRegistry(
  pages: PageDefinition[],
  config: Pick<PseoConfig, 'pageCountLimit'>,
  options?: { onWarn?: (message: string) => void; onDuplicate?: (slug: string) => void },
): PageRegistry {
  const deduped = dedupePages(pages, options?.onDuplicate ?? (() => {}))
  const pageCount = warnIfPageCountExceeded(
    deduped.pages.length,
    config.pageCountLimit,
    options?.onWarn ?? (() => {}),
  )

  return {
    pages: deduped.pages,
    duplicates: deduped.duplicates,
    pageCount,
    find(slug: string) {
      return deduped.pages.find((page) => page.slug === slug)
    },
  }
}
