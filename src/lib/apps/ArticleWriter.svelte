<script>
  /**
   * ArticleWriter.svelte — editor teks kaya (rich text) bergaya WordPad 95
   * untuk menulis & menyiapkan artikel yang akan di-upload.
   *
   * Fitur:
   *  - Undo/Redo, Bold/Italic/Underline/Strikethrough
   *  - Paragraf/Heading (H1–H3, blockquote, pre)
   *  - Ukuran font, warna teks, highlight
   *  - Rata kiri/tengah/kanan/justify, list bernomor & bullet, indent
   *  - Sisipkan tautan, gambar (dari URL atau file lokal → base64), garis horizontal
   *  - Hapus format
   *  - Simpan / perbarui artikel (localStorage), ekspor .html mandiri, impor .html
   *  - Penghitung kata & karakter
   */
  import { articleStore, saveArticle, getArticle, publishArticle, exportArticleAsHtml, exportPublishedJson, articlesUseDb } from '../stores/articles.svelte.js'
  import { sanitizeHtml } from '../security/sanitize.js'
  import { safeLinkUrl, safeImageUrl } from '../security/url.js'
  import { processAndStoreImage } from '../images.js'

  let editor // ref div contenteditable
  let fileInput
  let importInput
  let coverInput

  let title = $state('')
  let cover = $state('')
  let currentId = $state(null)
  let statusMsg = $state('Siap.')
  let words = $state(0)
  let chars = $state(0)

  // Jika app "My Articles" meminta edit artikel tertentu:
  $effect(() => {
    const id = articleStore.editRequest
    if (id && editor) {
      const art = getArticle(id)
      if (art) {
        currentId = art.id
        title = art.title
        cover = art.cover || ''
        // SEC-01/SEC-09: html dari storage/DB tidak boleh masuk DOM mentah
        editor.innerHTML = sanitizeHtml(art.html)
        updateCount()
        statusMsg = `Memuat "${art.title}" untuk diedit.`
      }
      articleStore.editRequest = null
    }
  })

  /* --- Preservasi seleksi: klik toolbar tidak boleh menghilangkan
         seleksi teks di editor (khususnya untuk <select> & color picker). --- */
  let savedRange = null
  function saveSel() {
    const sel = window.getSelection()
    if (sel && sel.rangeCount && editor?.contains(sel.anchorNode)) {
      savedRange = sel.getRangeAt(0).cloneRange()
    }
  }
  function restoreSel() {
    if (!savedRange) return
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(savedRange)
  }
  function toolbarDown(e) {
    saveSel()
    // Tombol biasa: cegah perpindahan fokus agar seleksi tetap hidup.
    const btn = e.target.closest('.tbtn')
    if (btn && !btn.classList.contains('has-input')) e.preventDefault()
  }

  function cmd(command, value = null) {
    editor?.focus()
    restoreSel()
    document.execCommand(command, false, value)
    saveSel()
    updateCount()
  }

  function setBlock(tag) {
    cmd('formatBlock', tag === 'p' ? 'P' : tag.toUpperCase())
  }

  function insertLink() {
    const url = prompt('Masukkan URL tautan:', 'https://')
    if (!url) return
    // SEC-05: allowlist skema — javascript:/data: dsb. ditolak
    const safe = safeLinkUrl(url)
    if (!safe) { statusMsg = 'URL ditolak — hanya http(s), mailto, atau path internal.'; return }
    cmd('createLink', safe)
  }

  function insertImageUrl() {
    const url = prompt('Masukkan URL gambar:', 'https://')
    if (!url) return
    const safe = safeImageUrl(url)
    if (!safe) { statusMsg = 'URL gambar ditolak — hanya http(s) atau path internal.'; return }
    cmd('insertImage', safe)
  }

  /** Cover khusus thumbnail: kompres → upload Storage (atau base64 fallback). */
  async function coverFromFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    statusMsg = `Mengompres & mengunggah cover "${file.name}"…`
    try {
      const { url, uploaded } = await processAndStoreImage(file, 'cover')
      cover = url
      statusMsg = uploaded
        ? `Cover thumbnail terunggah ke Storage (${file.name}).`
        : `Cover thumbnail dipasang (terkompres, tersimpan lokal — Storage tidak tersedia).`
    } catch (err) {
      statusMsg = `✖ ${err.message}`
    }
  }

  async function insertImageFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    saveSel() // seleksi hilang saat dialog file — pulihkan sebelum sisip
    statusMsg = `Mengompres & mengunggah "${file.name}"…`
    try {
      const { url, uploaded } = await processAndStoreImage(file, 'article')
      cmd('insertImage', url)
      statusMsg = uploaded
        ? `Gambar terunggah ke Storage (${file.name}).`
        : `Gambar disisipkan (terkompres, base64 — Storage tidak tersedia).`
    } catch (err) {
      statusMsg = `✖ ${err.message}`
    }
  }

  function updateCount() {
    const text = editor?.innerText ?? ''
    chars = text.replace(/\s/g, '').length
    words = (text.trim().match(/\S+/g) || []).length
  }

  function doSave() {
    const html = editor?.innerHTML ?? ''
    if (!title.trim() && !html.trim()) {
      statusMsg = 'Tidak ada yang bisa disimpan — tulis sesuatu dulu.'
      return null
    }
    const saved = saveArticle({ id: currentId, title: title.trim() || 'Untitled', html, cover })
    currentId = saved.id
    const pubNote = articlesUseDb ? ' (published — tersinkron ke database)' : ' (published — jangan lupa Export & commit)'
    statusMsg = `Tersimpan "${saved.title}"${saved.published ? pubNote : ' sebagai draft'}.`
    return saved
  }

  function doPublish() {
    const saved = doSave()
    if (!saved) return
    publishArticle(saved.id)
    statusMsg = articlesUseDb
      ? `"${saved.title}" DIPUBLIKASIKAN — tersimpan ke database dan tayang untuk semua pengunjung.`
      : `"${saved.title}" DIPUBLIKASIKAN di browser ini. Agar tayang untuk semua orang: Export articles.json → ganti public/data/articles.json → commit.`
  }

  function doNew() {
    currentId = null
    title = ''
    cover = ''
    if (editor) editor.innerHTML = '<p><br></p>'
    updateCount()
    statusMsg = 'Dokumen baru.'
  }

  function doExport() {
    const html = editor?.innerHTML ?? ''
    exportArticleAsHtml({
      title: title.trim() || 'Untitled',
      html,
      cover,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    })
    statusMsg = 'Diekspor sebagai file .html — siap di-upload.'
  }

  function doImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const doc = new DOMParser().parseFromString(String(reader.result), 'text/html')
      title = doc.querySelector('title')?.textContent || file.name.replace(/\.html?$/i, '')
      // buang judul & meta bawaan file ekspor supaya tidak dobel
      doc.querySelectorAll('h1.article-title, p.article-meta, hr:first-of-type').forEach((n) => n.remove())
      // SEC-01: file .html impor adalah input tak-tepercaya — sanitasi dulu
      editor.innerHTML = sanitizeHtml(doc.body.innerHTML)
      currentId = null
      updateCount()
      statusMsg = `Impor "${file.name}" berhasil.`
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const sizes = [
    { v: '2', label: 'Kecil' },
    { v: '3', label: 'Normal' },
    { v: '4', label: 'Besar' },
    { v: '5', label: 'Lebih Besar' },
    { v: '6', label: 'Sangat Besar' },
  ]
