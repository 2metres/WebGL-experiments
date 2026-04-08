<script lang="ts">
  import { onMount } from "svelte";
  import { CanvasContainer, createAnimationLoop } from "../../lib/canvas";
  import { AudioCapture, CameraCapture } from "../../lib/media";
  import { ControlBar } from "../../lib/ui";
  import { WindSimulation } from "./WindSimulation";
  import { settingsStore } from "./settingsStore";
  import VectorMapSettings from "./VectorMapSettings.svelte";

  let sim: WindSimulation;
  let audio: AudioCapture;
  let camera: CameraCapture;
  let micEnabled = $state(false);
  let cameraEnabled = $state(false);
  let panelOpen = $state(false);
  let drawing = false;
  let fullscreen = $state(false);

  const loop = createAnimationLoop((dt) => {
    const s = settingsStore.getState();
    sim.settings.cameraStrength = s.cameraStrength;
    sim.settings.audioBoostMin = s.audioBoostMin;
    sim.settings.audioBoostMax = s.audioBoostMax;
    sim.settings.velocityDecay = s.velocityDecay;
    sim.settings.cameraVelocityDecay = s.cameraVelocityDecay;
    sim.settings.triggerDecay = s.triggerDecay;
    sim.settings.diffusion = s.diffusion;
    sim.settings.motionThreshold = s.motionThreshold;
    sim.renderMode = Number(s.renderMode);

    if (audio.isActive) sim.setAudioHistory(audio.updateHistory());
    if (camera.ready) sim.setCameraFrame(camera.videoElement!);
    sim.update(dt);
  });

  function handleCanvas(canvas: HTMLCanvasElement) {
    sim = new WindSimulation(canvas);
    audio = new AudioCapture();
    camera = new CameraCapture();
    loop.start();
  }

  function handleResize(width: number, height: number) {
    sim?.resize(width, height);
  }

  onMount(() => {
    const onFsChange = () => { fullscreen = !!document.fullscreenElement; };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      loop.stop();
      audio?.destroy();
      camera?.destroy();
      sim?.destroy();
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  });

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      fullscreen = true;
    } else {
      document.exitFullscreen();
      fullscreen = false;
    }
  }

  async function enableMediaDevices() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: "user", width: 640, height: 480 },
      });
      micEnabled = await audio.start(stream);
      cameraEnabled = await camera.start(stream);
    } catch (e) {
      console.warn("Media access denied or unavailable:", e);
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

{#if !fullscreen}
  <ControlBar>
    {#if !micEnabled || !cameraEnabled}
      <button onclick={enableMediaDevices}>Enable Mic & Camera</button>
    {/if}
    <button onclick={() => (panelOpen = !panelOpen)}>
      {panelOpen ? "Close" : "Settings"}
    </button>
    <button onclick={toggleFullscreen}>Fullscreen</button>
  </ControlBar>
{/if}

{#if panelOpen && !fullscreen}
  <VectorMapSettings />
{/if}
