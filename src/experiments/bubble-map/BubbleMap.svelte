<script lang="ts">
  import { onMount } from "svelte";
  import { CanvasContainer, createAnimationLoop } from "../../lib/canvas";
  import { AudioCapture } from "../../lib/media";
  import { ControlBar } from "../../lib/ui";
  import { BubbleSimulation } from "./BubbleSimulation";
  import { settingsStore } from "./settingsStore";
  import BubbleMapSettings from "./BubbleMapSettings.svelte";

  let sim: BubbleSimulation;
  let audio: AudioCapture;
  let panelOpen = $state(false);
  let drawing = false;

  const loop = createAnimationLoop((dt) => {
    const s = settingsStore.getState();
    sim.settings.growthRate = s.growthRate;
    sim.settings.maxRadius = s.maxRadius;
    sim.settings.threshold = s.threshold;
    sim.settings.shininess = s.shininess;
    sim.settings.ambient = s.ambient;
    sim.settings.specStrength = s.specStrength;
    sim.settings.rimPower = s.rimPower;
    sim.settings.rimStrength = s.rimStrength;
    sim.settings.brushRadius = s.brushRadius;
    sim.settings.lightAngleX = s.lightAngleX;
    sim.settings.lightAngleY = s.lightAngleY;

    if (audio?.isActive) sim.setAudioLevel(audio.level);
    sim.update(dt);
  });

  function handleCanvas(canvas: HTMLCanvasElement) {
    sim = new BubbleSimulation(canvas);
    audio = new AudioCapture();
    loop.start();
    enableAudio();
  }

  function handleResize(width: number, height: number) {
    sim?.resize(width, height);
  }

  onMount(() => {
    return () => {
      loop.stop();
      audio?.destroy();
      sim?.destroy();
    };
  });

  async function enableAudio() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await audio.start(stream);
    } catch (e) {
      console.warn("Audio access denied:", e);
    }
  }

  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest(".panel")) return;
    drawing = true;
    sim?.startNewStroke();
    sim?.onMouseMove(e.clientX, e.clientY);
  }
  function handleMouseMove(e: MouseEvent) {
    if (drawing) sim?.onMouseMove(e.clientX, e.clientY);
  }
  function handleMouseUp() { drawing = false; }
  function handleMouseLeave() {
    drawing = false;
    sim?.onMouseLeave();
  }
  function handleTouchStart(e: TouchEvent) {
    if ((e.target as HTMLElement).closest(".panel")) return;
    e.preventDefault();
    drawing = true;
    sim?.startNewStroke();
    sim?.onMouseMove(e.touches[0].clientX, e.touches[0].clientY);
  }
  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (drawing) sim?.onMouseMove(e.touches[0].clientX, e.touches[0].clientY);
  }
  function handleTouchEnd() {
    drawing = false;
    sim?.onMouseLeave();
  }
</script>

<CanvasContainer
  oncanvas={handleCanvas}
  onresize={handleResize}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseLeave}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
/>

<ControlBar>
  <button onclick={() => sim?.clearBubbles()}>Clear</button>
  <button onclick={() => (panelOpen = !panelOpen)}>
    {panelOpen ? "Close" : "Settings"}
  </button>
</ControlBar>

{#if panelOpen}
  <BubbleMapSettings />
{/if}
