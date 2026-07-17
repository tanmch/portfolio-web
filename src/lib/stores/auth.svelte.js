/**
 * auth.svelte.js — otentikasi & otorisasi (perbaikan SEC-02 & SEC-07).
 *
 * DUA MODE:
 *
 *  1) SUPABASE (dipakai bila env PUBLIC_SUPABASE_* terisi):
 *     - OTENTIKASI: email + password apa pun yang terdaftar di Supabase
 *       Auth (signInWithPassword; password disimpan ber-bcrypt oleh GoTrue).
 *     - OTORISASI: hak menulis ditentukan tabel `public.owners` di
 *       database (cek lewat RPC `is_owner()` untuk UI, dan Row Level
 *       Security untuk penulisan data). Akun yang login tapi bukan
 *       pemilik hanya bisa membaca — flag di sini murni cermin UI,
 *       server tetap penegak akses satu-satunya.
 *
 *  2) LEGACY (tanpa Supabase): perbandingan hash SHA-256 di klien.
 *     Ini HANYA kunci UI, bukan keamanan — lihat catatan di data/config.js.
 */
import { OWNER_PASSWORD_HASH } from '../data/config.js'
import { supabase, supabaseEnabled } from '../supabaseClient.js'
import { refreshArticles } from './articles.svelte.js'
import { refreshProjects } from './projects.svelte.js'

const KEY = 'w95-auth'

function readLegacySession() {
  try { return sessionStorage.getItem(KEY) === '1' } catch { return false }
}

export const auth = $state({
  /** true = pemilik terverifikasi → UI menulis terbuka */
  loggedIn: supabaseEnabled ? false : readLegacySession(),
  /** email sesi Supabase aktif (bisa terisi walau bukan pemilik) */
  email: null,
  /** hasil cek keanggotaan tabel owners */
  isOwner: false,
  /** app yang diminta sebelum login — dibuka otomatis setelah berhasil */
  pendingAppId: null,
  /** 'supabase' = verifikasi server; 'legacy' = kunci UI saja */
  mode: supabaseEnabled ? 'supabase' : 'legacy',
})

/** Tanya server apakah user sesi ini pemilik (RPC → tabel owners). */
async function checkOwner() {
  try {
    const { data, error } = await supabase.rpc('is_owner')
    if (error) throw error
    return data === true
  } catch {
    return false
  }
}

async function applySession(session) {
  auth.email = session?.user?.email ?? null
  if (!session) {
    auth.isOwner = false
    auth.loggedIn = false
    return
  }
  auth.isOwner = await checkOwner()
  auth.loggedIn = auth.isOwner
}

if (supabaseEnabled) {
  supabase.auth.onAuthStateChange((_event, session) => {
    // Jangan await klien Supabase langsung di dalam callback ini
    // (bisa deadlock) — jadwalkan ke tick berikutnya.
    setTimeout(() => {
      applySession(session).then(() => {
        refreshArticles()
        refreshProjects()
      })
    }, 0)
  })
  supabase.auth.getSession().then(({ data }) => applySession(data?.session ?? null))
}

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * @param {{email?: string, password: string}} creds — email wajib pada mode
 *   Supabase; mode legacy hanya memakai password.
 * @returns {Promise<{ok: boolean, notOwner?: boolean, message?: string}>}
 */
export async function login({ email, password }) {
  if (supabaseEnabled) {
    if (!email?.trim() || !password) {
      return { ok: false, message: 'Isi email dan password.' }
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) {
        return {
          ok: false,
          message: error.status === 400
            ? 'Email atau password salah. Coba lagi.'
            : 'Tidak bisa terhubung ke server login. Coba lagi.',
        }
      }
      // onAuthStateChange juga akan jalan; set langsung agar UI responsif.
      const { data } = await supabase.auth.getSession()
      await applySession(data?.session ?? null)
      refreshArticles()
      refreshProjects()
      if (!auth.isOwner) {
        return {
          ok: false,
          notOwner: true,
          message: 'Login berhasil, tetapi akun ini bukan pemilik — fitur menulis tetap terkunci.',
        }
      }
      return { ok: true }
    } catch {
      return { ok: false, message: 'Tidak bisa terhubung ke server login. Coba lagi.' }
    }
  }

  const hash = await sha256hex(password)
  if (hash === OWNER_PASSWORD_HASH) {
    auth.loggedIn = true
    auth.isOwner = true
    try { sessionStorage.setItem(KEY, '1') } catch { /* ignore */ }
    return { ok: true }
  }
  return { ok: false, message: 'Password salah. Coba lagi.' }
}

export function logout() {
  auth.loggedIn = false
  auth.isOwner = false
  auth.email = null
  auth.pendingAppId = null
  if (supabaseEnabled) {
    supabase.auth.signOut().catch(() => { /* sesi lokal tetap dihapus */ })
    return
  }
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
}
