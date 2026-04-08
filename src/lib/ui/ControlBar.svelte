<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children: Snippet } = $props();
</script>

<div class="controls">
  {@render children()}
</div>

<style>
  .controls {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    gap: 12px;
  }

  .controls :global(button) {
    padding: 10px 24px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: background 0.2s, color 0.2s;
  }

  .controls :global(button:hover) {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }
</style>
