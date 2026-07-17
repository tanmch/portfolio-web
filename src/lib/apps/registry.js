/**
 * registry.js — daftar pseudo-app pada desktop.
 * Ikon eksternal diambil dari https://win98icons.alexmeub.com
 * (situs arsip ikon Windows 95/98 yang memang menyediakan ikon-ikon ini).
 * Komponen <Icon> memiliki fallback ke ikon lokal (/public/icon) bila offline.
 */

import AboutApp from './AboutApp.svelte'
import ProjectsApp from './ProjectsApp.svelte'
import SupportApp from './SupportApp.svelte'
import ArticleWriter from './ArticleWriter.svelte'
import ArticlesApp from './ArticlesApp.svelte'
import SettingsApp from './SettingsApp.svelte'
import HelpApp from './HelpApp.svelte'
import LoginApp from './LoginApp.svelte'
import ProjectsEditor from './ProjectsEditor.svelte'

const W98 = 'https://win98icons.alexmeub.com/icons/png'

export const apps = [
  {
    id: 'about',
    title: 'About Me',
    icon: `${W98}/user_world-0.png`,
    fallback: '/icon/smile.ico',
    component: AboutApp,
    w: 640, h: 520,
    desktop: true,
  },
  {
    id: 'projects',
    title: 'My Projects',
    icon: `${W98}/directory_closed-4.png`,
    fallback: '/icon/briefcase.ico',
    component: ProjectsApp,
    w: 560, h: 440,
    desktop: true,
  },
  {
    id: 'writer',
    title: 'Article Writer',
    icon: `${W98}/write_wordpad-0.png`,
    fallback: '/icon/doc.ico',
    component: ArticleWriter,
    w: 720, h: 560,
    desktop: true,
    ownerOnly: true,
  },
  {
    id: 'articles',
    title: 'My Articles',
    icon: `${W98}/directory_open_file_mydocs-4.png`,
    fallback: '/icon/doc.ico',
    component: ArticlesApp,
    w: 560, h: 440,
    desktop: true,
  },
  {
    id: 'settings',
    title: 'Control Panel',
    icon: `${W98}/settings_gear-0.png`,
    fallback: '/icon/computer.ico',
    component: SettingsApp,
    w: 420, h: 380,
    desktop: true,
  },
  {
    id: 'support',
    title: 'Support',
    icon: `${W98}/msg_information-0.png`,
    fallback: '/icon/briefcase.ico',
    component: SupportApp,
    w: 420, h: 300,
    desktop: true,
  },
  {
    id: 'projects-editor',
    title: 'Projects Editor',
    icon: `${W98}/notepad-1.png`,
    fallback: '/icon/doc.ico',
    component: ProjectsEditor,
    w: 560, h: 460,
    desktop: false, // akses via Start Menu / tombol Edit di My Projects
    ownerOnly: true,
  },
  {
    id: 'login',
    title: 'Log In',
    icon: `${W98}/keys-0.png`,
    fallback: '/icon/computer.ico',
    component: LoginApp,
    w: 380, h: 260,
    desktop: false,
  },
  {
    id: 'help',
    title: 'Help / Readme',
    icon: `${W98}/help_book_cool-4.png`,
    fallback: '/icon/doc.ico',
    component: HelpApp,
    w: 520, h: 440,
    desktop: false, // hanya lewat Start Menu
  },
]

export function getApp(id) {
  return apps.find((a) => a.id === id)
}
