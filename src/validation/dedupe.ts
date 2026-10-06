export interface DedupeResult<T> {
  pages: T[]
  duplicates: string[]
}

/**
 * Keep the first record for each slug. Later copies are dropped.
 * Production logs a warning and continues the build.
 */
export function dedupePages<T extends { slug: string }>(
  pages: T[],
  onDuplicate?: (slug: string) => void,
): DedupeResult<T> {
  const seen = new Set<string>()
  const duplicates: string[] = []
  const kept: T[] = []

  for (const page of pages) {
    if (seen.has(page.slug)) {
      duplicates.push(page.slug)
      const warn =
        onDuplicate ??
        ((slug: string) => {
          console.warn(`[SEO] Duplicate slug skipped: "${slug}" — only the first occurrence is used.`)
        })
      warn(page.slug)
      continue
    }
    seen.add(page.slug)
    kept.push(page)
  }

  return { pages: kept, duplicates }
}

export interface PageCountResult {
  count: number
  limit: number
  exceeded: boolean
}

/**
 * Advisory only. Production does not fail the build when the catalog is large.
 * The comment on the tool registry asks for a manual review above 500 pages.
 */
export function assessPageCount(count: number, limit = 500): PageCountResult {
  return { count, limit, exceeded: count > limit }
}

export function warnIfPageCountExceeded(
  count: number,
  limit = 500,
  onWarn?: (message: string) => void,
): PageCountResult {
  const result = assessPageCount(count, limit)
  if (result.exceeded) {
    const message =
      `[SEO] Page count (${count}) exceeds the ${limit}-page advisory limit. ` +
      `Review for thin-content risk before deploying additional pages.`
    if (onWarn) onWarn(message)
    else console.warn(message)
  }
  return result
}