</script>

<div class="writer">
  <!-- Baris judul dokumen + aksi file -->
  <div class="writer-row">
    <input class="w95-input writer-title" placeholder="Judul artikel…" bind:value={title} />
    <button class="w95-btn" onclick={doNew} title="Dokumen baru">New</button>
    <button class="w95-btn" onclick={doSave} title="Simpan draft ke browser">Save</button>
    <button class="w95-btn" onclick={doPublish} title="Tandai terpublikasi (lalu Export &amp; commit)">Publish&nbsp;▲</button>
    <button class="w95-btn" onclick={doExport} title="Unduh artikel ini sebagai file .html">Export&nbsp;.html</button>
    <button class="w95-btn" onclick={exportPublishedJson} title="Unduh articles.json (semua artikel terpublikasi) untuk di-commit ke repo">Export&nbsp;JSON</button>
    <button class="w95-btn" onclick={() => importInput.click()} title="Buka file .html">Import</button>
    <input type="file" accept=".html,.htm,text/html" hidden bind:this={importInput} onchange={doImport} />
  </div>

  <!-- Cover artikel — KHUSUS thumbnail kartu Gazette (tidak tampil di isi artikel) -->
  <div class="writer-row" style="padding-top:0;">
    <label class="dim" for="cover-url" style="white-space:nowrap;">Thumbnail (URL / file):</label>
    <input id="cover-url" class="w95-input" style="flex:1; min-width:120px;" placeholder="kosongkan = pakai gambar pertama di artikel" bind:value={cover} />
    <button class="w95-btn" onclick={() => coverInput.click()} title="Pilih gambar thumbnail dari file">📁 Pilih…</button>
    {#if cover}
      <button class="w95-btn" onclick={() => (cover = '')} title="Hapus thumbnail">✕</button>
    {/if}
    <input type="file" accept="image/*" hidden bind:this={coverInput} onchange={coverFromFile} />
  </div>

  <!-- Toolbar format -->
  <div class="writer-toolbar" role="toolbar" tabindex="-1" aria-label="Format teks" onmousedown={toolbarDown}>
    <button class="w95-btn tbtn" title="Undo" onclick={() => cmd('undo')}>↶</button>
    <button class="w95-btn tbtn" title="Redo" onclick={() => cmd('redo')}>↷</button>
    <span class="tsep"></span>

    <select class="w95-input" title="Gaya paragraf" onchange={(e) => { setBlock(e.target.value); e.target.value = '' }}>
      <option value="" selected disabled>Gaya…</option>
      <option value="p">Paragraf</option>
      <option value="h1">Heading 1</option>
      <option value="h2">Heading 2</option>
      <option value="h3">Heading 3</option>
      <option value="blockquote">Kutipan</option>
      <option value="pre">Kode</option>
    </select>
    <select class="w95-input" title="Ukuran font" onchange={(e) => { cmd('fontSize', e.target.value); e.target.value = '' }}>
      <option value="" selected disabled>Ukuran…</option>
      {#each sizes as s}<option value={s.v}>{s.label}</option>{/each}
    </select>
    <span class="tsep"></span>

    <button class="w95-btn tbtn" title="Bold (Ctrl+B)" style="font-weight:bold" onclick={() => cmd('bold')}>B</button>
    <button class="w95-btn tbtn" title="Italic (Ctrl+I)" style="font-style:italic" onclick={() => cmd('italic')}>I</button>
    <button class="w95-btn tbtn" title="Underline (Ctrl+U)" style="text-decoration:underline" onclick={() => cmd('underline')}>U</button>
    <button class="w95-btn tbtn" title="Coret" style="text-decoration:line-through" onclick={() => cmd('strikeThrough')}>S</button>
    <label class="w95-btn tbtn has-input" title="Warna teks">A<input type="color" class="color-swatch" oninput={(e) => cmd('foreColor', e.target.value)} /></label>
    <label class="w95-btn tbtn has-input" title="Highlight">🖊<input type="color" class="color-swatch" value="#ffff00" oninput={(e) => cmd('hiliteColor', e.target.value)} /></label>
    <span class="tsep"></span>

    <button class="w95-btn tbtn" title="Rata kiri" onclick={() => cmd('justifyLeft')}>⇤</button>
    <button class="w95-btn tbtn" title="Rata tengah" onclick={() => cmd('justifyCenter')}>≡</button>
    <button class="w95-btn tbtn" title="Rata kanan" onclick={() => cmd('justifyRight')}>⇥</button>
    <button class="w95-btn tbtn" title="Justify" onclick={() => cmd('justifyFull')}>☰</button>
    <span class="tsep"></span>

    <button class="w95-btn tbtn" title="List bullet" onclick={() => cmd('insertUnorderedList')}>•≡</button>
    <button class="w95-btn tbtn" title="List bernomor" onclick={() => cmd('insertOrderedList')}>1≡</button>
    <button class="w95-btn tbtn" title="Kurangi indent" onclick={() => cmd('outdent')}>⇦</button>
    <button class="w95-btn tbtn" title="Tambah indent" onclick={() => cmd('indent')}>⇨</button>
    <span class="tsep"></span>

    <button class="w95-btn tbtn" title="Sisipkan tautan" onclick={insertLink}>🔗</button>
    <button class="w95-btn tbtn" title="Gambar dari URL" onclick={insertImageUrl}>🖼</button>
    <button class="w95-btn tbtn" title="Gambar dari file" onclick={() => fileInput.click()}>📁🖼</button>
    <input type="file" accept="image/*" hidden bind:this={fileInput} onchange={insertImageFile} />
    <button class="w95-btn tbtn" title="Garis horizontal" onclick={() => cmd('insertHorizontalRule')}>―</button>
    <button class="w95-btn tbtn" title="Hapus format" onclick={() => cmd('removeFormat')}>Tx</button>
  </div>

  <!-- Area tulis -->
  <div
    class="writer-page"
    contenteditable="true"
    bind:this={editor}
    oninput={updateCount}
    spellcheck="true"
  >
    <p>Mulai tulis artikelmu di sini…</p>
  </div>

  <!-- Status bar -->
  <div class="writer-status">
    <span>
      {#if articleStore.dbError}
        <span style="color:#a00;">✖ Sinkron database gagal: {articleStore.dbError}</span>
      {:else}
        {statusMsg}
      {/if}
    </span>
    <span>{words} kata · {chars} karakter{currentId ? ' · tersimpan' : ''}</span>
  </div>
</div>
