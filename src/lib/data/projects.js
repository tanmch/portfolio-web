/**
 * projects.js
 * ============================================================
 * TAMBAHKAN PROJECT BARU DI SINI — cukup tambah satu objek
 * ke array di bawah, pseudo-app "My Projects" akan otomatis
 * menampilkannya. Tidak perlu menyentuh kode lain.
 *
 * Field:
 *  - title : nama project (wajib)
 *  - desc  : deskripsi singkat (wajib)
 *  - link  : URL repo / demo (wajib)
 *  - icon  : (opsional) path/URL ikon, default /icon/doc.ico
 *  - year  : (opsional) tahun pengerjaan
 *  - tags  : (opsional) array string, mis. ["IoT", "Svelte"]
 * ============================================================
 */

// Daftar awal — TIDAK diubah dari versi orisinal portfolio.
export const projects = [
  {
    title: 'Gacorain',
    desc: 'Basic Clothesline Monitoring Webapps',
    link: 'https://github.com/tanmch/gacorain',
    icon: '/icon/Lamp 2.ico',
    tags: ['IoT', 'Web'],
  },
  {
    title: 'My DWM',
    desc: 'Personal DWM configs',
    link: 'https://github.com/logasans/My-DWM',
    icon: '/icon/computer2.ico',
    tags: ['Linux'],
  },
  {
    title: 'Mango as an Object Vision',
    desc: 'Mango Management Webapps w/Ripeness Detection Using YOLO',
    link: 'https://github.com/tanmch/mov',
    icon: '/icon/Chip 2.ico',
    tags: ['AI/ML', 'Web'],
  },
  {
    title: 'Lampu Server',
    desc: 'Basic Smart Lamp Control Implementation Using MQTT Protocol ',
    link: 'https://github.com/tanmch/lampu-server',
    icon: '/icon/Lamp 2.ico',
    tags: ['IoT', 'MQTT'],
  },
  // 👇 Contoh menambah project baru — hapus komentar dan sesuaikan:
  // {
  //   title: 'Project Baru Saya',
  //   desc: 'Deskripsi singkat project',
  //   link: 'https://github.com/tanmch/project-baru',
  //   icon: '/icon/doc.ico',
  //   year: 2026,
  //   tags: ['Web'],
  // },
]

// Sosial media — dipertahankan sama seperti versi orisinal.
export const socialMedia = [
  { title: 'Linkedin Profile', class: 'fa-brands fa-linkedin', link: 'https://www.linkedin.com/in/406430325/' },
  { title: 'Instagram Profile', class: 'fa-brands fa-instagram', link: 'https://instagram.com/realdonaldtrump' },
  { title: 'Email', class: 'fa-solid fa-envelope', link: 'mailto:michael.chrs@proton.me' },
]

export const lastUpdated = '24 January, 2026. Now with Svelte®'
