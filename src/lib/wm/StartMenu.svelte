<script>
  import { apps, getApp } from '../apps/registry.js'
  import { auth, logout } from '../stores/auth.svelte.js'
  import Icon from './Icon.svelte'
  let { onopen, onclose } = $props()
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<nav class="start-menu" aria-label="Start menu" onpointerdown={(e) => e.stopPropagation()}>
  <div class="start-side"><span>Michael<b>95</b></span></div>
  <ul>
    {#each apps.filter((a) => a.id !== 'login') as app (app.id)}
      <li>
        <button onclick={() => { onopen?.(app); onclose?.() }}>
          <Icon src={app.icon} fallback={app.fallback} size={24} alt="" />
          <span>{app.title}{app.ownerOnly && !auth.loggedIn ? ' 🔒' : ''}</span>
        </button>
      </li>
    {/each}
    <li class="start-sep" aria-hidden="true"></li>
    <li>
      {#if auth.loggedIn}
        <button onclick={() => { logout(); onclose?.() }}>
          <Icon src="https://win98icons.alexmeub.com/icons/png/key_win-2.png" fallback="/icon/computer.ico" size={24} alt="" />
          <span>Log Out…</span>
        </button>
      {:else}
        <button onclick={() => { onopen?.(getApp('login')); onclose?.() }}>
          <Icon src="https://win98icons.alexmeub.com/icons/png/keys-0.png" fallback="/icon/computer.ico" size={24} alt="" />
          <span>Log In…</span>
        </button>
      {/if}
    </li>
    <li class="start-sep" aria-hidden="true"></li>
    <li>
      <a href="https://github.com/tanmch/portfolio-web" target="_blank" rel="noreferrer">
        <Icon src="https://win98icons.alexmeub.com/icons/png/world-4.png" fallback="/icon/computer2.ico" size={24} alt="" />
        <span>Source Code…</span>
      </a>
    </li>
  </ul>
</nav>
