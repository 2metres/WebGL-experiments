<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    label,
    value = $bindable(),
    children,
  }: {
    label: string;
    value: string | number;
    children: Snippet;
  } = $props();
</script>

<label>
  <span>{label}</span>
  <select bind:value>
    {@render children()}
  </select>
</label>

<style>
  label {
    display: block;
    margin-bottom: 8px;
  }

  span {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  select {
    width: 100%;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    font-size: 12px;
    outline: none;
    cursor: pointer;
  }
</style>
