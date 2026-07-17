/**
 * settings.svelte.js
 * Store global (Svelte 5 runes) untuk pengaturan desktop:
 *  - theme : 'light' | 'dark'  -> di-persist ke localStorage ('w95-theme')
 *  - neko  : boolean           -> di-persist ke localStorage ('w95-neko')
 *
 * Catatan neko: skrip webneko (https://webneko.net) dimuat secara kondisional
 * dari index.html berdasarkan localStorage. Fungsi di sini juga mencoba
 * memasang / melepas kucing secara live tanpa reload.
 */

const THEME_KEY = 'w95-theme'
const NEKO_KEY = 'w95-neko'

function readTheme() {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}
function readNeko() {
  try { return localStorage.getItem(NEKO_KEY) !== 'off' } catch { return true } // default: ON
}

export const settings = $state({
  theme: readTheme(),
  neko: readNeko(),
})

/* ---------- THEME ---------- */
export function applyTheme() {
  document.documentElement.dataset.theme = settings.theme
}

export function toggleTheme() {
  settings.theme = settings.theme === 'dark' ? 'light' : 'dark'
  try { localStorage.setItem(THEME_KEY, settings.theme) } catch { /* ignore */ }
  applyTheme()
}

/* ---------- NEKO (kucing interaktif) ---------- */

/** Cari semua elemen yang dibuat oleh skrip webneko. */
function nekoElements() {
  return document.querySelectorAll(
    '#neko, .neko, img[src*="webneko"], img[src*="neko"], div[id^="neko"]'
  )
}

function mountNeko() {
  // Sudah ada? cukup tampilkan lagi.
  const existing = nekoElements()
  if (existing.length) {
    existing.forEach((el) => (el.style.display = ''))
    return
  }
  // Belum ada -> injeksikan skrip webneko (sama seperti versi awal situs).
  window.NekoType = 'socks'
  const s = document.createElement('script')
  s.src = 'https://webneko.net/n20171213.js'
  s.id = 'webneko-script'
  document.body.appendChild(s)
}

function unmountNeko() {
  // Skrip webneko tidak punya API "stop", jadi elemennya kita sembunyikan/hapus.
  nekoElements().forEach((el) => {
    try { el.remove() } catch { el.style.display = 'none' }
  })
}

export function toggleNeko() {
  settings.neko = !settings.neko
  try { localStorage.setItem(NEKO_KEY, settings.neko ? 'on' : 'off') } catch { /* ignore */ }
  if (settings.neko) mountNeko()
  else unmountNeko()
}
