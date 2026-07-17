<script>
  /**
   * ProjectsApp.svelte — pseudo-app daftar project.
   * Data efektif: suntingan lokal pemilik → public/data/projects.json →
   * fallback daftar orisinal. Pemilik bisa mengedit lewat "Projects Editor".
   */
  import { projectsStore, loadShippedProjects, effectiveProjects } from '../stores/projects.svelte.js'
  import { safeLinkUrl, safeImageUrl } from '../security/url.js'
  import { auth } from '../stores/auth.svelte.js'
  import { openApp } from '../wm/wm.svelte.js'
  import { getApp } from './registry.js'
  import Icon from '../wm/Icon.svelte'

  $effect(() => { loadShippedProjects() })
  let projects = $derived(
    (projectsStore.loaded, projectsStore.override, effectiveProjects())
  )
</script>

<div class="app-pad">
  <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
    <p class="dim" style="margin:0; flex:1;">
      {projects.length} object(s){projectsStore.override ? ' · pratinjau suntingan lokal (belum di-commit)' : ''}
    </p>
    {#if auth.loggedIn}
      <button class="w95-btn" onclick={() => openApp(getApp('projects-editor'))}>✎ Edit</button>
    {/if}
  </div>

  <div class="proj-list">
    {#each projects as p (p.title)}
      <!-- SEC-06/SEC-10: skema link divalidasi; noopener eksplisit -->
      <a class="proj-item" href={safeLinkUrl(p.link) ?? '#'} target="_blank" rel="noopener noreferrer">
        <Icon src={safeImageUrl(p.icon) || '/icon/doc.ico'} size={32} alt="" />
        <span class="proj-info">
          <strong>{p.title}</strong>{#if p.year}<span class="dim"> · {p.year}</span>{/if}
          <span class="proj-desc">{p.desc}</span>
          {#if p.tags?.length}
            <span class="proj-tags">
              {#each p.tags as t}<span class="proj-tag">{t}</span>{/each}
            </span>
          {/if}
        </span>
      </a>
    {/each}
  </div>
</div>
