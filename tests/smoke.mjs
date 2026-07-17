import { JSDOM } from 'jsdom'
import { readdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const jsFile = join(ROOT, 'dist/assets', readdirSync(join(ROOT, 'dist/assets')).find(f => f.endsWith('.js')))
const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app"></div></body></html>`, {
  url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only',
})
global.window = dom.window
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in global)) { try { global[key] = dom.window[key] } catch {} }
}
Object.defineProperty(global, "navigator", { get: () => dom.window.navigator, configurable: true })
// Node >=22 punya global localStorage/sessionStorage sendiri (nonfungsional
// tanpa --localstorage-file) yang membuat loop copy di atas melewatkannya —
// paksa pakai milik jsdom.
Object.defineProperty(global, "localStorage", { get: () => dom.window.localStorage, configurable: true })
Object.defineProperty(global, "sessionStorage", { get: () => dom.window.sessionStorage, configurable: true })
global.requestAnimationFrame = (cb) => setTimeout(cb, 0)
dom.window.requestAnimationFrame = global.requestAnimationFrame
global.matchMedia = dom.window.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){} }))

// ---- Stub jaringan Supabase (jsdom tanpa server; kredensial uji = 'michael95') ----
const jsonResponse = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
const realFetch = global.fetch
global.fetch = async (input, init = {}) => {
  const url = String(typeof input === 'object' && input?.url ? input.url : input)
  if (!url.includes('.supabase.co')) return realFetch(input, init)
  if (url.includes('/auth/v1/token')) {
    const body = JSON.parse(init.body || '{}')
    if (body.password === 'michael95') {
      return jsonResponse({
        access_token: 'test-access-token', token_type: 'bearer', expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'test-refresh',
        user: {
          id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated',
          email: body.email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString(),
        },
      })
    }
    return jsonResponse({ error: 'invalid_grant', error_description: 'Invalid login credentials' }, 400)
  }
  if (url.includes('/auth/v1/logout')) return jsonResponse({}, 204)
  if (url.includes('/auth/v1/user')) return jsonResponse({ id: '00000000-0000-0000-0000-000000000001', aud: 'authenticated', role: 'authenticated', email: 'test@test', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() })
  if (url.includes('/rest/v1/rpc/is_owner')) return jsonResponse(true)
  if (url.includes('/rest/v1/')) {
    const method = (init.method || 'GET').toUpperCase()
    if (method === 'GET') return jsonResponse([])
    return jsonResponse([], 201)
  }
  return jsonResponse([])
}
const hasSupabaseSession = () => {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k && k.startsWith('sb-') && k.includes('auth-token')) return true
  }
  return false
}

await import(jsFile)
await new Promise(r => setTimeout(r, 300))

