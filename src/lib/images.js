/**
 * images.js — pipeline upload gambar editor.
 *
 * Alur: kompres di browser (security/image.js) → upload ke Supabase
 * Storage bucket `images` (publik-baca, tulis hanya pemilik via policy
 * is_owner()) → artikel menyimpan URL pendek, bukan base64.
 *
 * Fallback (tanpa Supabase / belum login / upload gagal): data URL
 * base64 dari hasil kompresi — tetap jauh lebih kecil dari file asli.
 */
import { supabase, supabaseEnabled } from './supabaseClient.js'
import { compressImage, blobToDataUrl, MAX_UPLOAD_BYTES } from './security/image.js'

const BUCKET = 'images'

const PRESETS = {
  article: { maxDim: 1600, quality: 0.82 },
  cover:   { maxDim: 800,  quality: 0.8 },
}

/**
 * @param {File} file  gambar mentah dari <input type="file">
 * @param {'article'|'cover'} kind
 * @returns {Promise<{url: string, uploaded: boolean}>}
 */
export async function processAndStoreImage(file, kind = 'article') {
  const img = await compressImage(file, PRESETS[kind] ?? PRESETS.article)
  if (img.size > MAX_UPLOAD_BYTES) {
    throw new Error('Gambar masih terlalu besar setelah kompresi (maks 5MB).')
  }

  if (supabaseEnabled) {
    const { data } = await supabase.auth.getSession()
    if (data?.session) {
      const ext = img.type === 'image/gif' ? 'gif' : 'webp'
      const path = `${kind}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, img, { contentType: img.type, cacheControl: '31536000' })
      if (!error) {
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
        if (pub?.publicUrl) return { url: pub.publicUrl, uploaded: true }
      }
      // upload gagal → jatuh ke fallback base64 di bawah
    }
  }

  return { url: await blobToDataUrl(img), uploaded: false }
}

/**
 * Migrasikan satu data URL base64 (peninggalan lama / fallback offline)
 * menjadi URL Storage. Mengembalikan URL pengganti, atau null bila tidak
 * bisa/tidak menguntungkan (biarkan aslinya).
 */
export async function storeDataUrl(dataUrl, kind = 'article') {
  const m = /^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(dataUrl)
  if (!m) return null
  let bytes
  try {
    const bin = atob(m[2])
    bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  } catch {
    return null
  }
  const file = new File([bytes], 'inline', { type: m[1].toLowerCase() })
  const { url, uploaded } = await processAndStoreImage(file, kind)
  if (uploaded) return url
  // Tidak terunggah (offline/belum login): pakai hasil kompresi hanya bila
  // benar-benar lebih kecil dari aslinya.
  return url.length < dataUrl.length ? url : null
}
