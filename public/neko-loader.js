/*
 * neko-loader.js — memuat kucing interaktif webneko.net secara kondisional
 * (localStorage 'w95-neko'; toggle di Control Panel).
 *
 * Catatan keamanan (SEC-04): skrip ini pihak ketiga dan TIDAK bisa diberi
 * Subresource Integrity — servernya tidak mengirim header CORS (SRI butuh
 * crossorigin), dan lisensinya melarang self-hosting. Risiko rantai-pasok
 * residual didokumentasikan di SECURITY-FIXES.md; CSP membatasi skrip
 * eksternal hanya ke https://webneko.net.
 */
window.NekoType = 'socks';
(function () {
  var enabled = true;
  try { enabled = localStorage.getItem('w95-neko') !== 'off'; } catch (e) {}
  if (!enabled) return;
  var s = document.createElement('script');
  s.src = 'https://webneko.net/n20171213.js';
  s.id = 'webneko-script';
  document.head.appendChild(s);
})();
