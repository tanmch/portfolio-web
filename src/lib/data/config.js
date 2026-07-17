/**
 * config.js — konfigurasi situs & akun pemilik.
 *
 * ── LOGIN ───────────────────────────────────────────────────
 * Bila Supabase dikonfigurasi (.env.local → PUBLIC_SUPABASE_*),
 * login memakai email + password akun Supabase Auth mana pun.
 * HAK MENULIS ditentukan tabel `owners` di database (lihat
 * supabase/schema.sql) — tidak ada email hardcode di kode.
 * OWNER_PASSWORD_HASH di bawah TIDAK dipakai pada mode itu.
 *
 * ── MODE LEGACY (tanpa Supabase) ────────────────────────────
 * OWNER_PASSWORD_HASH adalah SHA-256 (hex) dari password login.
 * Default: "michael95"  ← WAJIB DIGANTI sebelum deploy!
 *
 * Cara membuat hash baru (pilih salah satu):
 *   • Terminal :  echo -n "passwordbaru" | sha256sum
 *   • Node     :  node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode('passwordbaru')).then(b=>console.log([...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')))"
 *
 * CATATAN KEAMANAN (jujur): pada mode legacy login ini hanya
 * MENGUNCI UI editor dari pengunjung biasa — bukan keamanan
 * kriptografis sungguhan (hash ikut terkirim ke semua pengunjung
 * dan bisa di-brute-force offline; JANGAN pakai ulang password ini
 * di layanan lain). Perlindungan sebenarnya: konten hanya tayang
 * setelah commit ke repo. Mode Supabase memperbaiki ini: verifikasi
 * terjadi di server dan penulisan database dijaga RLS.
 * ────────────────────────────────────────────────────────────
 */

export const SITE_TITLE = 'A Web Portfolio | Michael'
export const SITE_DESC =
  "Michael's Portofolio — Now with Interactive Desktop!"
// URL produksi situs — dipakai untuk tautan di RSS feed. Sesuaikan!
export const SITE_URL = 'https://michaeldoesthejob.dev'

export const OWNER_NAME = 'Michael'
export const OWNER_PASSWORD_HASH =
  'cec8dbc33bac907bb8607c26af6f8bd1fa6367e1df1cc628f0b78102487af0e2' // "michael95"
