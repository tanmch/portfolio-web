/**
 * projects.svelte.js — daftar project dua lapis (sama seperti artikel):
 *  - SHIPPED  : dokumen `projects` di Supabase (bila dikonfigurasi);
 *               fallback public/data/projects.json (dilihat semua pengunjung)
 *  - OVERRIDE : suntingan pemilik di localStorage (pratinjau lokal)
 * Fallback terakhir: daftar orisinal di data/projects.js.
 *
 * Mode Supabase: Save di Projects Editor langsung menulis dokumen ke
 * database (dijaga RLS — hanya sesi terotentikasi). Mode legacy:
 * Export projects.json → ganti public/data/projects.json → commit.
 *
 * KEAMANAN (SEC-06): field `link`/`icon` divalidasi skemanya —
 * javascript:/data: dsb. ditolak validator DAN dinetralkan saat render.
 */
import { projects as defaults } from '../data/projects.js'
import { supabase, supabaseEnabled } from '../supabaseClient.js'
import { safeLinkUrl, safeImageUrl } from '../security/url.js'

const KEY = 'w95-projects'
const BASE = import.meta.env.BASE_URL || '/'
const DOC_KEY = 'projects'

/** Validasi struktural satu daftar project (dipakai loadOverride & validator). */
function validateProjectsData(data) {
  if (!Array.isArray(data)) return { ok: false, error: 'Harus berupa array [ ... ].' }
  for (let i = 0; i < data.length; i++) {
    const p = data[i]
    if (typeof p !== 'object' || p === null)
      return { ok: false, error: `Item #${i + 1} bukan objek.` }
    for (const f of ['title', 'desc', 'link'])
      if (typeof p[f] !== 'string' || !p[f].trim())
        return { ok: false, error: `Item #${i + 1}: field "${f}" wajib berupa string.` }
    if (!safeLinkUrl(p.link))
      return { ok: false, error: `Item #${i + 1}: "link" harus URL http(s)/mailto atau path internal "/..." — skema lain ditolak.` }
    if (p.icon != null && !safeImageUrl(p.icon))
      return { ok: false, error: `Item #${i + 1}: "icon" harus URL http(s) atau path internal "/...".` }
    if (p.tags && !Array.isArray(p.tags))
      return { ok: false, error: `Item #${i + 1}: "tags" harus array string.` }
  }
  return { ok: true, data }
}

function loadOverride() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || 'null')
    // SEC-09: localStorage bisa ditulis pihak lain — validasi dulu.
    return Array.isArray(parsed) && validateProjectsData(parsed).ok ? parsed : null
  } catch {
    return null
  }
}

export const projectsStore = $state({
  shipped: null,
  loaded: false,
  override: loadOverride(),
  dbError: null,
})

/** true bila daftar project disimpan di database. */
export const projectsUseDb = supabaseEnabled

export async function loadShippedProjects() {
  if (projectsStore.loaded) return

  if (supabaseEnabled) {
    try {
      const { data, error } = await supabase
        .from('site_documents')
        .select('value')
        .eq('key', DOC_KEY)
        .maybeSingle()
      if (error) throw error
      if (data && validateProjectsData(data.value).ok) {
        projectsStore.shipped = data.value
        projectsStore.loaded = true
        return
      }
    } catch {
      /* DB tidak terjangkau → fallback JSON repo */
    }
  }

  try {
    const res = await fetch(`${BASE}data/projects.json`, { cache: 'no-cache' })
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) projectsStore.shipped = data
    }
  } catch { /* offline — pakai fallback */ }
  projectsStore.loaded = true
}

/** Paksa muat ulang dari sumber (dipanggil saat login/logout). */
export function refreshProjects() {
  projectsStore.loaded = false
  return loadShippedProjects()
}

/** Daftar efektif yang dirender. */
export function effectiveProjects() {
  return projectsStore.override ?? projectsStore.shipped ?? defaults
}

/** Validasi teks JSON dari editor; return { ok, error?, data? } */
export function validateProjects(jsonText) {
  let data
  try {
    data = JSON.parse(jsonText)
  } catch (e) {
    return { ok: false, error: 'JSON tidak valid: ' + e.message }
  }
  return validateProjectsData(data)
}

export function saveOverride(data) {
  projectsStore.override = data
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch { /* ignore */ }

  // Mode Supabase: publikasikan langsung ke database (RLS menjaga penulisan).
  // Request tulis hanya dikirim bila ada sesi login yang sah.
  if (supabaseEnabled) {
    supabase.auth.getSession().then(({ data: s }) => {
      if (!s?.session) return
      supabase
        .from('site_documents')
        .upsert({ key: DOC_KEY, value: data, updated_at: new Date().toISOString() })
        .then(({ error }) => {
          if (error) {
            projectsStore.dbError = error.message
            return
          }
          projectsStore.dbError = null
          projectsStore.shipped = data
        })
    })
  }
}

export function resetOverride() {
  projectsStore.override = null
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

export function exportProjectsJson() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(effectiveProjects(), null, 2)], { type: 'application/json' })
  )
  const a = document.createElement('a')
  a.href = url
  a.download = 'projects.json'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
