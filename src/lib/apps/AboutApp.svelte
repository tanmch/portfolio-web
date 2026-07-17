<script>
  /**
   * AboutApp.svelte — konten orisinal halaman awal portfolio.
   * Daftar project kini OTOMATIS mengikuti data efektif situs
   * (Supabase → public/data/projects.json → fallback data/projects.js),
   * sama dengan yang tampil di app "My Projects".
   */
  import { socialMedia } from '../data/projects.js'
  import { projectsStore, loadShippedProjects, effectiveProjects } from '../stores/projects.svelte.js'
  import { safeLinkUrl } from '../security/url.js'

  $effect(() => { loadShippedProjects() })
  let projects = $derived(
    (projectsStore.loaded, projectsStore.override, effectiveProjects())
  )
</script>

<div class="window-content peh p-3 text-center">
  <h2>Michael Christian Handoko</h2>
  <h6><q>Computer Engineering Technology Student of <b>SV-IPB</b></q></h6>

  <div class="social-links my-3">
    {#each socialMedia as social}
      <a href={safeLinkUrl(social.link) ?? '#'} target="_blank" rel="noopener noreferrer" aria-label={social.title}>
        <i class={social.class} aria-label={social.title}></i>
      </a>
    {/each}
  </div>

  <img id="portrait" src="/img/image2.jpg" alt="Self Portrait" /><br />
  <i
    ><q
      >Kerja dengan penuh cinta layaknya menenun kain dengan benang-benang yang diambil dari hatimu
      karena kekasihmu akan mengenakan kain itu</q
    ></i
  >
  <p>
    I have interests in music
    <img src="/icon/music.ico" alt="" style="height:16px; width:16px;" />, computer
    <img src="/icon/computer2.ico" alt="" style="height:16px; width:16px;" />, and media creation
    <img src="/icon/movie.ico" alt="" style="height:24px; width:24px;" />
  </p>
  <h4 class="mt-2">Here are some projects that i've been working on (WIP):</h4>

  <div class="container mt-4">
    <div class="row">
      <div class="col border border-secondary p-3 text-start">
        {#each projects as project (project.title)}
          <a href={safeLinkUrl(project.link) ?? '#'} target="_blank" rel="noopener noreferrer"><strong>{project.title}</strong></a>
          <p>{project.desc}</p>
        {/each}
      </div>
    </div>
  </div>
</div>
