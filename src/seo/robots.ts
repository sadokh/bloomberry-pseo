import { canonical } from './canonical.ts'
import type { RobotsPolicy } from '../types.ts'

/**
 * User-agents listed in production app/robots.ts. Named agents override "*"
 * (RFC 9309), so private-path disallows have to be repeated on each one.
 */
export const PRODUCTION_ROBOTS_USER_AGENTS = [
  '*',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'Googlebot',
  'Bingbot',
]

export function buildRobotsPolicy(options: {
  siteUrl: string
  sitemapPaths: string[]
  disallowPaths: string[]
  userAgents?: string[]
}): RobotsPolicy {
  const userAgents = options.userAgents ?? PRODUCTION_ROBOTS_USER_AGENTS
  const site = { siteUrl: options.siteUrl.replace(/\/+$/, '') }
  return {
    rules: userAgents.map((userAgent) => ({
      userAgent,
      allow: '/',
      disallow: [...options.disallowPaths],
    })),
    sitemap: options.sitemapPaths.map((path) => canonical(site, path)),
  }
}

export function renderRobotsTxt(policy: RobotsPolicy): string {
  const groups = policy.rules.map((rule) => {
    const lines = [`User-agent: ${rule.userAgent}`, `Allow: ${rule.allow}`]
    for (const path of rule.disallow) lines.push(`Disallow: ${path}`)
    return lines.join('\n')
  })
  const sitemaps = policy.sitemap.map((url) => `Sitemap: ${url}`)
  return `${groups.join('\n\n')}\n\n${sitemaps.join('\n')}\n`
}
