/**
 * image.js — kompresi & normalisasi gambar di sisi klien.
 *
 * Semua gambar yang di-upload lewat editor melewati compressImage():
 *  - divalidasi tipenya (allowlist MIME),
 *  - di-resize ke dimensi maksimum,
 *  - di-encode ulang ke WebP lewat canvas.
 *
 * Encode ulang sekaligus langkah keamanan: metadata EXIF (lokasi, perangkat)
 * terbuang dan payload gambar yang dimanipulasi dinetralkan — yang tersimpan
 * hanya piksel hasil decode browser. Kompresi terjadi di browser penulis,
 * jadi tidak membebani server/VPS sama sekali.
 */

const INPUT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/bmp',
])

/** Batas ukuran hasil akhir (selaras file_size_limit bucket di schema.sql). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
/** Batas ukuran file sumber sebelum diproses (tolak sejak awal yang absurd). */
const MAX_SOURCE_BYTES = 30 * 1024 * 1024

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    return await createImageBitmap(file)
  }
  // Fallback browser lama.
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = () => rej(new Error('Gambar tidak bisa dibaca.'))
      img.src = url
    })
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * @param {File} file
 * @param {{maxDim?: number, quality?: number}} opts
 * @returns {Promise<File>} gambar terkompresi (WebP), atau file asli bila
 *   memang sudah lebih kecil dan tak perlu di-resize.
 */
export async function compressImage(file, { maxDim = 1600, quality = 0.82 } = {}) {
  if (!INPUT_TYPES.has(file.type)) {
    throw new Error('Format tidak didukung — pakai JPEG/PNG/WebP/GIF/AVIF/BMP.')
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('File terlalu besar (maks 30MB sebelum kompresi).')
  }

  // GIF kecil dilewatkan apa adanya: canvas mematikan animasinya.
  if (file.type === 'image/gif' && file.size <= 1024 * 1024) return file

  const src = await decode(file)
  const sw = src.width ?? src.naturalWidth
  const sh = src.height ?? src.naturalHeight
  const scale = Math.min(1, maxDim / Math.max(sw, sh))
  const w = Math.max(1, Math.round(sw * scale))
  const h = Math.max(1, Math.round(sh * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(src, 0, 0, w, h)
  src.close?.()

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', quality))
  if (!blob) throw new Error('Kompresi gambar gagal di browser ini.')

  // Hasil kompresi lebih besar & tanpa resize? pakai file asli saja.
  if (blob.size >= file.size && scale === 1) return file
  return new File([blob], 'image.webp', { type: 'image/webp' })
}

/** Blob/File → data URL base64 (fallback saat tidak ada Supabase Storage). */
export function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const reader = new FileReader()
    reader.onload = () => res(String(reader.result))
    reader.onerror = () => rej(new Error('Gagal membaca file.'))
    reader.readAsDataURL(blob)
  })
}
