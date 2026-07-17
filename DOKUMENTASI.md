# DOKUMENTASI — Michael95 Desktop Portfolio (v2)

Portfolio web berkonsep **Windows 95**: window management sungguhan, blog artikel bergaya "Gazette" retro dengan alur publikasi khusus pemilik, login sederhana, RSS feed, routing lewat URL, dan pseudo-app modular — dibangun **tanpa mengubah isi awal** situs.

- Framework: **Svelte 5 (runes)** + **Vite 7** — situs sepenuhnya **statis**
- Pengujian: **48 kasus otomatis, semuanya PASS** (`npm test`)

---

## 1. Pemenuhan Kebutuhan

### Tahap 1
| # | Permintaan | Implementasi |
|---|-----------|--------------|
| 1 | Window management ala Win95 | drag, resize, minimize, maximize/restore, close, fokus/z-order, taskbar, Start Menu (`src/lib/wm/`) |
| 2 | Editor artikel lengkap | Article Writer bergaya WordPad (§6) |
| 3 | Dark mode toggle | Control Panel / ikon ☀︎☾ di tray (§8) |
| 4 | Isi awal utuh; About & Projects pseudo-app terpisah | `AboutApp`, `ProjectsApp` (§12) |
| 5 | Dokumentasi + audit detail | file ini, §13–§14 |
| 6 | Ikon dari situs penyedia | win98icons.alexmeub.com + fallback lokal |
| 7 | Toggle kucing via pseudo-app | Control Panel → Desktop Pets |
| 8 | Tetap tema Win95 | seluruh UI, termasuk dark mode |

### Tahap 2 (saran terbaru)
| # | Saran | Implementasi |
|---|-------|--------------|
| 1 | Hanya pemilik yang bisa menulis; pengunjung hanya membaca | Model publikasi dua lapis (§4) + gerbang login pada Article Writer & Projects Editor |
| 2 | Kolom artikel menampilkan gambar + cuplikan isi, retro | **Michael95 Gazette**: masthead koran double-border, kartu ber-thumbnail sunken-bevel, excerpt serif, badge **NEW!** berkedip khas 90-an (§5) |
| 3 | Login simpel khusus pemilik | Dialog logon ala Win95, password SHA-256, sesi sessionStorage (§7) |
| 4 | Subscribe RSS | `public/feed.xml` digenerate otomatis dari artikel terpublikasi; tombol **📡 Subscribe RSS** di Gazette (§9) |
| 5 | Tidak auto-membuka About; app dibuka via URL | Root `/` = desktop kosong; `/about`, `/articles`, `/articles/<id>`, dst. (§10) |
| 6 | Edit My Projects lewat text editor | **Projects Editor** bergaya Notepad: JSON + Validate/Save/Export (§11) |
| 7 | Hapus "Save As" | Dihapus; diganti alur Save (draft) → **Publish** |

---

## 2. Menjalankan

```bash
npm install
npm run dev        # pengembangan
npm run build      # generate RSS + build produksi → dist/
npm run rss        # generate public/feed.xml saja
npm test           # 48 smoke test (jalankan build dulu)
```

⚠️ **Sebelum deploy**: ganti password default & `SITE_URL` di `src/lib/data/config.js` (§7), dan bila deploy di sub-path (GitHub *project* pages) atur `base` di `vite.config.js` serta `pathSegmentsToKeep` di `public/404.html` (§10).

---

## 3. Struktur Proyek (tambahan v2 ditandai ✚)

```
├── index.html
├── public/
│   ├── data/articles.json    ✚ artikel TERPUBLIKASI (sumber kebenaran)
│   ├── data/projects.json    ✚ daftar project TERPUBLIKASI
│   ├── feed.xml              ✚ RSS (hasil generate)
│   └── 404.html              ✚ fallback deep-link utk hosting statis
├── scripts/generate-rss.mjs  ✚ generator RSS (hook `npm run build`)
├── src/
│   ├── App.svelte              desktop shell + ROUTING + gerbang login
│   ├── style.css               gaya orisinal utuh + blok Michael95
│   └── lib/
│       ├── data/
│       │   ├── config.js     ✚ SITE_URL, judul, HASH PASSWORD pemilik
│       │   └── projects.js     data orisinal (fallback + konten About)
│       ├── stores/
│       │   ├── auth.svelte.js       ✚ login/logout pemilik
│       │   ├── articles.svelte.js     model artikel dua lapis
│       │   ├── projects.svelte.js   ✚ model projects dua lapis
│       │   └── settings.svelte.js     tema + neko
│       ├── wm/ …                     window manager (tak berubah besar)
│       └── apps/
│           ├── registry.js           + flag `ownerOnly`
│           ├── ArticlesApp.svelte    ✚ Michael95 Gazette
│           ├── ArticleWriter.svelte  cover, Publish, Export JSON
│           ├── ProjectsApp.svelte    baca dari store dua lapis
│           ├── ProjectsEditor.svelte ✚ editor JSON gaya Notepad
│           ├── LoginApp.svelte       ✚ dialog logon
│           └── … (About, Support, Settings, Help)
└── tests/smoke.mjs             48 kasus
```

