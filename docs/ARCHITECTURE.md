# Architecture

This is the programmatic SEO system Bloomberry runs in production, and the part of it this package extracts.

A page is a typed record. Next.js pre-renders a route for every record at build time. Catalog validation decides which of those URLs are safe to index. The source of truth is `lib/seo/` plus the App Router files that read it. `dashboard/lib/seo/` is a copy of the same files.

## Pipeline

```
Page records (toolPages.ts, examplePages.ts)
        ↓
dedupe by slug, warn if the catalog is over 500
        ↓
Authored content, or the fallback template
        ↓
Indexation policy (noindex, redirect, canonical override)
        ↓
Metadata, canonical, hreflang
        ↓
JSON-LD (SoftwareApplication, BreadcrumbList, FAQPage)
        ↓
Related links
        ↓
Static HTML route
        ↓
Sitemap, only for URLs the policy allows
```

Keyword expansion sits beside this pipeline. It can propose new records. It does not publish them.

## 1. Page records

`lib/seo/toolPages.ts` exports `TOOL_PAGES`. Each `ToolPage` has:

- `slug`, `badge`, `title`, `metaDescription`, `headline`, `subheadline`
- `composerPlaceholder` — seed text for examples. It is not rendered as a live composer.
- `keyword`
- optional `platform` (`linkedin`, `x`, or `blog`)
- optional `canonicalOverride` — an absolute URL when a stronger page already owns the query

There are 99 English tool records. Slugs are written by hand. The blog category helper `slugify()` is a separate function and is not applied to these records.

`lib/seo/examplePages.ts` is a second registry: 5 pages at `/examples/{slug}`. Each one points at a related tool slug. Adding a record publishes the page and adds it to `sitemap-examples.xml`.

`validatePageCount()` warns above 500 pages and does not fail the build. The file comment above the registry asks for no more than 25 new pages in a deployment. That limit is an operating rule, not an enforced cap.

## 2. Dedupe

`dedupeKeywords()` keeps the first record for each slug and warns about the rest. `TOOL_PAGES` is the deduped array. `findToolPage(slug)` is a linear scan of that array.

## 3. Content

`lib/seo/toolContentGenerator.ts` holds `TOOL_CONTENT`, keyed by slug. Eleven slugs have an authored entry. An entry can include examples, how-it-works steps, FAQs, related links, a definition, capabilities, a problem list, and a comparison table.

Examples live in `toolExamples.ts` (74 slugs). FAQs live in `toolFaqs.ts` (99 slugs). The authored entries read from those banks.

Every other slug goes through `getDefaultContent()`:

1. Use the example bank for that slug, or one placeholder example built from `composerPlaceholder`.
2. Use the FAQ bank, or four generic questions that swap in the keyword and the platform label.
3. Pick a how-it-works list from the slug:
   - `write-like-` → style steps
   - contains `thread` → thread steps
   - contains `linkedin` → LinkedIn steps
   - contains `repurpos`, `blog-to`, `podcast-to`, or `thread-to` → repurpose steps
   - contains `hook` or `opening-line` → hook steps
   - otherwise the default steps

`thread` is tested before `thread-to`, so a slug that contains both gets the thread steps. The repurpose branch still mentions `thread-to` because that is what the source writes.

Missing `platform` is treated as LinkedIn.

`buildRelatedPages()` fills related links only for this fallback. Authored entries bring their own links.

## 4. Indexation

`lib/seo/indexationPolicy.ts` is the list of URLs that must not be indexed.

- 44 tool slugs are noindexed. They still render. `robots` is `index: false, follow: true`. They are omitted from sitemaps.
- 26 tool slugs 308-redirect to a stronger URL. Metadata canonical points at the target. They are omitted from sitemaps. JSON-LD is not rendered, because the redirect happens first.
- A `canonicalOverride` does not noindex the page. It does remove the page from the tool sitemap, because another URL is the one that should be submitted.
- `/docs` is a noindexed static route.
- Seven `/features/*` paths redirect and must not appear in the pages sitemap.
- `NOINDEX_ALL_LOCALE_TOOL_PAGES` is `true`. All non-English tool pages are noindexed and left out of locale sitemaps until they have real localized content. There are 33 tool records in each of es, fr, de, and pt (132 locale URLs).

