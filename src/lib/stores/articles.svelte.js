/**
 * articles.svelte.js — model artikel dua lapis:
 *
 *  1) SHIPPED  : artikel TERPUBLIKASI yang dilihat semua pengunjung.
 *                Sumber utama: tabel `articles` di Supabase (bila
 *                dikonfigurasi); fallback: public/data/articles.json.
 *  2) LOCAL    : draft & suntingan pemilik di localStorage browser
 *                (cache lokal; pada mode Supabase juga disinkronkan ke DB).
 *
 * Mode Supabase: Save/Publish/Hapus oleh pemilik langsung ditulis ke
 * database (dijaga Row Level Security — hanya sesi terotentikasi yang
 * boleh menulis). Mode legacy: alur lama Export articles.json → commit.
 *
 * KEAMANAN (SEC-01/SEC-09): semua HTML artikel disanitasi dengan
 * DOMPurify saat disimpan DAN saat dirender ({@html} di ArticlesApp).
 *
 * Bentuk artikel:
 * { id, title, html, cover, excerpt, created, updated, published? }
 */
import { supabase, supabaseEnabled } from '../supabaseClient.js'
import { sanitizeHtml } from '../security/sanitize.js'
import { storeDataUrl } from '../images.js'

const KEY = 'w95-articles'
const BASE = import.meta.env.BASE_URL || '/'

/** Validasi bentuk item dari sumber tak-tepercaya (localStorage/DB/JSON). */
function isArticleShape(a) {
  return (
    a && typeof a === 'object' &&
    typeof a.id === 'string' &&
    typeof a.title === 'string' &&
    typeof a.html === 'string'
  )
}

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(isArticleShape) : []
  } catch {
    return []
  }
}

export const articleStore = $state({
  shipped: [],        // terpublikasi (Supabase / articles.json)
  shippedLoaded: false,
  local: load(),      // draft + suntingan pemilik (localStorage)
  editRequest: null,  // id yang diminta dibuka di Article Writer
  openRequest: null,  // id yang diminta dibuka di My Articles (deep-link)
  readingId: null,    // id yang sedang dibaca (dipakai App.svelte untuk URL share)
  dbError: null,      // pesan error sinkronisasi Supabase terakhir
})

/** true bila artikel disimpan di database (bukan alur commit-JSON). */
export const articlesUseDb = supabaseEnabled

function rowToArticle(r) {
  return {
    id: String(r.id),
    title: String(r.title ?? 'Untitled'),
    html: String(r.html ?? ''),
    cover: String(r.cover ?? ''),
    excerpt: String(r.excerpt ?? ''),
    created: r.created ?? new Date().toISOString(),
    updated: r.updated ?? r.created ?? new Date().toISOString(),
    published: !!r.published,
  }
}

/** Gabungkan draft dari DB ke cache lokal (versi ber-`updated` terbaru menang). */
function mergeDbDrafts(drafts) {
  let changed = false
  for (const d of drafts) {
    const idx = articleStore.local.findIndex((a) => a.id === d.id)
    if (idx === -1) {
      articleStore.local = [...articleStore.local, d]
      changed = true
    } else if (new Date(d.updated) > new Date(articleStore.local[idx].updated)) {
      articleStore.local[idx] = d
      changed = true
    }
  }
  if (changed) persist()
}

/** Muat daftar terpublikasi (sekali; aman dipanggil berulang). */
export async function loadShipped() {
  if (articleStore.shippedLoaded) return

  if (supabaseEnabled) {
    try {
      // RLS: anonim hanya menerima published; pemilik login menerima semua.
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('created', { ascending: false })
      if (error) throw error
      const rows = (data || []).filter(isArticleShape).map(rowToArticle)
      articleStore.shipped = rows.filter((r) => r.published)
      mergeDbDrafts(rows.filter((r) => !r.published))
      articleStore.shippedLoaded = true
      return
    } catch {
      /* DB tidak terjangkau → fallback ke JSON repo di bawah */
    }
  }

  try {
    const res = await fetch(`${BASE}data/articles.json`, { cache: 'no-cache' })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) articleStore.shipped = data.filter(isArticleShape)
    }
  } catch {
    /* offline / belum ada file — biarkan kosong */
  }
  articleStore.shippedLoaded = true
}

/** Paksa muat ulang dari sumber (dipanggil saat login/logout). */
export function refreshArticles() {
  articleStore.shippedLoaded = false
  return loadShipped()
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(articleStore.local)) } catch { /* penuh */ }
}

