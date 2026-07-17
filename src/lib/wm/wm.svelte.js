/**
 * wm.svelte.js — Window Manager ala Windows 95
 * Mengelola daftar jendela: posisi, ukuran, z-order, fokus,
 * minimize, maximize, dan restore.
 */

let zCounter = 100
let cascade = 0

export const wm = $state({
  windows: [],      // { id, appId, title, icon, x, y, w, h, z, minimized, maximized, prev }
  activeId: null,
  startOpen: false, // status Start Menu
})

export function isMobile() {
  return typeof window !== 'undefined' && window.innerWidth < 640
}

/** Buka app; jika sudah terbuka -> fokus/restore (single instance). */
export function openApp(app) {
  const existing = wm.windows.find((w) => w.appId === app.id)
  if (existing) {
    existing.minimized = false
    focusWindow(existing.id)
    return existing
  }
  const mobile = isMobile()
  const w = mobile ? window.innerWidth - 12 : (app.w ?? 560)
  const h = mobile ? Math.min(app.h ?? 420, window.innerHeight - 90) : (app.h ?? 420)
  const offset = (cascade++ % 7) * 28
  const win = {
    id: 'win-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    appId: app.id,
    title: app.title,
    icon: app.icon,
    fallback: app.fallback || '/icon/doc.ico',
    x: mobile ? 6 : 60 + offset,
    y: mobile ? 6 : 40 + offset,
    w, h,
    z: ++zCounter,
    minimized: false,
    maximized: mobile && app.maximizeOnMobile !== false,
    prev: null,
  }
  wm.windows.push(win)
  wm.activeId = win.id
  return win
}

export function closeWindow(id) {
  wm.windows = wm.windows.filter((w) => w.id !== id)
  if (wm.activeId === id) {
    const top = [...wm.windows].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0]
    wm.activeId = top ? top.id : null
  }
}

export function focusWindow(id) {
  const win = wm.windows.find((w) => w.id === id)
  if (!win) return
  win.z = ++zCounter
  wm.activeId = id
}

export function minimizeWindow(id) {
  const win = wm.windows.find((w) => w.id === id)
  if (!win) return
  win.minimized = true
  if (wm.activeId === id) {
    const top = [...wm.windows].filter((w) => !w.minimized && w.id !== id).sort((a, b) => b.z - a.z)[0]
    wm.activeId = top ? top.id : null
  }
}

export function toggleMaximize(id) {
  const win = wm.windows.find((w) => w.id === id)
  if (!win) return
  if (win.maximized) {
    win.maximized = false
    if (win.prev) Object.assign(win, win.prev), (win.prev = null)
  } else {
    win.prev = { x: win.x, y: win.y, w: win.w, h: win.h }
    win.maximized = true
  }
  focusWindow(id)
}

/** Klik tombol taskbar: restore+fokus, atau minimize jika sudah aktif. */
export function taskbarClick(id) {
  const win = wm.windows.find((w) => w.id === id)
  if (!win) return
  if (win.minimized) {
    win.minimized = false
    focusWindow(id)
  } else if (wm.activeId === id) {
    minimizeWindow(id)
  } else {
    focusWindow(id)
  }
}

/** Ubah posisi jendela (dari drag di component). */
export function moveWindow(id, { x, y }) {
  const win = wm.windows.find((w) => w.id === id)
  if (!win) return
  win.x = x
  win.y = y
}

/** Ubah ukuran jendela (dari resize di component). */
export function resizeWindow(id, { w, h }) {
  const win = wm.windows.find((w) => w.id === id)
  if (!win) return
  win.w = w
  win.h = h
}
