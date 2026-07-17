<script>
  /**
   * ArticlesApp.svelte — "My Articles / Michael95 Gazette".
   * Pengunjung: membaca artikel terpublikasi (kartu retro bergambar + cuplikan).
   * Pemilik (login): tab Drafts, tombol Edit/Publish/Hapus, dan Export
   * articles.json untuk dipublikasikan lewat commit.
   */
  import {
    articleStore, loadShipped, publishedArticles, draftArticles,
    getArticle, deleteArticle, publishArticle, unpublishArticle,
    isShipped, exportPublishedJson, exportArticleAsHtml, articlesUseDb,
    firstImage,
  } from '../stores/articles.svelte.js'
  import { sanitizeHtml } from '../security/sanitize.js'
  import { safeImageUrl } from '../security/url.js'
  import { auth } from '../stores/auth.svelte.js'
  import { openApp } from '../wm/wm.svelte.js'
  import { getApp } from './registry.js'

  const BASE = import.meta.env.BASE_URL || '/'

  let tab = $state('published') // 'published' | 'drafts'
  let readingId = $state(null)

  $effect(() => { loadShipped() })

  // Deep-link: /articles/<id>
  $effect(() => {
    const id = articleStore.openRequest
    if (id && articleStore.shippedLoaded) {
      if (getArticle(id)) readingId = id
      articleStore.openRequest = null
    }
  })

  let published = $derived(
    (articleStore.shippedLoaded, articleStore.local, publishedArticles())
  )
  let drafts = $derived((articleStore.local, draftArticles()))
  let reading = $derived(readingId ? getArticle(readingId) : null)

  function editIn(id) {
    articleStore.editRequest = id
    openApp(getApp('writer'))
  }

  function remove(a) {
    const scope = articlesUseDb ? 'dari database (hilang untuk semua pengunjung)' : 'dari browser ini'
    if (!confirm(`Hapus "${a.title}" ${scope}?`)) return
    if (readingId === a.id) readingId = null
    deleteArticle(a.id)
  }

  const fmt = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const isNew = (iso) => Date.now() - new Date(iso).getTime() < 14 * 24 * 3600 * 1000
</script>

