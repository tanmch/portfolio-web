/**
 * supabaseClient.js — klien Supabase untuk database & otentikasi.
 *
 * Proyek ini Vite murni (bukan SvelteKit), jadi env dibaca lewat
 * `import.meta.env.PUBLIC_*` (lihat `envPrefix` di vite.config.js),
 * bukan `$env/static/public`.
 *
 * Kunci "publishable" (sb_publishable_…) memang dirancang untuk dikirim
 * ke browser — keamanannya ditegakkan oleh Row Level Security di server
 * (lihat supabase/schema.sql), bukan oleh kerahasiaan kunci.
 *
 * Bila env tidak diisi, `supabase` bernilai null dan seluruh situs
 * berjalan dalam mode statis lama (JSON repo + localStorage).
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

/** true bila Supabase dikonfigurasi (mode database aktif). */
export const supabaseEnabled = !!supabase
