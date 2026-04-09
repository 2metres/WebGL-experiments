<script lang="ts">
  import { RangeSlider, SettingsPanel } from "../../lib/ui";
  import { settingsStore, DEFAULTS } from "./settingsStore";

  let scale = $state(settingsStore.getState().scale);
  let warp = $state(settingsStore.getState().warp);
  let minVin = $state(settingsStore.getState().minVin);
  let thin = $state(settingsStore.getState().thin);
  let blur = $state(settingsStore.getState().blur);
  let mask = $state(settingsStore.getState().mask);
  let maskType = $state(settingsStore.getState().maskType);
  let antiMoire = $state(settingsStore.getState().antiMoire);
  let chromatic = $state(settingsStore.getState().chromatic);
  let noise = $state(settingsStore.getState().noise);
  let noiseShape = $state(settingsStore.getState().noiseShape);
  let trackingScale = $state(settingsStore.getState().trackingScale);
  let trackingGlitch = $state(settingsStore.getState().trackingGlitch);
  let trackingGlitchScale = $state(settingsStore.getState().trackingGlitchScale);
  let trackingSpeed = $state(settingsStore.getState().trackingSpeed);
  let trackingIntensity = $state(settingsStore.getState().trackingIntensity);
  let trackingBlend = $state(settingsStore.getState().trackingBlend);
  let glow = $state(settingsStore.getState().glow);
  let audioReactive = $state(settingsStore.getState().audioReactive);

  $effect(() => { settingsStore.getState().set("scale", scale); });
  $effect(() => { settingsStore.getState().set("warp", warp); });
  $effect(() => { settingsStore.getState().set("minVin", minVin); });
  $effect(() => { settingsStore.getState().set("thin", thin); });
  $effect(() => { settingsStore.getState().set("blur", blur); });
  $effect(() => { settingsStore.getState().set("mask", mask); });
  $effect(() => { settingsStore.getState().set("maskType", maskType); });
  $effect(() => { settingsStore.getState().set("antiMoire", antiMoire); });
  $effect(() => { settingsStore.getState().set("chromatic", chromatic); });
  $effect(() => { settingsStore.getState().set("noise", noise); });
  $effect(() => { settingsStore.getState().set("noiseShape", noiseShape); });
  $effect(() => { settingsStore.getState().set("trackingScale", trackingScale); });
  $effect(() => { settingsStore.getState().set("trackingGlitch", trackingGlitch); });
  $effect(() => { settingsStore.getState().set("trackingGlitchScale", trackingGlitchScale); });
  $effect(() => { settingsStore.getState().set("trackingSpeed", trackingSpeed); });
  $effect(() => { settingsStore.getState().set("trackingIntensity", trackingIntensity); });
  $effect(() => { settingsStore.getState().set("trackingBlend", trackingBlend); });
  $effect(() => { settingsStore.getState().set("glow", glow); });
  $effect(() => { settingsStore.getState().set("audioReactive", audioReactive); });

  function resetDefaults() {
    settingsStore.getState().resetDefaults();
    scale = DEFAULTS.scale;
    warp = DEFAULTS.warp;
    minVin = DEFAULTS.minVin;
    thin = DEFAULTS.thin;
    blur = DEFAULTS.blur;
    mask = DEFAULTS.mask;
    maskType = DEFAULTS.maskType;
    antiMoire = DEFAULTS.antiMoire;
    chromatic = DEFAULTS.chromatic;
    noise = DEFAULTS.noise;
    noiseShape = DEFAULTS.noiseShape;
    trackingScale = DEFAULTS.trackingScale;
    trackingGlitch = DEFAULTS.trackingGlitch;
    trackingGlitchScale = DEFAULTS.trackingGlitchScale;
    trackingSpeed = DEFAULTS.trackingSpeed;
    trackingIntensity = DEFAULTS.trackingIntensity;
    trackingBlend = DEFAULTS.trackingBlend;
    glow = DEFAULTS.glow;
    audioReactive = DEFAULTS.audioReactive;
  }
</script>

