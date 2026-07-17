<script>
  /**
   * SettingsApp.svelte — "Control Panel" ala Windows 95.
   * - Toggle Dark Mode (tema desktop & jendela)
   * - Toggle "Kucing Interaktif" (webneko) — bisa on/off tanpa reload
   */
  import { settings, toggleTheme, toggleNeko } from '../stores/settings.svelte.js'
  import { auth, logout } from '../stores/auth.svelte.js'
  import { openApp } from '../wm/wm.svelte.js'
  import { getApp } from './registry.js'
</script>

<div class="app-pad">
  <fieldset class="w95-fieldset">
    <legend>Display</legend>
    <label class="cp-row">
      <input type="checkbox" checked={settings.theme === 'dark'} onchange={toggleTheme} />
      <span>
        <b>Dark Mode</b><br />
        <span class="dim">Mengubah warna desktop, jendela, dan taskbar ke skema gelap. Tersimpan otomatis.</span>
      </span>
    </label>
    <div class="cp-preview" aria-hidden="true">
      <div class="cp-mini-window">
        <div class="cp-mini-title">Preview</div>
        <div class="cp-mini-body">Aa</div>
      </div>
    </div>
  </fieldset>

  <fieldset class="w95-fieldset">
    <legend>Account</legend>
    {#if auth.loggedIn}
      <p style="margin:0 0 8px;">Status: <b>masuk sebagai pemilik</b> 🔑</p>
      <button class="w95-btn" onclick={logout}>Log Out</button>
    {:else}
      <p style="margin:0 0 8px;">Status: <b>pengunjung</b> — hanya bisa membaca artikel.</p>
      <button class="w95-btn" onclick={() => openApp(getApp('login'))}>Log In…</button>
    {/if}
  </fieldset>

  <fieldset class="w95-fieldset">
    <legend>Desktop Pets</legend>
    <label class="cp-row">
      <input type="checkbox" checked={settings.neko} onchange={toggleNeko} />
      <span>
        <b>Kucing Interaktif (Neko)</b><br />
        <span class="dim">
          Kucing kecil yang mengejar kursor — dari
          <a href="https://webneko.net" target="_blank" rel="noreferrer">webneko.net</a>.
          Matikan bila mengganggu; pilihan tersimpan otomatis.
        </span>
      </span>
    </label>
    <p class="dim" style="margin:6px 0 0;">Status: kucing sedang <b>{settings.neko ? 'AKTIF 🐈' : 'NONAKTIF 😴'}</b></p>
  </fieldset>
</div>