const $ = (s) => document.querySelectorAll(s)
const results = []
const check = (name, cond) => { results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}`) }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const findBtn = (scope, label) => [...scope.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(label))

check('Desktop dirender', $('.desktop').length === 1)
check('Taskbar dirender', $('.w95-taskbar').length === 1)
check('Ikon desktop >= 6', $('.desk-icon').length >= 6)
check('Root "/" TIDAK auto-membuka jendela', $('.w95-window').length === 0)

// ---- Routing: popstate /about membuka About ----
window.history.pushState(null, '', '/about')
window.dispatchEvent(new window.PopStateEvent('popstate'))
await sleep(150)
check('Routing /about membuka About Me', document.querySelector('.w95-title-text')?.textContent === 'About Me')
check('Konten orisinal utuh (nama)', document.body.textContent.includes('Michael Christian Handoko'))
check('Konten orisinal utuh (quote)', document.body.textContent.includes('menenun kain'))

// ---- Login gate: Writer terkunci ----
document.querySelector('.start-btn').click()
await sleep(80)
let items = [...$('.start-menu li button span')].map(e => e.textContent)
check('Start menu menandai app terkunci 🔒', items.some(t => t.includes('Article Writer') && t.includes('🔒')))
let writerBtn = [...$('.start-menu li button')].find(b => b.textContent.includes('Article Writer'))
writerBtn.click()
await sleep(150)
check('Writer terkunci → dialog Log In muncul', [...$('.w95-title-text')].some(e => e.textContent === 'Log In'))
check('Writer TIDAK terbuka tanpa login', ![...$('.w95-title-text')].some(e => e.textContent === 'Article Writer'))

// ---- Login dengan password salah lalu benar ----
const emailInput = document.querySelector('#login-email')
if (emailInput) {
  emailInput.value = 'owner@test.local'
  emailInput.dispatchEvent(new window.Event('input', { bubbles: true }))
}
const pw = document.querySelector('#login-pw')
pw.value = 'salah'; pw.dispatchEvent(new window.Event('input', { bubbles: true }))
findBtn(document, 'OK').click()
await sleep(200)
check('Password salah ditolak', document.body.textContent.toLowerCase().includes('password salah'))
pw.value = 'michael95'; pw.dispatchEvent(new window.Event('input', { bubbles: true }))
findBtn(document, 'OK').click()
await sleep(300)
check('Login benar → Writer terbuka otomatis', [...$('.w95-title-text')].some(e => e.textContent === 'Article Writer'))
check('Sesi login tersimpan', sessionStorage.getItem('w95-auth') === '1' || hasSupabaseSession())
check('Tray menampilkan 🔑', !!document.querySelector('.tray-key'))

// ---- Writer: Save As hilang, Publish ada, cover ada ----
const writerWin = [...$('.w95-window')].find(w => w.querySelector('.w95-title-text')?.textContent === 'Article Writer')
check('Tombol "Save As" DIHAPUS', ![...writerWin.querySelectorAll('button')].some(b => b.textContent.replace(/\s+/g,' ').trim() === 'Save As'))
check('Tombol Publish ada', !!findBtn(writerWin, 'Publish'))
check('Input cover URL ada', !!writerWin.querySelector('#cover-url'))
check('Toolbar editor lengkap (>=18 tombol)', writerWin.querySelectorAll('.writer-toolbar .tbtn').length >= 18)

// ---- Tulis, Save (draft), lalu Publish ----
const titleInput = writerWin.querySelector('.writer-title')
titleInput.value = 'Artikel Uji Publikasi'
titleInput.dispatchEvent(new window.Event('input', { bubbles: true }))
writerWin.querySelector('.writer-page').innerHTML = '<p>Paragraf pembuka artikel uji. <img src="/img/siro.png"></p>'
findBtn(writerWin, 'Save').click()
await sleep(120)
let stored = JSON.parse(localStorage.getItem('w95-articles') || '[]')
check('Save → draft di localStorage', stored.length === 1 && stored[0].published === false)
check('Excerpt otomatis dibuat', stored[0].excerpt.includes('Paragraf pembuka'))
check('Cover otomatis dari gambar pertama', stored[0].cover === '/img/siro.png')
findBtn(writerWin, 'Publish').click()
await sleep(120)
stored = JSON.parse(localStorage.getItem('w95-articles') || '[]')
check('Publish → flag published true', stored[0].published === true)

// ---- Gazette: kartu, excerpt, RSS ----
document.querySelector('.start-btn').click(); await sleep(60)
;[...$('.start-menu li button')].find(b => b.textContent.includes('My Articles')).click()
await sleep(250)
const gazWin = [...$('.w95-window')].find(w => w.querySelector('.w95-title-text')?.textContent === 'My Articles')
check('Masthead Gazette tampil', gazWin.textContent.includes('MICHAEL95 GAZETTE'))
check('Tombol Subscribe RSS mengarah ke feed.xml', gazWin.querySelector('a.rss-btn')?.getAttribute('href')?.endsWith('feed.xml'))
check('Kartu artikel dengan thumbnail tampil', gazWin.querySelectorAll('.article-card').length >= 1 && !!gazWin.querySelector('.card-thumb img'))
check('Excerpt tampil di kartu', !!gazWin.querySelector('.card-excerpt'))
check('Badge NEW! tampil', gazWin.textContent.includes('NEW!'))
check('Tab Drafts tersedia untuk pemilik', !!findBtn(gazWin, 'Drafts'))
check('Export articles.json tersedia untuk pemilik', !!findBtn(gazWin, 'Export articles.json'))

// ---- Baca artikel ----
gazWin.querySelector('.card-title').click()
await sleep(120)
check('Membuka artikel menampilkan isi', gazWin.textContent.includes('Paragraf pembuka artikel uji'))
findBtn(gazWin, '← Semua Artikel').click()
await sleep(100)

// ---- Projects Editor ----
document.querySelector('.start-btn').click(); await sleep(60)
;[...$('.start-menu li button')].find(b => b.textContent.includes('Projects Editor')).click()
await sleep(300)
const peWin = [...$('.w95-window')].find(w => w.querySelector('.w95-title-text')?.textContent === 'Projects Editor')
check('Projects Editor terbuka (pemilik)', !!peWin)
const ta = peWin.querySelector('.notepad-area')
await sleep(150)
check('Textarea berisi JSON project', ta.value.includes('"title"'))
const arr = JSON.parse(ta.value)
arr.push({ title: 'Uji Project', desc: 'dari smoke test', link: 'https://example.com' })
ta.value = JSON.stringify(arr, null, 2)
ta.dispatchEvent(new window.Event('input', { bubbles: true }))
findBtn(peWin, 'Save').click()
await sleep(120)
check('Save editor → override tersimpan', (JSON.parse(localStorage.getItem('w95-projects') || '[]')).some(p => p.title === 'Uji Project'))
// validasi menolak JSON rusak
ta.value = '{rusak'
ta.dispatchEvent(new window.Event('input', { bubbles: true }))
findBtn(peWin, 'Validate').click()
await sleep(80)
check('Validator menolak JSON rusak', peWin.textContent.includes('JSON tidak valid'))

// ---- My Projects menampilkan hasil edit ----
document.querySelector('.start-btn').click(); await sleep(60)
;[...$('.start-menu li button')].find(b => b.textContent.includes('My Projects')).click()
await sleep(250)
const prWin = [...$('.w95-window')].find(w => w.querySelector('.w95-title-text')?.textContent === 'My Projects')
check('My Projects memuat project hasil edit', prWin.textContent.includes('Uji Project'))
check('Tombol Edit tampil untuk pemilik', !!findBtn(prWin, '✎ Edit'))

// ---- Logout: fitur tulis tersembunyi ----
document.querySelector('.start-btn').click(); await sleep(60)
;[...$('.start-menu li button')].find(b => b.textContent.includes('Log Out')).click()
await sleep(200)
check('Logout menghapus sesi', sessionStorage.getItem('w95-auth') !== '1' && !hasSupabaseSession())
check('Tombol Edit projects hilang bagi pengunjung', !findBtn(prWin, '✎ Edit'))
const gazWin2 = [...$('.w95-window')].find(w => w.querySelector('.w95-title-text')?.textContent === 'My Articles')
check('Pengunjung: tab Drafts & Export hilang', !findBtn(gazWin2, 'Drafts') && !findBtn(gazWin2, 'Export articles.json'))
check('Pengunjung tetap bisa membaca (kartu tampil)', gazWin2.querySelectorAll('.article-card').length >= 1)

// ---- Dark mode & neko (regresi) ----
document.querySelector('.start-btn').click(); await sleep(60)
;[...$('.start-menu li button')].find(b => b.textContent.includes('Control Panel')).click()
await sleep(200)
const cpWin = [...$('.w95-window')].find(w => w.querySelector('.w95-title-text')?.textContent === 'Control Panel')
const boxes = [...cpWin.querySelectorAll('.cp-row input[type=checkbox]')]
boxes[0].click(); await sleep(80)
check('Dark mode aktif & tersimpan', document.documentElement.dataset.theme === 'dark' && localStorage.getItem('w95-theme') === 'dark')
boxes[1].click(); await sleep(80)
check('Neko toggle tersimpan', localStorage.getItem('w95-neko') === 'off')
check('Control Panel punya seksi Account', cpWin.textContent.includes('Account'))

// ---- Window management (regresi) ----
const anyWin = $('.w95-window')[0]
const total = $('.w95-window').length
anyWin.querySelector('.tb-btn[title="Minimize"]').click(); await sleep(80)
check('Minimize bekerja', $('.w95-window').length === total - 1)
document.querySelectorAll('.task-btn')[0].click(); await sleep(80)
check('Restore via taskbar bekerja', $('.w95-window').length === total)
const w0 = $('.w95-window')[0]
w0.querySelector('.tb-btn[title="Maximize"]').click(); await sleep(80)
check('Maximize bekerja', document.querySelector('.w95-window').getAttribute('style').includes('100vw'))
w0.querySelector('.tb-close').click(); await sleep(80)
check('Close bekerja', $('.w95-window').length === total - 1)

// ---- URL sinkron dengan app aktif ----
check('URL mengikuti jendela aktif', location.pathname !== '/' && location.pathname.length > 1)

console.log(results.join('\n'))
const fails = results.filter(r => r.startsWith('FAIL'))
console.log(`\n${results.length - fails.length}/${results.length} PASS`)
process.exit(fails.length ? 1 : 0)
