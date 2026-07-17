import { defineConfig, loadEnv } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'PUBLIC_'])
  let supabaseOrigin = ''
  try { supabaseOrigin = new URL(env.PUBLIC_SUPABASE_URL).origin } catch { /* Supabase tidak dikonfigurasi */ }

  /*
   * SEC-03: Content Security Policy — di-inject sebagai <meta> saat build
   * (GitHub Pages tidak mendukung header kustom; host lain juga membaca
   * public/_headers). Tidak dipasang saat dev agar HMR (websocket) jalan.
   *
   * 'unsafe-eval' dibutuhkan HANYA oleh skrip kucing webneko (kode 2004
   * yang memakai eval() internal). Hapus bersama neko-loader.js bila
   * fitur kucing dilepas.
   */
  const csp = [
    "default-src 'self'",
    "script-src 'self' https://webneko.net 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net",
    "img-src 'self' data: https:",
    "font-src 'self' https://cdnjs.cloudflare.com",
    `connect-src 'self'${supabaseOrigin ? ' ' + supabaseOrigin : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')

  return {
    // Supabase env memakai prefix PUBLIC_ (mengikuti konvensi dashboard Supabase).
    envPrefix: ['VITE_', 'PUBLIC_'],
    plugins: [
      svelte(),
      {
        name: 'inject-csp-meta',
        apply: 'build',
        transformIndexHtml(html) {
          return html.replace(
            '<meta charset="UTF-8">',
            `<meta charset="UTF-8">\n  <meta http-equiv="Content-Security-Policy" content="${csp}">`
          )
        },
      },
    ],
  }
})
