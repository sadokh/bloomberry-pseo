# Bloomberry pSEO

Bloomberry pSEO is the static programmatic SEO engine we use to turn page records into indexable pages, metadata, structured data, related links, and sitemap entries.

No model calls. No database. No CMS required.

You pass in typed page records. The engine returns the page data your site renders, and the URLs that are safe to put in a sitemap.

```
INPUT
typed page records

ENGINE
dedupe → fallback content → indexation policy → metadata / schema → related links

OUTPUT
render-ready page data + sitemap-safe URLs
```

```ts
import {
  collectSitemapEntries,
  createRegistry,
  defineConfig,
  generatePage,
  normalizePolicy,
  validateCatalog,
} from 'bloomberry-pseo'

const config = defineConfig({
  siteUrl: 'https://example.com',
  siteName: 'Example',
  routePrefix: '/compare',
})

const records = [
  {
    slug: 'best-crm-for-startups',
    badge: 'Startup CRM',
    title: 'Best CRM for Startups',
    metaDescription: 'How a startup should pick a CRM before the spreadsheet breaks.',
    headline: 'Best CRM for startups',
    subheadline: 'Two people need the same deal history.',
    composerPlaceholder: 'Ten open deals live in three spreadsheets',
    keyword: 'best crm for startups',
  },
  {
    slug: 'crm-vs-spreadsheets',
    badge: 'Comparison',
    title: 'CRM vs Spreadsheets',
    metaDescription: 'Stay on a sheet while one person owns every deal.',
    headline: 'CRM vs spreadsheets',
    subheadline: 'The sheet works until a second person has to trust it.',
    composerPlaceholder: 'Two founders overwrite the same notes',
    keyword: 'crm vs spreadsheets',
  },
]

const registry = createRegistry(records, config)
const policy = normalizePolicy({ noindexSlugs: [], redirects: {} }, config)

const generated = generatePage({
  definition: registry.pages[0],
  config,
  policy,
  content: {
    examples: [],
    howItWorks: [{ step: '1', description: 'List the deals that are actually open.' }],
    faqs: [{ question: 'When do we need a CRM?', answer: 'When a second person edits the notes.' }],
    relatedPages: [{ label: 'CRM vs spreadsheets', href: '/compare/crm-vs-spreadsheets' }],
  },
})

const sitemap = collectSitemapEntries(registry.pages, config, policy)

validateCatalog({
  pages: registry.pages,
  customContentSlugs: ['best-crm-for-startups'],
  policy,
  config,
})
```

`generated.page` is what you render. `generated.metadata` and `generated.structuredData` are the head and JSON-LD. `sitemap` is the URL list. `validateCatalog` reports duplicate slugs, a redirect into a noindexed URL, and an indexable guide/tool slug that still uses fallback content.

Omit `content` and `generatePage` fills a fallback from the keyword. That fallback can render. The thin-page check keeps it out of the index when the slug claims to be a guide or a tool.

### What it does

Page records are the catalog. Each record has a slug, a keyword, a title, a description, and the body fields your template reads. `createRegistry` keeps the first copy of a slug. `generatePage` attaches authored content or the fallback, applies the indexation policy, and builds metadata, JSON-LD, and related links. `collectSitemapEntries` returns only the URLs the policy allows.

Bloomberry renders the result as static Next.js routes. This package is the engine those routes call. Your template is your own.

### Why we built it

Bloomberry has a few hundred programmatic URLs: tool pages, example pages, and locale variants. They are TypeScript records compiled into the site. Indexation rules noindex or redirect slugs that repeat the same query, or that still use the generic fallback. This repository is that engine, split out so the live catalog and the Next.js app can stay private.

### Features

- Page registry with first-slug-wins dedupe, and a warning when the catalog grows past 500 pages
- Authored content, or a fallback template that interpolates the keyword
- Titles, meta descriptions, canonicals, Open Graph, and Twitter metadata
- JSON-LD for `SoftwareApplication`, `BreadcrumbList`, and `FAQPage`
- Noindex, 308 redirect targets, and canonical overrides
- Sitemaps that omit noindex URLs, redirects, canonical overrides, and suppressed locale pages
- Related links, cluster siblings, and hreflang from an explicit locale slug map
- Thin-page check: an indexable slug that claims to be a guide or a tool, and still uses fallback content, fails catalog validation
- Indexation safety check: a redirect whose target is also noindexed fails catalog validation
- Opt-in keyword expansions that are returned to you and not merged into the catalog
- Robots rules that repeat private-path disallows for named crawlers

### Quick start

From the repository root. Node 20 or newer.

```bash
npm install
npm test
npm run example
```

The example is a fictional CRM catalog. It prints a page object, the URLs that belong in the sitemap, and a guide slug that catalog validation refuses to index until you noindex it.

### Architecture

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the production path from the registries to the sitemap. A page record is a `PageDefinition`: slug, badge, title, meta description, headline, subheadline, composer placeholder, and keyword.

### Customizing it

[docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md) covers your records, fallback templates, route prefix, locale slugs, robots disallows, and the noindex / redirect lists.

[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) shows how Bloomberry static-renders the records and how to hook `generatePage` into a sitemap response.

`examples/basic/` is the CRM catalog (`npm run example`). `examples/bloomberry/` is the production configuration: site origin, `/tools` prefix, step copy, and a sample of the policy shape. The live catalog stays in the Bloomberry app.

### Production lessons

These are the rules the Bloomberry records and checks already follow.

- **One URL per intent.** The same slug is kept once. Near-duplicate queries redirect to one URL. A canonical override keeps a second URL out of the sitemap.
- **Tool-claim slugs need a real body.** An indexable slug that claims to be a generator, tool, guide, or similar, and has no authored content, fails the thin-page check. Custom FAQs do not override that.
- **The fallback is for rendering.** Write the examples and the steps, or noindex the URL.
- **Links are explicit.** Related links are a list you provide, capped, and a page does not link to itself. An unknown cluster slug gets no siblings.
- **The sitemap follows the policy.** Noindex, redirects, and canonical overrides are filtered again when the sitemap is built. Locale copies stay noindexed until the body is localized. A redirect must not land on a noindexed URL.
- **Volume is an operating limit.** The registry warns above 500 pages. Expansions are opt-in. The source comments ask for a small batch of new URLs per deployment.

### Roadmap

- Next.js starter example
- External catalog loaders
- Additional framework integrations

### Contributing

Open an issue or a pull request. Keep changes small and tied to behavior the engine already has. Add a test when you change slug handling, metadata, dedupe, link selection, or catalog validation.

Run `npm test` and `npm run example` before you push.

### License

MIT. See [LICENSE](LICENSE).
