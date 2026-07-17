<script>
  /**
   * Icon.svelte — <img> kecil dengan fallback:
   * jika ikon eksternal (mis. dari win98icons.alexmeub.com) gagal dimuat,
   * otomatis diganti ikon lokal agar UI tidak pernah "pecah".
   */
  let { src, alt = '', size = 16, fallback = '/icon/doc.ico', style = '' } = $props()
  let errored = $state(false)
  // reset flag error setiap kali sumber ikon berganti
  $effect(() => { src; errored = false })
  let current = $derived(errored ? fallback : src)
</script>

<img
  src={current}
  {alt}
  width={size}
  height={size}
  style={`image-rendering: pixelated; ${style}`}
  draggable="false"
  onerror={() => (errored = true)}
/>
