<script>
    // Don't Repeat Yourself
    export let title = "Window";
    export let icon = "/icon/doc.ico";
</script>

<div class="container-fluid window-border p-0 mb-4">
   <div class="window">
       <div class="title-bar">
           <img src="{icon}" alt="" /> {title}
       </div>
       <div class="window-content">
           <slot />
       </div>
   </div>
</div>