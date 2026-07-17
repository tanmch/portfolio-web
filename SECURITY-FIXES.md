# Remediasi Audit Keamanan — Michael95 Desktop Portfolio

Tindak lanjut atas `SECURITY-AUDIT.md` (12 Juli 2026). Semua temuan ditangani;
integrasi Supabase ditambahkan sebagai fondasi otentikasi & penyimpanan yang
diverifikasi server.

## Status Temuan

| ID | Temuan | Status | Perbaikan |
|----|--------|--------|-----------|
| SEC-01 | Stored XSS via `{@html}` | ✅ Diperbaiki | DOMPurify (`src/lib/security/sanitize.js`) diterapkan di **empat titik**: render artikel (`ArticlesApp`), simpan (`saveArticle`), muat-ke-editor & impor `.html` (`ArticleWriter`), ekspor `.html`. Allowlist URI: `http(s)`, `mailto`, `data:image/*;base64`, path internal. |
| SEC-02 | Auth sisi-klien | ✅ Diperbaiki (mode Supabase) | Login lewat **Supabase Auth** (`signInWithPassword`) — verifikasi di server, tidak ada hash di bundel yang berlaku. Penulisan data dijaga **Row Level Security** di database; flag `auth.loggedIn` kini hanya cermin UI, bukan penegak akses. Mode legacy (tanpa env Supabase) tetap ada sebagai fallback dan didokumentasikan jujur sebagai kunci UI. |
| SEC-03 | Tanpa CSP/security headers | ✅ Diperbaiki | CSP `<meta>` di-inject saat build (`vite.config.js`), `public/_headers` untuk host yang mendukung header (incl. `frame-ancestors`, `nosniff`), `<meta name="referrer">`. Catatan: `frame-ancestors` tidak bisa lewat `<meta>` — di GitHub Pages clickjacking hanya termitigasi parsial. |
| SEC-04 | CDN tanpa SRI | ✅/⚠️ Sebagian | SRI sha384 + `crossorigin` ditambahkan ke Font Awesome (cdnjs) & Bootstrap (jsDelivr). **webneko.js tidak bisa di-SRI** (server tanpa header CORS) dan **tidak boleh di-self-host** (lisensinya melarang). Risiko residual: kompromi webneko.net = eksekusi skrip penuh. Mitigasi: CSP membatasi sumber skrip; fitur bisa dimatikan via Control Panel. Pertimbangkan melepas fitur ini bila risiko tak diterima. |
| SEC-05 | `javascript:` URI via editor | ✅ Diperbaiki | `insertLink`/`insertImageUrl` memvalidasi skema (`safeLinkUrl`/`safeImageUrl`); DOMPurify lapisan kedua saat simpan/render. |
| SEC-06 | `link` data tanpa validasi | ✅ Diperbaiki | `validateProjects` menolak skema tak-aman; render `ProjectsApp`/`AboutApp` memakai `safeLinkUrl()`/`safeImageUrl()` (fallback `#`). |
| SEC-07 | SHA-256 tanpa salt | ✅ Diperbaiki (mode Supabase) | Password disimpan bcrypt oleh Supabase GoTrue di server. Hash legacy hanya dipakai bila Supabase tidak dikonfigurasi — jangan pakai ulang password itu di layanan lain. |
| SEC-08 | Redirect `?p=` | ✅ Diperbaiki | `App.svelte` memvalidasi `p` dengan regex `^[\w/.-]*$` dan menolak `..` sebelum `history.replaceState`. |
| SEC-09 | Kepercayaan pada storage | ✅ Diperbaiki | Validasi bentuk saat load (`articles`/`projects`); HTML dari storage selalu disanitasi saat render/masuk editor. Sesi Supabase diverifikasi server pada tiap request tulis. |
| SEC-10 | Higiene tautan | ✅ Diperbaiki | `rel="noopener noreferrer"` + `target="_blank"` konsisten di `AboutApp` & `ProjectsApp`. |

## Integrasi Supabase

