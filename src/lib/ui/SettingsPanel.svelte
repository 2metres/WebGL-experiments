<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    children,
    onmousedown,
  }: {
    children: Snippet;
    onmousedown?: (e: MouseEvent) => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="panel" onmousedown={onmousedown}>
  {@render children()}
</div>

<style>
  .panel {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 20;
    width: 280px;
    background: rgba(10, 10, 20, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(12px);
    color: rgba(255, 255, 255, 0.8);
    font-family: system-ui, sans-serif;
    font-size: 12px;
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
