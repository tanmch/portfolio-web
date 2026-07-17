<script>
  import { wm, taskbarClick } from './wm.svelte.js'
  import { settings, toggleTheme, toggleNeko } from '../stores/settings.svelte.js'
  import { auth } from '../stores/auth.svelte.js'
  import Icon from './Icon.svelte'

  let { onstart } = $props()

  let now = $state(new Date())
  $effect(() => {
    const t = setInterval(() => (now = new Date()), 10_000)
    return () => clearInterval(t)
  })
  let clock = $derived(
    now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
</script>

<footer class="w95-taskbar" onpointerdown={(e) => { if (!e.target.closest('.start-btn')) wm.startOpen = false }}>
  <button
    class="w95-btn start-btn"
    class:pressed={wm.startOpen}
    onpointerdown={(e) => e.stopPropagation()}
    onclick={(e) => { e.stopPropagation(); onstart?.() }}
    aria-haspopup="menu"
    aria-expanded={wm.startOpen}
  >
    <Icon src="https://win98icons.alexmeub.com/icons/png/windows-0.png" fallback="/icon/computer.ico" size={18} alt="" />
    <b>Start</b>
  </button>

  <span class="taskbar-divider" aria-hidden="true"></span>

  <div class="taskbar-tasks">
    {#each wm.windows as win (win.id)}
      <button
        class="w95-btn task-btn"
        class:pressed={wm.activeId === win.id && !win.minimized}
        onclick={() => taskbarClick(win.id)}
        title={win.title}
      >
        <Icon src={win.icon} fallback={win.fallback} size={16} alt="" />
        <span class="task-label">{win.title}</span>
      </button>
    {/each}
  </div>

  <div class="taskbar-tray">
    <button
      class="tray-btn"
      title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      onclick={toggleTheme}
    >{settings.theme === 'dark' ? '☾' : '☀'}</button>
    <button
      class="tray-btn"
      title={settings.neko ? 'Cat: ON (klik untuk sembunyikan)' : 'Cat: OFF (klik untuk tampilkan)'}
      onclick={toggleNeko}
      style={settings.neko ? '' : 'opacity:.45'}
    >🐈</button>
    {#if auth.loggedIn}<span class="tray-key" title="Masuk sebagai pemilik">🔑</span>{/if}
    <span class="tray-clock">{clock}</span>
  </div>
</footer>
