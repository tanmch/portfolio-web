/**
 * scripts/generate-rss.mjs
 * Membuat public/feed.xml dari public/data/articles.json.
 * Dijalankan otomatis saat `npm run build` (prebuild) atau manual: `npm run rss`.
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { SITE_URL, SITE_TITLE, SITE_DESC } = await import(
  new URL('../src/lib/data/config.js', import.meta.url)
)

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

let articles = []
try {
  articles = JSON.parse(readFileSync(join(ROOT, 'public/data/articles.json'), 'utf8'))
} catch {
  console.warn('[rss] public/data/articles.json tidak ditemukan — feed kosong.')
}

const site = SITE_URL.replace(/\/+$/, '')
const items = [...articles]
  .sort((a, b) => new Date(b.created) - new Date(a.created))
  .map((a) => {
    const link = `${site}/articles/${encodeURIComponent(a.id)}`
    const cover = a.cover
      ? `\n      <enclosure url="${esc(a.cover.startsWith('http') ? a.cover : site + a.cover)}" type="image/png" length="0"/>`
      : ''
    return `    <item>
      <title>${esc(a.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(a.created).toUTCString()}</pubDate>
      <description>${esc(a.excerpt || '')}</description>${cover}
    </item>`
  })
  .join('\n')

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_TITLE)}</title>
    <link>${site}/articles</link>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${esc(SITE_DESC)}</description>
    <language>id</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`

writeFileSync(join(ROOT, 'public/feed.xml'), feed)
console.log(`[rss] public/feed.xml dibuat — ${articles.length} artikel.`)
