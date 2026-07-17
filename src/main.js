import { mount } from 'svelte'
import './style.css'
import App from './App.svelte'

// Halaman artikel hasil prerender (scripts/prerender-articles.mjs) membawa
// konten statis untuk crawler; buang saat desktop interaktif mengambil alih.
document.getElementById('prerender')?.remove()

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
