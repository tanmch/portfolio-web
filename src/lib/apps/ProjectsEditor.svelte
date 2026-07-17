<script>
  /**
   * ProjectsEditor.svelte — edit daftar project lewat text editor
   * bergaya Notepad. Hanya untuk pemilik (di-gate login).
   *
   * Alur: edit JSON → Validate → Save (pratinjau lokal, langsung
   * terlihat di app My Projects) → Export projects.json → ganti
   * public/data/projects.json di repo → commit.
   */
  import {
    projectsStore, loadShippedProjects, effectiveProjects,
    validateProjects, saveOverride, resetOverride, exportProjectsJson,
    projectsUseDb,
  } from '../stores/projects.svelte.js'

  let text = $state('')
  let status = $state('Memuat…')
  let initialized = $state(false)

  $effect(() => {
    loadShippedProjects().then(() => {
      if (!initialized) {
        text = JSON.stringify(effectiveProjects(), null, 2)
        status = projectsStore.override
          ? 'Memuat suntingan lokal (belum di-commit).'
          : 'Memuat daftar dari repo.'
        initialized = true
      }
    })
  })

  function doValidate() {
    const r = validateProjects(text)
    status = r.ok ? `✔ Valid — ${r.data.length} project.` : '✖ ' + r.error
    return r
  }

  function doSave() {
    const r = doValidate()
    if (!r.ok) return
    saveOverride(r.data)
    status = projectsUseDb
      ? `✔ Tersimpan (${r.data.length} project) — disinkronkan ke database dan tayang untuk semua pengunjung.`
      : `✔ Tersimpan sebagai pratinjau lokal (${r.data.length} project). Buka "My Projects" untuk melihat. Untuk publikasi: Export projects.json → commit.`
  }

  function doReset() {
    if (!confirm('Buang suntingan lokal dan kembali ke versi repo?')) return
    resetOverride()
    text = JSON.stringify(effectiveProjects(), null, 2)
    status = 'Kembali ke versi repo.'
  }

  function doExport() {
    const r = doValidate()
    if (!r.ok) return
    saveOverride(r.data)
    exportProjectsJson()
    status = 'projects.json diunduh — ganti public/data/projects.json lalu commit.'
  }
</script>

<div class="writer">
  <div class="writer-row">
    <button class="w95-btn" onclick={doValidate}>Validate</button>
    <button class="w95-btn" onclick={doSave}>Save</button>
    <button class="w95-btn" onclick={doExport}>Export projects.json</button>
    <button class="w95-btn" onclick={doReset}>Reset ke Repo</button>
  </div>

  <textarea
    class="notepad-area"
    bind:value={text}
    spellcheck="false"
    aria-label="JSON daftar project"
  ></textarea>

  <div class="writer-status">
    <span>{status}</span>
    <span>Field wajib: title, desc, link · opsional: icon, year, tags[]</span>
  </div>
</div>
