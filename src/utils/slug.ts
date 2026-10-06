/**
 * Blog category slugs use this helper. Tool and example slugs in production
 * are hand-authored; this is not applied to them automatically.
 *
 * "Best CRM for Startups" → "best-crm-for-startups"
 * Punctuation is stripped, not turned into a word boundary beyond existing spaces.
 */
export function slugify(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

/** Inverse of slugify for display labels. Not used for canonical URLs. */
export function unslugify(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
