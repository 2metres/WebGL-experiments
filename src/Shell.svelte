<script lang="ts">
  import { getRoute, navigate } from "./router.svelte";
  import { experiments, getExperiment } from "./experiments/registry";

  let fullscreen = $state(false);

  const route = $derived(getRoute());
  const entry = $derived(getExperiment(route));
  const componentPromise = $derived(entry ? entry.loader() : null);

  function onFullscreenChange() {
    fullscreen = !!document.fullscreenElement;
  }

  $effect(() => {
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  });
</script>

{#if !fullscreen}
  <nav>
    {#each experiments as exp}
      <button
        class:active={route === exp.id}
        onclick={() => navigate(exp.id)}
      >
        {exp.label}
      </button>
    {/each}
  </nav>
{/if}

{#if componentPromise}
  {#await componentPromise then mod}
    <mod.default />
  {/await}
{/if}

<style>
  nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 30;
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    background: rgba(10, 10, 20, 0.7);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  nav button {
    padding: 6px 16px;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    border: 1px solid transparent;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: color 0.2s, background 0.2s;
  }

  nav button:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.05);
  }

  nav button.active {
    color: white;
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
  }
</style>
