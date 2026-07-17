/**
 * url.js — allowlist skema URL (perbaikan SEC-05, SEC-06).
 *
 * Setiap URL yang berasal dari data (projects.json, localStorage, database,
 * input prompt editor) divalidasi di sini sebelum dipakai sebagai href/src.
 * Mengembalikan URL apa adanya bila aman, selain itu null.
 */

const LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])
const IMAGE_PROTOCOLS = new Set(['http:', 'https:'])

function protocolOf(raw) {
  try {
    return new URL(raw).protocol
  } catch {
    return null
  }
}

/** Path internal "/..." tapi bukan protocol-relative "//host". */
function isInternalPath(s) {
  return s.startsWith('/') && !s.startsWith('//')
}

/** URL aman untuk tautan yang diklik (href). */
export function safeLinkUrl(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null
  if (s.startsWith('#') || isInternalPath(s)) return s
  const proto = protocolOf(s)
  return proto && LINK_PROTOCOLS.has(proto) ? s : null
}

/** URL aman untuk sumber gambar (src). data:image;base64 diizinkan. */
export function safeImageUrl(raw) {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null
  if (isInternalPath(s)) return s
  if (/^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon);base64,/i.test(s)) return s
  const proto = protocolOf(s)
  return proto && IMAGE_PROTOCOLS.has(proto) ? s : null
}
