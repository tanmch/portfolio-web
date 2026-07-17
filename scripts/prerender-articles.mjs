/**
 * scripts/prerender-articles.mjs
 * Prerender SEO: dist/articles/<id>/index.html per artikel + dist/sitemap.xml.
 * Dijalankan SETELAH `vite build` (memakai dist/index.html sebagai templat
 * agar tag aset ber-hash dan meta CSP ikut terbawa).
 *
 * Kenapa perlu: situs ini SPA di GitHub Pages — tanpa file statis per
 * artikel, URL /articles/<id> dilayani lewat trik 404.html (status HTTP 404)
 * sehingga mesin pencari menolak mengindeksnya. Dengan prerender, crawler
 * menerima HTML 200 lengkap (judul, deskripsi, canonical, Open Graph,
 * JSON-LD, isi artikel) tanpa butuh JavaScript.
 *
 * Pengunjung manusia tetap mendapat pengalaman desktop: templat memuat
 * bundle SPA, dan src/main.js menghapus blok #prerender saat app boot.
 *
 * Sumber data: public/data/articles.json (artikel Supabase yang belum
 * di-export ke JSON tidak ikut — alur SEO = Export articles.json → commit).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { JSDOM } from 'jsdom'
import createDOMPurify from 'dompurify'
import { safeLinkUrl, safeImageUrl } from '../src/lib/security/url.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const { SITE_URL, SITE_TITLE } = await import(
  new URL('../src/lib/data/config.js', import.meta.url)
)
const site = SITE_URL.replace(/\/+$/, '')

/* ---------- sanitasi (cermin src/lib/security/sanitize.js, versi Node) ---------- */

const { window } = new JSDOM('')
const DOMPurify = createDOMPurify(window)
const URL_ATTRS = ['href', 'src', 'xlink:href', 'action', 'formaction', 'background']

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!node.hasAttribute) return
  for (const attr of URL_ATTRS) {
    if (!node.hasAttribute(attr)) continue
    const value = node.getAttribute(attr)
    if (!safeLinkUrl(value) && !safeImageUrl(value)) node.removeAttribute(attr)
  }
})

const sanitizeHtml = (dirty) =>
  DOMPurify.sanitize(dirty ?? '', { FORBID_TAGS: ['style', 'form'] })

if (!DOMPurify.isSupported) {
  console.error('[prerender] DOMPurify tidak jalan di lingkungan ini — batal demi keamanan.')
  process.exit(1)
}

/* ---------- data & templat ---------- */

const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

let template
try {
  template = readFileSync(join(DIST, 'index.html'), 'utf8')
} catch {
  console.error('[prerender] dist/index.html tidak ada — jalankan `vite build` dulu.')
  process.exit(1)
}

let articles = []
try {
  articles = JSON.parse(readFileSync(join(ROOT, 'public/data/articles.json'), 'utf8'))
} catch {
  console.warn('[prerender] public/data/articles.json tidak ditemukan — tidak ada yang di-prerender.')
}

const absolute = (u) => (u && u.startsWith('/') ? site + u : u || '')
const fmtTanggal = (iso) =>
  new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

/* ---------- halaman statis per artikel ---------- */

for (const a of articles) {
  const url = `${site}/articles/${encodeURIComponent(a.id)}/`
  const desc = a.excerpt || a.title
  const cover = safeImageUrl(a.cover) ? absolute(a.cover) : ''
  const body = sanitizeHtml(a.html)

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: desc,
    datePublished: a.created,
    dateModified: a.updated || a.created,
    ...(cover ? { image: cover } : {}),
    mainEntityOfPage: url,
  })

  const head = `  <title>${esc(a.title)} | ${esc(SITE_TITLE)}</title>
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${esc(a.title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  ${cover ? `<meta property="og:image" content="${esc(cover)}">\n  ` : ''}<meta name="twitter:card" content="${cover ? 'summary_large_image' : 'summary'}">
  <script type="application/ld+json">${jsonLd}</script>
`

  // Konten untuk crawler tanpa JS; dihapus oleh src/main.js saat SPA boot.
  const prerender = `<main id="prerender" style="max-width:760px;margin:2rem auto;padding:0 1rem;font-family:Georgia,serif;line-height:1.7;">
<article>
<h1>${esc(a.title)}</h1>
<p><em>Ditulis ${fmtTanggal(a.created)}${a.updated && a.updated !== a.created ? ` · diperbarui ${fmtTanggal(a.updated)}` : ''}</em></p>
${body}
<hr>
<p><a href="${site}/articles">← Semua artikel di ${esc(SITE_TITLE)}</a></p>
</article>
</main>
`

  const html = template
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}">`)
    .replace('</head>', head + '</head>')
    .replace('<body>', '<body>\n' + prerender)

  const dir = join(DIST, 'articles', a.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
}

/* ---------- sitemap.xml ---------- */

const staticPages = ['', 'about', 'projects', 'articles']
const urls = [
  ...staticPages.map((p) => `  <url><loc>${site}/${p}</loc></url>`),
  ...articles.map(
    (a) =>
      `  <url><loc>${site}/articles/${encodeURIComponent(a.id)}/</loc><lastmod>${new Date(a.updated || a.created).toISOString().slice(0, 10)}</lastmod></url>`
  ),
].join('\n')

writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
)

console.log(`[prerender] ${articles.length} artikel → dist/articles/*/index.html + dist/sitemap.xml`)