Struktur (proyek ini **Vite + Svelte 5**, bukan SvelteKit — contoh
`$env/static/public` & `src/routes/+page.server.js` dari dokumentasi Supabase
diadaptasi ke pola Vite):

- `.env.local` — `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  (kunci publishable memang aman untuk browser; keamanan ada di RLS).
- `src/lib/supabaseClient.js` — klien tunggal; `null` bila env kosong →
  situs otomatis jatuh ke mode statis lama (JSON repo + localStorage).
- `supabase/schema.sql` — tabel `articles` & `site_documents` + kebijakan RLS.
- Stores (`articles.svelte.js`, `projects.svelte.js`) — baca/tulis database
  bila dikonfigurasi; fallback `public/data/*.json` bila DB tak terjangkau.
- Auth (`auth.svelte.js`) — Supabase Auth; email pemilik di
  `src/lib/data/config.js` (`OWNER_EMAIL`).

### Langkah aktivasi (sekali, di Dashboard Supabase)

1. **SQL Editor** → jalankan isi `supabase/schema.sql` (v3, idempoten — aman
   dijalankan ulang untuk upgrade dari v1/v2).
2. **Authentication → Users → Add user** — buat akun pemilik (email apa pun,
   password kuat & unik, centang "Auto confirm user").
3. **SQL Editor** → daftarkan akun itu sebagai pemilik (ganti emailnya):
   ```sql
   insert into public.owners (user_id, note)
   select id, 'pemilik situs' from auth.users where email = 'emailmu@contoh.com'
   on conflict (user_id) do nothing;
   ```
4. **Authentication → Sign In / Providers → Email** — matikan
   **"Allow new users to sign up"** (disarankan; akun baru pun tidak bisa
   menulis karena tidak terdaftar di `owners`, tapi sign-up publik tetap
   tidak diperlukan situs ini).
5. `npm run build` → deploy. Login di situs memakai email + password akun.

### Pengerasan v2–v3 (setelah audit)

- **v3 — otorisasi berbasis tabel `owners`**: login terbuka untuk akun
  Supabase mana pun (email + password), tetapi hak tulis hanya untuk user
  yang terdaftar di tabel `public.owners` (dicek `is_owner()` di dalam RLS).
  Tidak ada email hardcode di klien maupun SQL; tabel `owners` tidak punya
  kebijakan tulis sehingga tidak bisa diubah lewat API. Akun non-pemilik
  yang login diberi tahu di UI dan tetap hanya bisa membaca.
- **CHECK constraint** di server: format `id`, panjang `title`/`html`/`cover`/
  `excerpt`, allowlist `key` untuk `site_documents`, batas ukuran dokumen —
  payload abnormal ditolak database walau klien dimanipulasi.
- Klien hanya mengirim request tulis bila ada **sesi login sah**
  (`withSession()` di stores) — mengurangi noise & permukaan request anonim.
- Cover artikel kini murni thumbnail (tidak dirender ganda di isi artikel).
- **Pipeline gambar** (`security/image.js` + `images.js`): upload dari editor
  dikompres di browser (resize + re-encode WebP via canvas — EXIF terbuang,
  payload gambar termanipulasi ternetralkan) lalu disimpan ke **Supabase
  Storage** bucket `images`; artikel menyimpan URL, bukan base64. Server
  menegakkan batas 5MB/file + allowlist MIME di bucket, dan tulis/hapus
  objek hanya untuk pemilik (policy `is_owner()`). Fallback tanpa
  Storage/login: base64 terkompres.

### Alur konten setelah Supabase aktif

- **Artikel**: Save/Publish/Hapus langsung tersinkron ke database dan tayang
  tanpa commit. Export `.html`/`articles.json` tetap tersedia sebagai cadangan.
- **Projects**: Save di Projects Editor langsung menulis ke database.
- Bila database mati/tak terjangkau, situs menampilkan `public/data/*.json`.

## Verifikasi

- `npm run build` — sukses, CSP ter-inject di `dist/index.html`.
- `npm test` (smoke, jsdom + stub jaringan Supabase) — semua PASS.
- `npm audit` — 0 kerentanan.
