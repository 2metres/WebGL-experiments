<script lang="ts">
  import { onMount } from 'svelte';
  import { WindSimulation } from './lib/WindSimulation';
  import type { SimSettings } from './lib/WindSimulation';
  import { AudioCapture } from './lib/AudioCapture';
  import { CameraCapture } from './lib/CameraCapture';

  let canvas: HTMLCanvasElement;
  let sim: WindSimulation;
  let audio: AudioCapture;
  let camera: CameraCapture;
  let animFrameId: number;
  let micEnabled = $state(false);
  let cameraEnabled = $state(false);
  let panelOpen = $state(false);
  let drawing = false;
  let fullscreen = $state(false);
  let renderMode = $state(0);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      fullscreen = true;
    } else {
      document.exitFullscreen();
      fullscreen = false;
    }
  }

  // Settings — odd-range ones use 0–1 sliders mapped to real values
  let cameraStrength = $state(25);
  let audioBoostMin = $state(0.05);
  let audioBoostMax = $state(8);
  let velocityDecay = $state(0.99);
  let cameraVelocityDecay = $state(0.90);
  let triggerDecay = $state(0.999);
  let diffusion = $state(0.15);
  let motionThreshold = $state(2);

  onMount(() => {
    sim = new WindSimulation(canvas);
    audio = new AudioCapture();
    camera = new CameraCapture();

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) sim.resize(width, height);
      }
    });
    ro.observe(canvas.parentElement!);
    sim.resize(window.innerWidth, window.innerHeight);

    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Sync settings
      sim.settings.cameraStrength = cameraStrength;
      sim.settings.audioBoostMin = audioBoostMin;
      sim.settings.audioBoostMax = audioBoostMax;
      sim.settings.velocityDecay = velocityDecay;
      sim.settings.cameraVelocityDecay = cameraVelocityDecay;
      sim.settings.triggerDecay = triggerDecay;
      sim.settings.diffusion = diffusion;
      sim.settings.motionThreshold = motionThreshold;
      sim.renderMode = Number(renderMode);

      if (audio.isActive) sim.setAudioHistory(audio.updateHistory());
      if (camera.ready) sim.setCameraFrame(camera.videoElement!);
      sim.update(dt);
      animFrameId = requestAnimationFrame(loop);
    };
    animFrameId = requestAnimationFrame(loop);

    const onFsChange = () => { fullscreen = !!document.fullscreenElement; };
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      cancelAnimationFrame(animFrameId);
      ro.disconnect();
      audio.destroy();
      camera.destroy();
      sim.destroy();
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  });

  async function enableMic() {
    const ok = await audio.start();
    micEnabled = ok;
  }

  async function enableCamera() {
    const ok = await camera.start();
    cameraEnabled = ok;
  }

  function handleMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.panel')) return;
    drawing = true;
    sim?.startNewStroke();
    sim?.onMouseMove(e.clientX, e.clientY);
  }

  function handleMouseMove(e: MouseEvent) {
    if (drawing) {
      sim?.onMouseMove(e.clientX, e.clientY);
    }
  }

  function handleMouseUp() {
    if (drawing) {
      drawing = false;
    }
  }

  function handleMouseLeave() {
    if (drawing) {
      drawing = false;
    }
    sim?.onMouseLeave();
  }

  function handleTouchStart(e: TouchEvent) {
    if ((e.target as HTMLElement).closest('.panel')) return;
    e.preventDefault();
    drawing = true;
    sim?.startNewStroke();
    const touch = e.touches[0];
    sim?.onMouseMove(touch.clientX, touch.clientY);
  }

  function handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (drawing) {
      const touch = e.touches[0];
      sim?.onMouseMove(touch.clientX, touch.clientY);
    }
  }

  function handleTouchEnd() {
    if (drawing) {
      drawing = false;
    }
    sim?.onMouseLeave();
  }
</script>

<canvas
  bind:this={canvas}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseLeave}
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
></canvas>

{#if !fullscreen}
<div class="controls">
  {#if !micEnabled}
    <button class="ctrl-btn" onclick={enableMic}>Enable Mic</button>
  {/if}
  {#if !cameraEnabled}
    <button class="ctrl-btn" onclick={enableCamera}>Enable Camera</button>
  {/if}
  <button class="ctrl-btn" onclick={() => panelOpen = !panelOpen}>
    {panelOpen ? 'Close' : 'Settings'}
  </button>
  <button class="ctrl-btn" onclick={toggleFullscreen}>Fullscreen</button>
</div>
{/if}

{#if panelOpen && !fullscreen}
  <div class="panel" onmousedown={(e) => e.stopPropagation()}>
    <div class="panel-section">
      <h3>Camera</h3>
      <label>
        <span>Strength <code>{cameraStrength.toFixed(0)}</code></span>
        <input type="range" min="1" max="100" step="1" bind:value={cameraStrength}>
      </label>
      <label>
        <span>Audio Boost Min <code>{audioBoostMin.toFixed(2)}</code></span>
        <input type="range" min="0" max="1" step="0.01" bind:value={audioBoostMin}>
      </label>
      <label>
        <span>Audio Boost Max <code>{audioBoostMax.toFixed(1)}</code></span>
        <input type="range" min="1" max="30" step="0.5" bind:value={audioBoostMax}>
      </label>
      <label>
        <span>Noise Filter <code>{motionThreshold}</code></span>
        <input type="range" min="0" max="4" step="1" bind:value={motionThreshold}>
      </label>
    </div>

    <div class="panel-section">
      <h3>Velocity</h3>
      <label>
        <span>Decay <code>{velocityDecay.toFixed(3)}</code></span>
        <input type="range" min="0" max="1" step="0.001" bind:value={velocityDecay}>
      </label>
      <label>
        <span>Camera Decay <code>{cameraVelocityDecay.toFixed(3)}</code></span>
        <input type="range" min="0" max="1" step="0.001" bind:value={cameraVelocityDecay}>
      </label>
      <label>
        <span>Diffusion <code>{diffusion.toFixed(3)}</code></span>
        <input type="range" min="0" max="1" step="0.001" bind:value={diffusion}>
      </label>
    </div>

    <div class="panel-section">
      <h3>Triggers</h3>
      <label>
        <span>Trigger Decay <code>{triggerDecay.toFixed(4)}</code></span>
        <input type="range" min="0" max="1" step="0.001" bind:value={triggerDecay}>
      </label>
    </div>

    <div class="panel-section">
      <h3>Display</h3>
      <label>
        <span>Render Mode</span>
        <select bind:value={renderMode}>
          <option value={0}>Arrows</option>
          <option value={1}>Digits (0–9)</option>
          <option value={2}>Lines (─│╱╲)</option>
        </select>
      </label>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: #020206;
  }

  canvas {
    display: block;
    cursor: crosshair;
  }

  .controls {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    gap: 12px;
  }

  .ctrl-btn {
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

  .ctrl-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

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

  .panel-section {
    margin-bottom: 16px;
  }

  .panel-section:last-child {
    margin-bottom: 0;
  }

  .panel h3 {
    margin: 0 0 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.4);
  }

  .panel label {
    display: block;
    margin-bottom: 8px;
  }

  .panel label span {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .panel code {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
  }

  .panel input[type="range"] {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    outline: none;
  }

  .panel input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.7);
    cursor: pointer;
  }

  .panel select {
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
