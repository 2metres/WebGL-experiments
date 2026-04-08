<script lang="ts">
  import { onMount } from "svelte";

  let {
    onresize,
    oncanvas,
    ...restProps
  }: {
    onresize?: (width: number, height: number) => void;
    oncanvas?: (canvas: HTMLCanvasElement) => void;
    [key: string]: any;
  } = $props();

  let canvasEl: HTMLCanvasElement;

  onMount(() => {
    oncanvas?.(canvasEl);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) onresize?.(width, height);
      }
    });
    ro.observe(canvasEl.parentElement!);
    onresize?.(window.innerWidth, window.innerHeight);

    return () => ro.disconnect();
  });
</script>

<canvas bind:this={canvasEl} {...restProps}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
    cursor: crosshair;
  }
</style>