`shouldIncludeToolInSitemap(slug, canonicalOverride)` is the check the tool sitemap calls.

A redirect whose target is also noindexed is a quality-gate failure. The gate only applies that check to targets shaped like `/tools/{slug}`. A redirect to a root path such as `/ai-hook-generator` is not compared against the tool noindex set.

## 5. Render

`app/tools/[slug]/page.tsx`:

- `dynamic = 'force-static'`
- `generateStaticParams()` maps `TOOL_PAGES` to `{ slug }`
- `generateMetadata()` implements the indexation rules above
- Indexable pages get `title`, `description`, Open Graph, Twitter `summary_large_image`, and a canonical
- Noindex and redirect pages set `robots` and a canonical, and omit the description
- The page component calls `permanentRedirect()` for redirect slugs, then renders `SEOFeaturePage`

JSON-LD on the tool route:

- `SoftwareApplication` (BusinessApplication, Web, Offer price `"0"` USD)
- `BreadcrumbList` (Home → Tools → headline)

`SEOFeaturePage` adds `FAQPage` JSON-LD from the FAQs that are visible on the page. The questions in the schema are the questions on the page.

`app/examples/[slug]/page.tsx` is the same idea for the example registry: static params, metadata, canonical, and the examples/FAQ banks. It does not consult the tool noindex set.

`app/[locale]/tools/[slug]/page.tsx` serves es, fr, de, and pt. While the locale flag is on, metadata is noindex and the description is omitted. When the flag is off, hreflang comes from `buildHreflangMap()`. If the slug has no row in `SLUG_MAPPING`, the route falls back to linking locale pages that share a badge or a platform. There are 33 explicit English-to-locale slug rows.

English URLs have no locale prefix. Other locales are `/{locale}/tools/{slug}`.

## 6. Internal links

Three mechanisms, used for different page types:

- **Related links on a tool page.** Authored list, or `buildRelatedPages()`. The fallback classifies the slug, not `page.platform`. `linkedin` in the slug wins; otherwise `tweet`, `twitter`, `thread`, or `x-` maps to the X group; everything else maps to LinkedIn. The `blog` group exists in the source map and is never selected. Group matches are filtered so a page does not link to itself, then sliced to 4. Slugs starting with `write-like-` use a separate list that is not sliced.
- **Cluster siblings.** `lib/landingPageClusters.ts` maps a slug or pathname to an ordered list. Unknown slugs return nothing. `getClusterSiblings()` slices to 5. `SEOFeaturePage` calls this from the current pathname.
- **Blog link maps.** `lib/seo/blogInternalLinks.ts` maps an article slug to tool paths, other article slugs, and a homepage anchor. The file comment requires at least one of each. Nothing in the build fails if a row is short.

`lib/seo/blogClusters.ts` and `lib/seo/contentLibrary.ts` are planning lists in the Bloomberry app. No page reads them at render time.

## 7. Sitemaps and robots

`app/sitemap.xml/route.ts` returns a sitemap index. Child sitemaps:

- `/sitemap-pages.xml` — hand-listed marketing URLs. Redirecting and noindexed routes are left out.
- `/sitemap-tools.xml` — English tool pages that pass `shouldIncludeToolInSitemap`. Weekly, priority 0.7. Locale tool URLs are included only when the locale flag is off, at priority 0.6.
- `/sitemap-examples.xml` — every example page. Monthly, priority 0.8.
- `/sitemap-blog.xml` — MDX posts.
- `/sitemap-es.xml`, `fr`, `de`, `pt` — locale tool pages through `shouldIncludeLocaleToolInSitemap`.