---

## 4. Model Publikasi (inti saran #1)

Situs ini statis (tanpa server), jadi "hanya saya yang bisa menulis" diwujudkan dengan **dua lapis data** yang jujur:

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  LOCAL (localStorage)      │        │  SHIPPED (file di repo)      │
│  draft & suntinganmu —     │ export │  public/data/articles.json   │
│  hanya ada di browsermu    │──────► │  → dilihat SEMUA pengunjung  │
└────────────────────────────┘ commit └──────────────────────────────┘
```

**Alur menulis sampai tayang:**
1. **Log In** → buka **Article Writer** → tulis & format.
2. **Save** → tersimpan sebagai *draft* (tab Drafts di Gazette).
3. **Publish ▲** → ditandai terpublikasi *di browsermu* (badge "belum di-commit").
4. **Export articles.json** (di Writer atau Gazette) → unduh file final.
5. Ganti `public/data/articles.json` di repo → `npm run rss` (opsional; build juga menjalankannya) → **commit & push** → artikel tayang untuk semua orang + masuk RSS.

Pengunjung tanpa login: hanya melihat artikel dari file repo; tombol tulis/edit/hapus tidak dirender, dan Article Writer/Projects Editor selalu dialihkan ke dialog Log In.

---

## 5. Michael95 Gazette (saran #2)

App *My Articles* kini tampil seperti koran retro:
- **Masthead** "✦ MICHAEL95 GAZETTE ✦" dengan double-border khas koran + tagline serif italic.
- **Kartu artikel**: thumbnail 118×86 ber-bevel cekung (sunken) khas Win95, judul link biru bergaris bawah, tanggal 📅, **cuplikan isi** (excerpt) berhuruf serif, pemisah titik-titik.
- **Badge "NEW!"** kuning-navy **berkedip** (CSS steps blink — dimatikan otomatis bila `prefers-reduced-motion`).
- Halaman baca menampilkan **cover besar** berbingkai bevel.
- **Cover** diatur dari kolom "Cover (URL gambar)" di Writer; jika kosong otomatis memakai **gambar pertama** dalam artikel. **Excerpt** dibuat otomatis (±160 karakter teks polos).

## 6. Article Writer (perubahan)

- ❌ **Save As dihapus** (saran #7).
- ✚ Baris **Cover URL**, tombol **Publish ▲**, tombol **Export JSON** (articles.json siap commit).
- Tetap: toolbar format lengkap (undo/redo, heading, ukuran, B/I/U/S, warna, highlight, perataan, list, indent, tautan, gambar URL/file, garis, hapus format), Export .html per artikel, Import .html, penghitung kata, preservasi seleksi teks.

## 7. Login Pemilik (saran #3)

- Buka lewat Start Menu → **Log In…**, Control Panel → Account, atau otomatis saat membuka app terkunci (ikon 🔒). Setelah sukses, app yang tadi diminta **terbuka otomatis**. Tray menampilkan 🔑 saat masuk; **Log Out** ada di Start Menu & Control Panel.
- Password dicocokkan sebagai **SHA-256** terhadap `OWNER_PASSWORD_HASH` di `src/lib/data/config.js`. Default **`michael95`** — **WAJIB diganti**:
  ```bash
  echo -n "passwordbaru" | sha256sum   # salin hex-nya ke config.js
  ```
- Sesi di `sessionStorage` (habis saat tab ditutup).
- **Catatan jujur soal keamanan**: tanpa backend, login ini adalah *gerbang UI*, bukan proteksi kriptografis — orang yang membedah kode bisa melihat hash. Itu tidak membahayakan kontenmu karena **publikasi tetap membutuhkan commit ke repo**; yang terburuk bisa dilakukan penyusup hanyalah menulis draft di browsernya sendiri.

## 8. Dark Mode & 🐈 Neko

Tidak berubah dari v1: CSS variables + `html[data-theme]`, persist `localStorage`; neko webneko.net dimuat kondisional dan bisa on/off tanpa reload. Keduanya di Control Panel (+ shortcut di tray).

## 9. RSS (saran #4)

- `scripts/generate-rss.mjs` membaca `public/data/articles.json` → menulis **`public/feed.xml`** (RSS 2.0: judul, link `/articles/<id>`, pubDate, description = excerpt, enclosure cover).
- Otomatis dijalankan oleh `npm run build`; manual: `npm run rss`.
- Tombol **📡 Subscribe RSS** di masthead Gazette menaut ke `feed.xml` — bisa dipakai di reader mana pun (Feedly, Thunderbird, dll.).
- Pastikan `SITE_URL` di `config.js` benar agar tautan feed valid.

## 10. Routing via URL (saran #5)

- Membuka situs di **`/`** = desktop kosong (tidak ada jendela yang auto-terbuka).
- Path membuka app: **`/about`**, **`/projects`**, **`/articles`**, **`/articles/<id>`** (langsung ke artikel), **`/writer`**, **`/settings`** (alias `/control-panel`), **`/support`**, **`/help`**, **`/login`**; alias `/blog` → articles.
- URL **mengikuti jendela aktif** (via `replaceState`, tanpa menyampah history); tombol back/forward (popstate) juga membuka app terkait.
- **Deep-link di hosting statis**: `public/404.html` mengalihkan path tak dikenal ke `/?p=<path>` lalu App memulihkannya (teknik SPA GitHub Pages). Untuk **project pages** (situs di `…/portfolio-web/`): set `pathSegmentsToKeep = 1` di `404.html` **dan** `base: '/portfolio-web/'` di `vite.config.js`.

## 11. Projects Editor (saran #6)

App bergaya **Notepad** (monospace, bidang bevel cekung), khusus pemilik:
- Berisi JSON daftar project; tombol **Validate** (skema dicek: `title/desc/link` wajib string, `tags` array), **Save** (pratinjau lokal — langsung terlihat di *My Projects* dengan label "pratinjau suntingan lokal"), **Reset ke Repo**, **Export projects.json**.
- Publikasi sama seperti artikel: ganti `public/data/projects.json` → commit.
- *My Projects* memuat: suntingan lokal → `projects.json` repo → fallback daftar orisinal. Tombol **✎ Edit** muncul hanya saat login.

## 12. Preservasi Konten Orisinal

Tetap seperti v1: `AboutApp`/`SupportApp` memuat markup orisinal apa adanya; `data/projects.js` orisinal dipertahankan (kini sebagai fallback + sumber konten About); backup file lama di `backups/`. `public/data/projects.json` diisi persis daftar orisinal.

## 13. Pengujian

`npm run build && npm test` → **48/48 PASS**, mencakup: desktop kosong di `/`, routing `/about`, integritas konten orisinal, penandaan 🔒, gerbang login (password salah ditolak, benar membuka app tertunda, sesi tersimpan), **Save As benar-benar hilang**, cover & excerpt otomatis, alur Save→Publish, masthead/kartu/thumbnail/excerpt/badge NEW!/RSS link, baca artikel, Projects Editor (isi JSON, save override, validator menolak JSON rusak), propagasi ke My Projects, logout menyembunyikan semua kontrol tulis namun pengunjung tetap bisa membaca, regresi dark mode/neko/window management, sinkronisasi URL.

## 14. Audit & Batasan

Temuan audit v1 masih berlaku (bug `project.href` diperbaiki; link Instagram masih placeholder — mohon dicek). Batasan v2:
- Draft bersifat per-browser (localStorage); artikel besar dengan gambar base64 memakan kuota (±5 MB) — untuk publikasi, gambar via URL lebih hemat.
- Menghapus artikel yang **sudah di repo** hanya bisa lewat commit (hapus dari `articles.json`); tombol Hapus di UI hanya membuang versi lokal.
- Keamanan login: lihat catatan §7.
- `feed.xml` dibuat saat build — artikel baru masuk feed setelah build/deploy berikutnya.