<SettingsPanel onmousedown={(e) => e.stopPropagation()}>
  <div class="section">
    <h3>CRT Display</h3>
    <RangeSlider label="Scanline Scale" bind:value={scale} min={0.1} max={1.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Scanline Thickness" bind:value={thin} min={0.5} max={1.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <label class="checkbox-row">
      <input type="checkbox" bind:checked={antiMoire} />
      Anti-Moiré
    </label>
    <RangeSlider label="Blur" bind:value={blur} min={0} max={10} step={0.1} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Glow" bind:value={glow} min={0} max={2} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Mask Intensity" bind:value={mask} min={0.0} max={1.5} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <div class="toggle-label">Mask Type</div>
    <div class="toggle-group">
      <button class:active={maskType === 0} onclick={() => maskType = 0}>Shadow</button>
      <button class:active={maskType === 1} onclick={() => maskType = 1}>Grille</button>
      <button class:active={maskType === 2} onclick={() => maskType = 2}>Lite</button>
      <button class:active={maskType === 3} onclick={() => maskType = 3}>None</button>
    </div>
  </div>

  <div class="section">
    <h3>Tube</h3>
    <RangeSlider label="Warp" bind:value={warp} min={0.0} max={32.0} step={0.05} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Vignette" bind:value={minVin} min={0.0} max={1.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
  </div>

  <div class="section">
    <h3>VHS Effects</h3>
    <RangeSlider label="Chromatic Aberration" bind:value={chromatic} min={0} max={100} step={0.1} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Static Noise" bind:value={noise} min={0} max={1} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <div class="toggle-label">Noise Shape</div>
    <div class="toggle-group">
      <button class:active={noiseShape === 0} onclick={() => noiseShape = 0}>Snow</button>
      <button class:active={noiseShape === 1} onclick={() => noiseShape = 1}>RGB</button>
      <button class:active={noiseShape === 2} onclick={() => noiseShape = 2}>Fine</button>
      <button class:active={noiseShape === 3} onclick={() => noiseShape = 3}>None</button>
    </div>
  </div>

  <div class="section">
    <h3>Tracking</h3>
    <RangeSlider label="Speed" bind:value={trackingSpeed} min={0} max={10} step={0.1} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Intensity" bind:value={trackingIntensity} min={0} max={10} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Scale" bind:value={trackingScale} min={0.01} max={2.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Glitch" bind:value={trackingGlitch} min={0} max={2} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Glitch Scale" bind:value={trackingGlitchScale} min={1} max={200} step={1} formatValue={(v) => v.toFixed(0)} />
    <label class="select-row">
      Blend
      <select bind:value={trackingBlend}>
        <option value={0}>Subtract</option>
        <option value={1}>Multiply</option>
        <option value={2}>Add</option>
        <option value={3}>Screen</option>
        <option value={4}>Overlay</option>
        <option value={5}>Dodge</option>
        <option value={6}>Burn</option>
      </select>
    </label>
    <label class="checkbox-row">
      <input type="checkbox" bind:checked={audioReactive} />
      Audio-Reactive
    </label>
  </div>

  <div class="section">
    <button class="reset-btn" onclick={resetDefaults}>Reset to Defaults</button>
  </div>
</SettingsPanel>

<style>
  .section {
    margin-bottom: 16px;
  }
  .section:last-child {
    margin-bottom: 0;
  }
  h3 {
    margin: 0 0 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.4);
  }
  .toggle-label {
    font-size: 12px;
    margin-bottom: 4px;
    color: rgba(255, 255, 255, 0.7);
  }
  .toggle-group {
    display: flex;
    gap: 2px;
    margin-bottom: 8px;
  }
  .toggle-group button {
    flex: 1;
    padding: 5px 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: all 0.15s;
  }
  .toggle-group button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
  .toggle-group button.active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
  }
  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    margin-top: 4px;
  }
  .checkbox-row input {
    accent-color: rgba(255, 255, 255, 0.6);
  }
  .select-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
  }
  .select-row select {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 4px 8px;
    font-size: 11px;
    cursor: pointer;
  }
  .reset-btn {
    width: 100%;
    padding: 8px;
    font-size: 12px;
    color: rgba(255, 120, 120, 0.8);
    border: 1px solid rgba(255, 120, 120, 0.25);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .reset-btn:hover {
    background: rgba(255, 120, 120, 0.12);
    color: rgba(255, 140, 140, 1);
  }
</style>
