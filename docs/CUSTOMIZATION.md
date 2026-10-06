# Customization

Configure the site once. Then replace the catalog, the content, the link rules, and the indexation lists. You do not need a new abstraction for each of those. They are data.

## Site

```ts
import { defineConfig } from 'bloomberry-pseo'

const config = defineConfig({
  siteUrl: 'https://example.com',
  siteName: 'Example',
  routePrefix: '/compare', // production tool pages use '/tools'
})
```

Useful overrides:

| Option | Production value | What it changes |
| --- | --- | --- |
| `pageCountLimit` | 500 | Advisory warning only |
| `metaDescriptionMaxLength` | 160 | Warning, and the cut applied to expanded descriptions |
| `toolClaimPatterns` | generator, tool, scheduler, planner, rewriter, guide, playbook, strategy, how-to | Which slugs must have authored content before they can be indexed |
| `maxRelatedLinks` | 4 | Cap on fallback related links. Prefix-specific lists are not capped |
| `noindexAllLocalePages` | true | Suppress every non-default locale |
| `defaultLocale` | `en` | Unprefixed locale |
| `defaultPlatformLabel` | `LinkedIn` | Label used when a record has no `platform` |
| `differentiator` | voice-profile sentence | Second sentence of the fallback "what is this?" FAQ |
| `schema.offers` | `{ price: '0', priceCurrency: 'USD' }` | Offer node on `SoftwareApplication`. Pass `null` to omit it |
| `sectionLabel` | `Tools` | Breadcrumb label. Defaults to the route prefix |

## Your data

A page is a `PageDefinition`. Put the records in a JSON file or a TypeScript module, then:

```ts
const registry = createRegistry(pages, config)
const page = registry.find('your-slug')
```

The first record for a slug is kept. Later copies are reported on `registry.duplicates` and skipped.

Content is a separate object keyed by slug. Pass it as `content` to `generatePage()`. Omit it and the fallback template runs. Indexable slugs that match `toolClaimPatterns` fail `validateCatalog` when they are still on the fallback. That is the production rule: a URL that claims to be a guide or a tool needs a real body, or it stays out of the index.

`examples/basic/dataset.json` is a complete catalog. Copy it and replace the records.

## Your templates

Fallback how-it-works steps are chosen by slug pattern. The order is fixed and matches production (`selectHowItWorks`). The sentences are not. Pass your own lists:

```ts
generatePage({
  definition,
  config,
  howItWorks: {
    default: [/* 3 steps */],
    thread: [/* ... */],
    linkedin: [/* ... */],
    repurpose: [/* ... */],
    hook: [/* ... */],
    style: [/* ... */],
  },
})
```

`examples/bloomberry/sample.ts` exports the Bloomberry step copy. The CRM example leaves the generic steps in place for pages that have no authored body, and those pages are noindexed.

Keyword expansion meta descriptions are a function. Production's sentence mentions voice personalisation. The package default does not. Pass `metaDescription` to `generateKeywordExpansions()` if you want the production sentence (`bloomberryExpansionMeta` in the Bloomberry sample) or your own.

Pass `titleLeadPattern: /^(AI |LinkedIn |Write )/` to keep production title behavior: only titles that already start with those words get the modifier, and other titles stay as they are. Omit the pattern and the modifier is prepended.

Expansions are returned to you. Merge them into the registry yourself, after you have read them.

## Your routes

`routePrefix` is the path segment in front of the slug. Production uses `/tools` for the tool registry and `/examples` for the example registry. Use two configs, or call `pagePath` / `collectSitemapEntries` with the prefix you want, if you have both.

Locale URLs are `/{locale}{routePrefix}/{slug}`. The default locale has no prefix.

Hreflang needs an explicit slug map (`buildHreflangMap`). The badge/platform fallback (`buildFallbackHreflang`) exists because the locale route uses it when a slug has no map row. Prefer the map.

Robots disallows are yours. Production's private prefixes are in `examples/bloomberry/sample.ts` as `BLOOMBERRY_DISALLOW_PATHS`. Do not copy them unless your app uses those paths. Named crawlers need the same disallow list as `*`.

## Indexation

```ts
const policy = {
  noindexSlugs: ['crm-implementation-guide'],
  redirects: { 'best-startup-crm': '/compare/best-crm-for-startups' },
  noindexAllLocalePages: true,
}
```

Redirect targets should be indexable. `validateCatalog` errors when a target under `routePrefix` is also noindexed.

`genericFaqSlugs` is optional. It is the historical list of pages that shipped on the generic FAQ fallback. Pass it if you want that regression check. A new site can pass nothing and rely on the tool-claim check.

Canonical overrides are a property of the page, not of the policy.

## Internal links

Fallback links come from `LinkRules`:

- `prefixSets` — returned in full, minus self. Production uses this for `write-like-`.
- `groups` — chosen by `classify`, or by `inferToolLinkGroup` if you omit it. Sliced to `max` (default 4).
- `getClusterSiblings` — a separate map from slug to neighbors. Unknown slugs get no links.
- `missingInternalLinkSlots` — checks the blog rule (one tool URL, one article, one homepage section). Production states that rule in a comment and does not fail the build on it.

Write related links on the content object when the neighborhood is specific. Use the rules for the fallback only.
