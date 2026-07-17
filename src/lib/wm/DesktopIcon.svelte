<script>
  import Icon from './Icon.svelte'
  let { app, selected = false, locked = false, onselect, onopen } = $props()

  // Dukungan sentuh: tap kedua dalam 400ms dihitung double-tap.
  let lastTap = 0
  function handleClick(e) {
    e.stopPropagation()
    const nowT = Date.now()
    if (nowT - lastTap < 400) onopen?.(app)
    else onselect?.(app)
    lastTap = nowT
  }
</script>

<button
  class="desk-icon"
  class:selected
  onclick={handleClick}
  ondblclick={() => onopen?.(app)}
  onkeydown={(e) => e.key === 'Enter' && onopen?.(app)}
>
  <span class="desk-icon-img">
    <Icon src={app.icon} fallback={app.fallback} size={32} alt="" />
    {#if locked}<span class="desk-icon-lock" title="Perlu login pemilik">🔒</span>{/if}
  </span>
  <span class="desk-icon-label">{app.title}</span>
</button>