Responses set `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`. The route comments say not to set `Content-Encoding` in the handler. The host compresses the body.

`app/robots.ts` allows `/` and disallows private app prefixes (`/api/`, `/dashboard/`, `/writer/`, and the rest of that list). The same disallow list is repeated for GPTBot, OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Googlebot, and Bingbot, because a named user-agent rule replaces the `*` rule.

Canonicals are built by `lib/seo/canonical.ts`. The site origin is `https://www.bloomberry.ai`. `localizedCanonical()` leaves English unprefixed.

## 8. Publishing and checks

Publishing a tool page means adding the record and shipping a build.

The Bloomberry app runs `scripts/seo-quality-gate.ts` (`npm run seo:gate`). It exits non-zero when:

1. An indexable slug contains `generator`, `tool`, `scheduler`, `planner`, `rewriter`, `guide`, `playbook`, `strategy`, or `how-to`, and it has no `TOOL_CONTENT` entry. A canonical override, a noindex entry, or a redirect removes it from this check. Custom FAQs do not save it.
2. The same set is non-empty (reported again as a count).
3. A slug on the historical generic-FAQ list is still indexable.
4. The tool sitemap source does not reference `shouldIncludeToolInSitemap`.
5. `/docs` is still submitted in the pages sitemap.
6. The locale route does not reference `NOINDEX_ALL_LOCALE_TOOL_PAGES`.
7. `composerPlaceholder` reappears as a prop on the UI components.
8. A `/tools/{slug}` redirect target is also noindexed.
9. A `/features/*` page still canonicals to itself.
10. The dynamic updates route does not skip slugs that have their own static page.
11. Auth layouts do not set `index: false`.

`scripts/seo-thin-content-audit.ts` (`npm run seo:audit`) writes a per-URL report. It does not block the build. `validateCatalog()` in this package covers the record checks above (thin-page claims, the generic-FAQ list, and redirects into a noindexed slug). The checks that read Next.js source files stay in the app.

## 9. What stays in the Bloomberry app

- The Next.js routes and `SEOFeaturePage`
- The 99-page catalog, the FAQ and example banks, and the full noindex list
- Blog posts, which are MDX files. A `programmatic` flag in frontmatter is a marker, not a generator
- `seo-quality-gate` checks that parse source files: sitemap wiring, `/docs` in the pages sitemap, `composerPlaceholder` on UI components, self-canonicals, duplicate update routes, and auth-layout robots
- The Google sitemap ping route. That endpoint is deprecated, so it is not in this package

## What this package keeps

| Production | Package |
| --- | --- |
| `ToolPage` and example records | `PageDefinition` |
| `dedupeKeywords`, `validatePageCount` | `dedupePages`, `assessPageCount`, `createRegistry` |
| `getDefaultContent`, how-it-works slug order | `getDefaultContent`, `selectHowItWorks` |
| `generateKeywordExpansions` | `generateKeywordExpansions` (not auto-merged) |
| `generateMetadata` | `buildMetadata` |
| JSON-LD on the tool route and FAQ block | `buildStructuredData` |
| Indexation helpers | `decideIndexation`, `shouldIncludeInSitemap` |
| Record checks from `scripts/seo-quality-gate.ts` | `validateCatalog` |
| Sitemap XML | `renderUrlSet`, `renderSitemapIndex`, `collectSitemapEntries` |
| `robots.ts` | `buildRobotsPolicy` |
| Related links, clusters, hreflang, blog link shape | `buildRelatedPages`, `getClusterSiblings`, `buildHreflangMap`, `missingInternalLinkSlots` |
| `canonical`, `slugify`, locale prefix | same behavior, origin and prefix come from config |

`examples/bloomberry/` shows the production wiring with a few public URL shapes. `examples/basic/` is a fictional CRM catalog you can run.
