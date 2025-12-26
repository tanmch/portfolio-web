<script module>
    // module level logi
</script>

<script lang="ts" >
   // Instance level logic
   let message = $state('hello');
   let count = $state(0);
   let doubled = $derived(count * 2);
//   let { post, like } = $props;
//   let likes = $derived(post.likes);

   class todo {
       static reset() {
           count = 0;
       }
   }
   async function onclick() {
       likes += 1;

       try {
           await like(post.id);
       } catch (error) {
           likes -= 1;
           console.error(error);
       }
   }
</script>

<!-- markups -->
<main>
    <h1>{message} SvelteKit!</h1>
    <button onclick={() => count++}>
        clicks: {count};
    </button>
    <!--button {onclick}>❤️ {likes}</button> -->
    <button onclick={() => count++}>
        {doubled}
    </button>
    <p>{count} doubled is {doubled}</p>
    <button onclick={() => todo.reset()}>
        reset
    </button>
</main>

<style lang="scss">
   /* styles */
   main {
     padding: 1em;
     margin: 0 auto;
   }
   p {
     color: burlywood;
   }
</style>