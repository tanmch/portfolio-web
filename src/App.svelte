<script>
  /**
   * App.svelte — Desktop Shell "Michael95".
   * - Routing path: /about, /projects, /articles, /articles/<id>, /writer,
   *   /settings, /support, /help, /login (root "/" = desktop kosong).
   * - Gate pemilik: app ber-flag ownerOnly membuka dialog Log In dulu.
   * Konten orisinal portfolio tetap utuh di AboutApp/SupportApp
   * (salinan lama: backups/App.svelte.original).
   */
  import { onMount } from 'svelte'
  import { wm, openApp, toggleMaximize } from './lib/wm/wm.svelte.js'
  import Window95 from './lib/wm/Window95.svelte'
  import Taskbar from './lib/wm/Taskbar.svelte'
  import StartMenu from './lib/wm/StartMenu.svelte'
  import DesktopIcon from './lib/wm/DesktopIcon.svelte'
  import { apps, getApp } from './lib/apps/registry.js'
  import { applyTheme } from './lib/stores/settings.svelte.js'
  import { auth } from './lib/stores/auth.svelte.js'
  import { articleStore } from './lib/stores/articles.svelte.js'

  const BASE = import.meta.env.BASE_URL || '/'
  let selectedIcon = $state(null)

  /** Buka app dengan gerbang login untuk app khusus pemilik. */
  function launch(app) {
    if (!app) return
    if (app.ownerOnly && !auth.loggedIn) {
      auth.pendingAppId = app.id
      openApp(getApp('login'))
      return
    }
    openApp(app)
  }

  /* ---------- ROUTING ---------- */
  const ALIASES = { 'control-panel': 'settings', blog: 'articles' }

  function currentSegments() {
    let path = location.pathname
    if (path.startsWith(BASE)) path = path.slice(BASE.length)
    return path.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  }

  function route() {
    const seg = currentSegments()
    if (seg.length === 0) return // "/" → desktop kosong, tidak auto-buka apa pun
    const id = ALIASES[seg[0]] || seg[0]
    const app = getApp(id)
    if (!app) return
    const wasOpen = wm.windows.some((w) => w.appId === id)
    if (id === 'articles') {
      if (seg[1]) articleStore.openRequest = decodeURIComponent(seg[1])
      else articleStore.readingId = null
    }
    launch(app)
    // Deep-link artikel dari luar (mesin pencari/share): jendela baru langsung
    // fullscreen agar pembaca fokus ke isi; desktop tetap bisa dijelajahi
    // lewat tombol restore.
    if (id === 'articles' && seg[1] && !wasOpen) {
      const win = wm.windows.find((w) => w.appId === 'articles')
      if (win && !win.maximized) toggleMaximize(win.id)
    }
  }

  // Sinkronkan URL dengan jendela aktif (tanpa membanjiri history).
  let lastPath = null
  $effect(() => {
    const active = wm.windows.find((w) => w.id === wm.activeId)
    // Jangan menimpa URL deep-link sebelum route() pertama sempat jalan:
    // efek ini bisa terpicu lebih dulu saat belum ada jendela sama sekali.
    if (!active && lastPath === null) return
    let path = BASE + (active ? active.appId : '')
    // Artikel sedang dibaca → URL menyertakan slug agar bisa disalin & dibagikan.
    if (active?.appId === 'articles' && articleStore.readingId)
      path += '/' + encodeURIComponent(articleStore.readingId)
    if (typeof history !== 'undefined' && path !== lastPath && location.pathname !== path) {
      history.replaceState(null, '', path)
      lastPath = path
    }
  })

  onMount(() => {
    applyTheme()
    // Dukungan deep-link dari 404.html (GitHub Pages SPA redirect).
    // SEC-08: hanya path internal sederhana yang diterima — tanpa skema,
    // tanpa "..", tanpa karakter di luar [A-Za-z0-9_/.-].
    const params = new URLSearchParams(location.search)
    const p = params.get('p')
    if (p && /^[\w/.-]*$/.test(p) && !p.includes('..')) {
      history.replaceState(null, '', BASE + p.replace(/^\/+/, ''))
    }
    route()
    const onPop = () => route()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  })

  function deskClick() {
    selectedIcon = null
    wm.startOpen = false
  }
</script>

<svelte:head>
  <title>A Web Portfolio | Michael</title>
</svelte:head>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (wm.startOpen = false)} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="desktop" onpointerdown={deskClick}>
  <!-- Ikon desktop -->
  <div class="desk-icons" onpointerdown={(e) => e.stopPropagation()}>
    {#each apps.filter((a) => a.desktop) as app (app.id)}
      <DesktopIcon
        {app}
        locked={app.ownerOnly && !auth.loggedIn}
        selected={selectedIcon === app.id}
        onselect={(a) => (selectedIcon = a.id)}
        onopen={(a) => { launch(a); selectedIcon = null }}
      />
    {/each}
  </div>

  <!-- Jendela-jendela -->
  {#each wm.windows as win (win.id)}
    <Window95 {win}>
      {#if getApp(win.appId)}
        {@const AppComp = getApp(win.appId).component}
        <AppComp />
      {/if}
    </Window95>
  {/each}

  <!-- Start Menu -->
  {#if wm.startOpen}
    <StartMenu onopen={(app) => launch(app)} onclose={() => (wm.startOpen = false)} />
  {/if}
</div>

<Taskbar onstart={() => (wm.startOpen = !wm.startOpen)} />