/* ---------- sinkronisasi Supabase ---------- */

/**
 * Jalankan operasi DB hanya bila ada sesi login yang sah — tanpa sesi,
 * request tulis tidak pernah dikirim (RLS di server tetap lapis utama).
 */
async function withSession(fn) {
  if (!supabaseEnabled) return
  const { data } = await supabase.auth.getSession()
  if (!data?.session) return
  return fn()
}

/**
 * Batas data — SINKRON dengan CHECK constraint di supabase/schema.sql.
 * Diperiksa di klien supaya gagal dengan pesan jelas, bukan 400 dari server.
 */
const DB_LIMITS = { html: 4_000_000, cover: 2_000_000, excerpt: 1000, title: 300 }

function dbLimitError(a) {
  if (a.html.length > DB_LIMITS.html)
    return `Isi artikel terlalu besar (${(a.html.length / 1e6).toFixed(1)}MB > 4MB) — biasanya karena gambar base64 lama. Coba Save lagi setelah online/login agar gambar dimigrasikan, atau hapus & sisipkan ulang gambar besar.`
  if (a.cover.length > DB_LIMITS.cover)
    return 'Cover terlalu besar — pasang ulang lewat tombol "📁 Pilih…" di baris Thumbnail.'
  if (a.excerpt.length > DB_LIMITS.excerpt || a.title.length > DB_LIMITS.title)
    return 'Judul/ringkasan melebihi batas panjang.'
  return null
}

/**
 * Migrasi gambar base64 di html & cover → Supabase Storage (URL pendek).
 * Membersihkan artikel lama yang dibuat sebelum pipeline upload ada.
 * Mutasi diterapkan kembali ke objek artikel + localStorage.
 */
async function migrateInlineImages(article) {
  const dataUrls = [...new Set(article.html.match(/data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+/gi) || [])]
  let { html, cover } = article
  let changed = false
  for (const dataUrl of dataUrls) {
    try {
      const url = await storeDataUrl(dataUrl, 'article')
      if (url) {
        html = html.split(dataUrl).join(url)
        changed = true
      }
    } catch { /* biarkan aslinya */ }
  }
  if (/^data:image\//i.test(cover)) {
    try {
      const url = await storeDataUrl(cover, 'cover')
      if (url) { cover = url; changed = true }
    } catch { /* biarkan aslinya */ }
  }
  if (changed) {
    article.html = html
    article.cover = cover
    persist()
  }
  return article
}

/** Tulis satu artikel ke DB (fire-and-forget; error dicatat di store). */
function dbUpsert(article) {
  withSession(async () => {
    const a = await migrateInlineImages(article)
    const limitErr = dbLimitError(a)
    if (limitErr) {
      articleStore.dbError = limitErr
      return
    }
    const { id, title, html, cover, excerpt, created, updated, published } = a
    const { error } = await supabase
      .from('articles')
      .upsert({ id, title, html, cover, excerpt, created, updated, published: !!published })
    if (error) {
      articleStore.dbError = error.message
      return
    }
    articleStore.dbError = null
    syncShippedWith(a)
  })
}

function dbDelete(id) {
  withSession(() =>
    supabase
      .from('articles')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          articleStore.dbError = error.message
          return
        }
        articleStore.dbError = null
        articleStore.shipped = articleStore.shipped.filter((a) => a.id !== id)
      })
  )
}

/** Setelah upsert sukses: cermin `shipped` mengikuti status published. */
function syncShippedWith(article) {
  const rest = articleStore.shipped.filter((a) => a.id !== article.id)
  articleStore.shipped = article.published ? [article, ...rest] : rest
}

/* ---------- turunan ---------- */

/** Artikel TERPUBLIKASI yang dilihat pengunjung: shipped, ditimpa versi lokal ber-flag published. */
export function publishedArticles() {
  const map = new Map(articleStore.shipped.map((a) => [a.id, a]))
  for (const a of articleStore.local) if (a.published) map.set(a.id, a)
  return [...map.values()].sort((x, y) => new Date(y.created) - new Date(x.created))
}

/** Draft milik pemilik (belum dipublikasikan). */
export function draftArticles() {
  return [...articleStore.local]
    .filter((a) => !a.published)
    .sort((x, y) => new Date(y.updated) - new Date(x.updated))
}

export function getArticle(id) {
  return (
    articleStore.local.find((a) => a.id === id) ||
    articleStore.shipped.find((a) => a.id === id) ||
    null
  )
}

/* ---------- util konten ---------- */

