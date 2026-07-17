/**
 * sanitize.js — sanitasi HTML tak-tepercaya (perbaikan SEC-01, SEC-05, SEC-09).
 *
 * Semua HTML artikel (dari articles.json, localStorage, database Supabase,
 * editor contenteditable, maupun file .html yang diimpor) WAJIB melewati
 * sanitizeHtml() sebelum masuk DOM lewat `{@html}` / `innerHTML`.
 *
 * DOMPurify membuang <script>, event handler (onerror/onload/…), dan skema
 * URI berbahaya. Kebijakan URL diperketat lewat hook di bawah agar satu
 * sumber kebenaran dengan security/url.js (javascript:, data:text/html,
 * dan URL protocol-relative "//host" ditolak; data:image base64 tetap
 * boleh untuk gambar tempel dari editor).
 */
import DOMPurify from 'dompurify'
import { safeLinkUrl, safeImageUrl } from './url.js'

/** Atribut yang nilainya adalah URL dan harus lolos allowlist skema. */
const URL_ATTRS = ['href', 'src', 'xlink:href', 'action', 'formaction', 'background']

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!node.hasAttribute) return
  for (const attr of URL_ATTRS) {
    if (!node.hasAttribute(attr)) continue
    const value = node.getAttribute(attr)
    if (!safeLinkUrl(value) && !safeImageUrl(value)) node.removeAttribute(attr)
  }
})

export function sanitizeHtml(dirty) {
  return DOMPurify.sanitize(dirty ?? '', {
    // <style> bisa dipakai untuk exfiltration/UI-overlay; editor tidak memakainya.
    FORBID_TAGS: ['style', 'form'],
  })
}