<div class="articles-app">
  {#if reading}
    <div class="writer-row" style="margin:0;">
      <button class="w95-btn" onclick={() => (readingId = null)}>← Semua Artikel</button>
      {#if auth.loggedIn}
        <button class="w95-btn" onclick={() => editIn(reading.id)}>Edit</button>
        <button class="w95-btn" onclick={() => exportArticleAsHtml(reading)}>Export .html</button>
      {/if}
    </div>
    <article class="article-view app-pad">
      <!-- Cover tampil besar di sini HANYA bila bukan gambar yang sama
           dengan gambar pertama isi artikel — mencegah tampil dobel. -->
      {#if safeImageUrl(reading.cover) && reading.cover !== firstImage(reading.html)}
        <img class="article-cover" src={safeImageUrl(reading.cover)} alt="" />
      {/if}
      <h2 style="margin-top:8px;">{reading.title}</h2>
      <p class="dim">📅 {fmt(reading.created)}{reading.updated !== reading.created ? ` · diperbarui ${fmt(reading.updated)}` : ''}</p>
      <hr />
      <!-- SEC-01: sanitasi wajib — html bisa berasal dari JSON/DB/localStorage -->
      {@html sanitizeHtml(reading.html)}
    </article>
  {:else}
    <!-- Masthead retro -->
    <header class="gazette-head">
      <div class="gazette-title">✦ MICHAEL95 GAZETTE ✦</div>
      <a class="w95-btn rss-btn" href={`${BASE}feed.xml`} target="_blank" rel="noreferrer" title="Berlangganan lewat RSS reader favoritmu">
        <span class="rss-ico">📡</span> Subscribe RSS
      </a>
    </header>

    {#if auth.loggedIn}
      <div class="gazette-toolbar">
        <button class="w95-btn" class:pressed={tab === 'published'} onclick={() => (tab = 'published')}>
          Published ({published.length})
        </button>
        <button class="w95-btn" class:pressed={tab === 'drafts'} onclick={() => (tab = 'drafts')}>
          Drafts ({drafts.length})
        </button>
        <span style="flex:1"></span>
        <button class="w95-btn" onclick={() => openApp(getApp('writer'))}>✎ Tulis Baru</button>
        <button class="w95-btn" title="Unduh articles.json untuk di-commit ke repo" onclick={exportPublishedJson}>
          Export articles.json
        </button>
      </div>
    {/if}

    {#if tab === 'drafts' && auth.loggedIn}
      {#if drafts.length === 0}
        <div class="empty-state"><p><b>Tidak ada draft.</b></p><p class="dim">Tulisan yang di-Save tapi belum di-Publish muncul di sini.</p></div>
      {:else}
        <div class="card-list app-pad">
          {#each drafts as a (a.id)}
            <div class="article-card">
              <div class="card-thumb">
                {#if safeImageUrl(a.cover)}<img src={safeImageUrl(a.cover)} alt="" />{:else}<span class="thumb-placeholder">📝</span>{/if}
              </div>
              <div class="card-body">
                <div class="card-title-row">
                  <button class="card-title" onclick={() => (readingId = a.id)}>{a.title}</button>
                  <span class="badge-draft">DRAFT</span>
                </div>
                <span class="card-date">Diperbarui {fmt(a.updated)}</span>
                <p class="card-excerpt">{a.excerpt || '(belum ada isi)'}</p>
                <div class="card-actions">
                  <button class="w95-btn" onclick={() => editIn(a.id)}>Edit</button>
                  <button class="w95-btn" onclick={() => { publishArticle(a.id); tab = 'published' }}>Publish ▲</button>
                  <button class="w95-btn" onclick={() => remove(a)}>Hapus</button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {:else if !articleStore.shippedLoaded}
      <div class="empty-state"><p>Memuat artikel…</p></div>
    {:else if published.length === 0}
      <div class="empty-state">
        <p><b>Belum ada artikel terpublikasi.</b></p>
        {#if auth.loggedIn}<p class="dim">Tulis lewat Article Writer → Publish → Export articles.json → commit.</p>{/if}
      </div>
    {:else}
      <div class="card-list app-pad">
        {#each published as a (a.id)}
          <div class="article-card">
            <div class="card-thumb">
              {#if safeImageUrl(a.cover)}<img src={safeImageUrl(a.cover)} alt="" loading="lazy" />{:else}<span class="thumb-placeholder">📰</span>{/if}
            </div>
            <div class="card-body">
              <div class="card-title-row">
                <button class="card-title" onclick={() => (readingId = a.id)}>{a.title}</button>
                {#if isNew(a.created)}<span class="badge-new">NEW!</span>{/if}
                {#if auth.loggedIn && a.published && !isShipped(a.id)}
                  {#if articlesUseDb}
                    <span class="badge-pending" title="Sudah Publish di browser ini, menunggu sinkron ke database">belum tersinkron</span>
                  {:else}
                    <span class="badge-pending" title="Sudah Publish di browser ini, belum di-commit ke repo">belum di-commit</span>
                  {/if}
                {/if}
              </div>
              <span class="card-date">📅 {fmt(a.created)}</span>
              <p class="card-excerpt">{a.excerpt}</p>
              <div class="card-actions">
                <button class="w95-btn" onclick={() => (readingId = a.id)}>☞ Baca</button>
                {#if auth.loggedIn}
                  <button class="w95-btn" onclick={() => editIn(a.id)}>Edit</button>
                  {#if a.published && articleStore.local.some((l) => l.id === a.id)}
                    <button class="w95-btn" title="Kembalikan ke draft (lokal)" onclick={() => unpublishArticle(a.id)}>▼ Draft</button>
                    <button class="w95-btn" onclick={() => remove(a)}>Hapus</button>
                  {/if}
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>