export function makeExcerpt(html, max = 160) {
  const text = new DOMParser()
    .parseFromString(html || '', 'text/html')
    .body.textContent.replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text
}

export function firstImage(html) {
  const img = new DOMParser().parseFromString(html || '', 'text/html').querySelector('img')
  return img?.getAttribute('src') || ''
}

/* ---------- CRUD ---------- */

export function saveArticle({ id, title, html, cover }) {
  const now = new Date().toISOString()
  const cleanHtml = sanitizeHtml(html) // SEC-01: jangan pernah simpan HTML kotor
  const excerpt = makeExcerpt(cleanHtml)
  const finalCover = (cover || '').trim() || firstImage(cleanHtml)
  // Batas sinkron dengan CHECK constraint di supabase/schema.sql —
  // gagal cepat di klien alih-alih ditolak server.
  title = (title || '').slice(0, 300)

  const idx = id ? articleStore.local.findIndex((a) => a.id === id) : -1
  if (idx !== -1) {
    articleStore.local[idx] = {
      ...articleStore.local[idx],
      title, html: cleanHtml, cover: finalCover, excerpt, updated: now,
    }
    persist()
    dbUpsert(articleStore.local[idx])
    return articleStore.local[idx]
  }

  // Menyunting artikel shipped? → buat salinan lokal ber-id sama (tetap published).
  const shipped = id ? articleStore.shipped.find((a) => a.id === id) : null
  const article = {
    id: id || uniqueSlugId(title),
    title: title || 'Untitled',
    html: cleanHtml,
    cover: finalCover,
    excerpt,
    created: shipped ? shipped.created : now,
    updated: now,
    published: shipped ? true : false,
  }
  articleStore.local = [article, ...articleStore.local]
  persist()
  dbUpsert(article)
  return article
}

export function publishArticle(id) {
  const a = articleStore.local.find((x) => x.id === id)
  if (a) { a.published = true; persist(); dbUpsert(a) }
  return a
}

export function unpublishArticle(id) {
  const a = articleStore.local.find((x) => x.id === id)
  if (a) { a.published = false; persist(); dbUpsert(a) }
}

/**
 * Hapus artikel. Mode legacy: hanya versi lokal (yang di repo hilang lewat
 * commit). Mode Supabase: baris di database ikut dihapus (untuk semua orang).
 */
export function deleteArticle(id) {
  articleStore.local = articleStore.local.filter((a) => a.id !== id)
  persist()
  dbDelete(id)
}

export function isShipped(id) {
  return articleStore.shipped.some((a) => a.id === id)
}

/* ---------- ekspor ---------- */

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Unduh articles.json final (untuk menggantikan public/data/articles.json di repo). */
export function exportPublishedJson() {
  const list = publishedArticles().map(({ published, ...rest }) => rest)
  download('articles.json', JSON.stringify(list, null, 2), 'application/json')
}

/** Ekspor 1 artikel sebagai file .html mandiri. */
export function exportArticleAsHtml(article) {
  const doc = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(article.title)}</title>
<style>
  body { max-width: 760px; margin: 2rem auto; padding: 0 1rem;
         font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; color: #1a1a1a; }
  h1.article-title { font-family: Verdana, Tahoma, sans-serif; }
  img { max-width: 100%; height: auto; }
  blockquote { border-left: 4px solid #000080; margin-left: 0; padding-left: 1rem; color: #444; }
  .article-meta { color: #777; font-size: .85rem; font-family: Verdana, sans-serif; }
</style>
</head>
<body>
<h1 class="article-title">${escapeHtml(article.title)}</h1>
<p class="article-meta">Ditulis: ${new Date(article.created).toLocaleString('id-ID')} · Diperbarui: ${new Date(article.updated).toLocaleString('id-ID')}</p>
<hr>
${sanitizeHtml(article.html)}
</body>
</html>`
  download(slugify(article.title) + '.html', doc, 'text/html;charset=utf-8')
}

function escapeHtml(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function slugify(s = 'artikel') {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'artikel'
}

/**
 * ID artikel baru = slug judul (URL enak dibaca: /articles/judul-artikel).
 * Batas 64 karakter sinkron dengan CHECK articles_id_format di
 * supabase/schema.sql; bila judul kembar, tambahkan akhiran -2, -3, dst.
 */
function uniqueSlugId(title) {
  const base = slugify(title).slice(0, 60).replace(/-+$/, '')
  let candidate = base
  let n = 2
  while (getArticle(candidate)) candidate = `${base}-${n++}`
  return candidate
}
