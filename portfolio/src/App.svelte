<script>
  import Window from './lib/Window.svelte'
  let currentPage = 'home'; // State untuk nav
  let isDropdownOpen = false;
  const projects = [
    { title: "Gacorain", desc: "Basic Clothesline Monitoring Webapps", link: "https://github.com/tanmch/gacorain" },
    { title: "My DWM", desc: "Personal DWM configs", link: "https://github.com/logasans/My-DWM" },
    { title: "Mango as an Object Vision", desc: "Mango Management Webapps w/Ripeness Detection Using YOLO", link: "https://github.com/tanmch/mov" },
    { title: "Lampu Server", desc: "Basic Smart Lamp Control Implementation Using MQTT Protocol ", link: "https://github.com/tanmch/lampu-server" },
  ]

  const socialMedia = [
    {title: "Linkedin Profile", class: "fa-brands fa-linkedin" ,link: "https://www.linkedin.com/in/406430325/"},
    {title: "Instagram Profile", class: "fa-brands fa-instagram" ,link: "https://instagram.com/realdonaldtrump"},
    {title: "Email", class: "fa-solid fa-envelope" ,link: "mailto:michael.chrs@proton.me"},
  ]
  const lastUpdated = "24 January, 2026. Now with Svelte®"
  const toggleDropdown = () => isDropdownOpen = !isDropdownOpen;
  const closeDropdown = () => isDropdownOpen = false;

 /* Functions */
</script>
<svelte:head>
  <title>A Web Portfolio | Michael </title>
</svelte:head>

<main>
  <Window title="Projects" icon="/icon/doc.ico">
    <nav
            class="navbar navbar-expand bg-grey p-0"
    >
      <ul class="navbar-nav">
        <li class="nav-item">
          <button class="nav-link btn" on:click={() => currentPage= 'home' }><u>H</u>ome</button>
        </li>
        <li class="nav-item">
          <button class="nav-link btn" on:click={() => currentPage= 'about' }><u>A</u>bout</button>
        </li>
        <li class="nav-item dropdown">
          <button
                  class="nav-link dropdown-toggle btn btn-link"
                  type="button"
                  on:click={toggleDropdown}
                  aria-expanded={isDropdownOpen}
          >
            <u>P</u>rojects
          </button>

          <ul
                  class="dropdown-menu"
                  class:show={isDropdownOpen}
                  style="display: {isDropdownOpen ? 'block' : 'none'}"
          >
            {#each projects as project}
              <li>
                <a
                        class="dropdown-item"
                        href={project.href}
                        on:click={closeDropdown}
                >
                  {project.title}
                </a>
              </li>
            {/each}
          </ul>
        </li>
      </ul>
    </nav>


   <div class="window-content peh p-3 text-center">
     <h2>Michael Christian Handoko</h2>
     <h6><q>Computer Engineering Technology Student of <b>SV-IPB</b></q></h6>

     <div class="social-links my-3">
       {#each socialMedia as social}
         <a href={social.link}>
           <i class={social.class} aria-label={social.title}></i>
         </a>
         {/each}
     </div>

     <img id="portrait" src="/img/image2.jpg" alt="Self Portrait"><br>
     <i><q>Kerja dengan penuh cinta layaknya menenun kain dengan benang-benang yang diambil dari hatimu karena kekasihmu
     akan mengenakan kain itu</q></i>
     <p>I have interests in music <img src="/icon/music.ico" alt="" style="height:16px; width:16px;">, computer <img src="/icon/computer2.ico" alt="" style="height:16px; width:16px;">, and media creation <img src="/icon/movie.ico" alt="" style="height:24px; width:24px;"></p>
     <h4 class="mt-2">Here are some projects that i've been working on (WIP):</h4>

     <div class="container mt-4">
       <div class="row">
         <div class="col border border-secondary p-3 text-start">
           {#each projects as project}
             <a href="{project.link}"><strong>{project.title}</strong></a>
             <p>{project.desc}</p>
           {/each}
         </div>
       </div>
     </div>
   </div>
  </Window>

  <Window title="Support" icon="/icon/briefcase.ico">
    <p>You can support me :p</p>
    <p>Bank Jago: <b style="color: tomato">103062644229</b></p>
    <p class="mt-3"> Last Updated on {lastUpdated}</p>
    <p class="mt-2" style="color: tomato; text-decoration: underline"> Don't forget to pat the cat :p</p>
  </Window>
</main>