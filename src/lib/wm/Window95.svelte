<script>
  /**
   * Window95.svelte — jendela ala Windows 95.
   * Fitur: drag (title bar), resize (handle kanan-bawah), fokus (klik),
   * minimize / maximize-restore / close, double-click title bar = maximize.
   * Menggunakan Pointer Events sehingga bekerja untuk mouse & sentuhan.
   */
  import { wm, focusWindow, closeWindow, minimizeWindow, toggleMaximize, moveWindow, resizeWindow } from './wm.svelte.js'
  import Icon from './Icon.svelte'

  let { win, children } = $props()

  const MIN_W = 260
  const MIN_H = 160
  const TASKBAR_H = 34

  let active = $derived(wm.activeId === win.id)

  /* ---------- DRAG ---------- */
  let drag = null
  function onTitleDown(e) {
    if (e.target.closest('.tb-btn')) return
    if (win.maximized) return
    focusWindow(win.id)
    drag = { sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onTitleMove(e) {
    if (!drag) return
    const maxX = window.innerWidth - 60
    const maxY = window.innerHeight - TASKBAR_H - 24
    const x = Math.min(Math.max(drag.ox + (e.clientX - drag.sx), -win.w + 80), maxX)
    const y = Math.min(Math.max(drag.oy + (e.clientY - drag.sy), 0), maxY)
    moveWindow(win.id, { x, y })
  }
  function onTitleUp() { drag = null }

  /* ---------- RESIZE ---------- */
  let rez = null
  function onRezDown(e) {
    if (win.maximized) return
    focusWindow(win.id)
    rez = { sx: e.clientX, sy: e.clientY, ow: win.w, oh: win.h }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.stopPropagation()
  }
  function onRezMove(e) {
    if (!rez) return
    const w = Math.max(MIN_W, rez.ow + (e.clientX - rez.sx))
    const h = Math.max(MIN_H, rez.oh + (e.clientY - rez.sy))
    resizeWindow(win.id, { w, h })
  }
  function onRezUp() { rez = null }

  let styleStr = $derived(
    win.maximized
      ? `left:0; top:0; width:100vw; height:calc(100vh - ${TASKBAR_H}px); z-index:${win.z};`
      : `left:${win.x}px; top:${win.y}px; width:${win.w}px; height:${win.h}px; z-index:${win.z};`
  )
</script>

{#if !win.minimized}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <section
    class="w95-window"
    class:active
    style={styleStr}
    onpointerdown={() => focusWindow(win.id)}
    role="group"
    aria-label={win.title}
  >
    <!-- Title bar -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="w95-titlebar"
      class:inactive={!active}
      onpointerdown={onTitleDown}
      onpointermove={onTitleMove}
      onpointerup={onTitleUp}
      ondblclick={() => toggleMaximize(win.id)}
    >
      <span class="w95-title-left">
        <Icon src={win.icon} fallback={win.fallback} size={16} alt="" />
        <span class="w95-title-text">{win.title}</span>
      </span>
      <span class="w95-title-btns">
        <button class="tb-btn" title="Minimize" aria-label="Minimize" onclick={() => minimizeWindow(win.id)}>
          <svg width="10" height="9" viewBox="0 0 10 9"><rect x="1" y="6" width="7" height="2" fill="currentColor"/></svg>
        </button>
        <button class="tb-btn" title={win.maximized ? 'Restore' : 'Maximize'} aria-label="Maximize" onclick={() => toggleMaximize(win.id)}>
          {#if win.maximized}
            <svg width="10" height="9" viewBox="0 0 10 9"><path d="M2 0h7v6H7V8H0V2h2V0zm1 1v1h5v3h1V1H3zM1 3v4h5V3H1z" fill="currentColor"/></svg>
          {:else}
            <svg width="10" height="9" viewBox="0 0 10 9"><path d="M0 0h9v8H0V0zm1 2v5h7V2H1z" fill="currentColor"/></svg>
          {/if}
        </button>
        <button class="tb-btn tb-close" title="Close" aria-label="Close" onclick={() => closeWindow(win.id)}>
          <svg width="10" height="9" viewBox="0 0 10 9"><path d="M1 0h2l2 2 2-2h2v1L7 4l2 3v1H7L5 6 3 8H1V7l2-3L1 1V0z" fill="currentColor"/></svg>
        </button>
      </span>
    </div>

    <!-- Isi jendela -->
    <div class="w95-body">
      {@render children?.()}
    </div>

    <!-- Handle resize -->
    {#if !win.maximized}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="w95-resize"
        onpointerdown={onRezDown}
        onpointermove={onRezMove}
        onpointerup={onRezUp}
        aria-hidden="true"
      ></div>
    {/if}
  </section>
{/if}
