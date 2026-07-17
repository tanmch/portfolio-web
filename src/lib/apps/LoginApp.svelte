<script>
  /**
   * LoginApp.svelte — dialog logon ala "Welcome to Windows".
   * Mode Supabase: email + password akun Supabase Auth mana pun.
   * Hak menulis ditentukan server (tabel owners + RLS) — akun yang
   * bukan pemilik tetap bisa login, tapi fitur menulis terkunci.
   * Mode legacy (tanpa Supabase): password saja (kunci UI).
   */
  import { auth, login, logout } from '../stores/auth.svelte.js'
  import { wm, openApp, closeWindow } from '../wm/wm.svelte.js'
  import { getApp } from './registry.js'
  import Icon from '../wm/Icon.svelte'

  const isSupabase = auth.mode === 'supabase'

  let email = $state('')
  let password = $state('')
  let error = $state('')
  let busy = $state(false)

  async function submit() {
    if (busy) return
    busy = true
    error = ''
    const res = await login({ email, password })
    busy = false
    if (!res.ok) {
      error = res.message || 'Login gagal. Coba lagi.'
      password = ''
      return
    }
    email = ''
    password = ''
    // Tutup jendela login, buka app yang tadinya diminta.
    const loginWin = wm.windows.find((w) => w.appId === 'login')
    if (loginWin) closeWindow(loginWin.id)
    if (auth.pendingAppId) {
      const target = getApp(auth.pendingAppId)
      auth.pendingAppId = null
      if (target) openApp(target)
    }
  }
</script>

<div class="app-pad login-app">
  {#if auth.loggedIn}
    <div class="login-row">
      <Icon src="https://win98icons.alexmeub.com/icons/png/keys-0.png" fallback="/icon/computer.ico" size={32} alt="" />
      <div>
        <p style="margin:0;"><b>Kamu sudah masuk sebagai pemilik.</b></p>
        <p class="dim" style="margin:4px 0 0;">
          {#if auth.email}{auth.email} · {/if}Article Writer &amp; Projects Editor terbuka untukmu.
        </p>
      </div>
    </div>
    <div style="margin-top:12px; text-align:right;">
      <button class="w95-btn" onclick={logout}>Log Out</button>
    </div>
  {:else if auth.email}
    <!-- Sesi Supabase aktif tapi bukan pemilik -->
    <div class="login-row">
      <Icon src="https://win98icons.alexmeub.com/icons/png/keys-0.png" fallback="/icon/computer.ico" size={32} alt="" />
      <div>
        <p style="margin:0;"><b>Masuk sebagai {auth.email}</b></p>
        <p class="dim" style="margin:4px 0 0;">
          Akun ini bukan pemilik situs — kamu tetap bisa membaca semua artikel,
          tetapi fitur menulis terkunci.
        </p>
      </div>
    </div>
    <div style="margin-top:12px; text-align:right;">
      <button class="w95-btn" onclick={logout}>Log Out</button>
    </div>
  {:else}
    <div class="login-row">
      <Icon src="https://win98icons.alexmeub.com/icons/png/keys-0.png" fallback="/icon/computer.ico" size={32} alt="" />
      <p style="margin:0;">
        Masuk dengan akun Supabase untuk membuka fitur pemilik.<br />
        <span class="dim">Pengunjung tetap bisa membaca semua artikel tanpa login.</span>
        {#if isSupabase}
          <br /><span class="dim">Login diverifikasi lewat Supabase Auth.</span>
        {/if}
      </p>
    </div>

    <div class="login-form" style="display:grid; grid-template-columns:auto 1fr auto; gap:6px 8px; align-items:center;">
      {#if isSupabase}
        <label for="login-email">Email:</label>
        <input
          id="login-email"
          class="w95-input"
          type="email"
          bind:value={email}
          onkeydown={(e) => e.key === 'Enter' && submit()}
          autocomplete="username"
          style="grid-column: 2 / 4;"
        />
      {/if}
      <label for="login-pw">Password:</label>
      <input
        id="login-pw"
        class="w95-input"
        type="password"
        bind:value={password}
        onkeydown={(e) => e.key === 'Enter' && submit()}
        autocomplete="current-password"
      />
      <button class="w95-btn" onclick={submit} disabled={busy}>{busy ? '…' : 'OK'}</button>
    </div>

    {#if error}<p class="login-error">✖ {error}</p>{/if}
  {/if}
</div>
