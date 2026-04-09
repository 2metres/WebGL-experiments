<script lang="ts">
  import { RangeSlider, SelectInput, SettingsPanel } from "../../lib/ui";
  import { settingsStore, DEFAULTS } from "./settingsStore";

  let scale = $state(settingsStore.getState().scale);
  let warp = $state(settingsStore.getState().warp);
  let minVin = $state(settingsStore.getState().minVin);
  let thin = $state(settingsStore.getState().thin);
  let blur = $state(settingsStore.getState().blur);
  let mask = $state(settingsStore.getState().mask);
  let maskType = $state(settingsStore.getState().maskType);
  let chromatic = $state(settingsStore.getState().chromatic);
  let noise = $state(settingsStore.getState().noise);
  let trackingSpeed = $state(settingsStore.getState().trackingSpeed);
  let trackingIntensity = $state(settingsStore.getState().trackingIntensity);

  $effect(() => { settingsStore.getState().set("scale", scale); });
  $effect(() => { settingsStore.getState().set("warp", warp); });
  $effect(() => { settingsStore.getState().set("minVin", minVin); });
  $effect(() => { settingsStore.getState().set("thin", thin); });
  $effect(() => { settingsStore.getState().set("blur", blur); });
  $effect(() => { settingsStore.getState().set("mask", mask); });
  $effect(() => { settingsStore.getState().set("maskType", maskType); });
  $effect(() => { settingsStore.getState().set("chromatic", chromatic); });
  $effect(() => { settingsStore.getState().set("noise", noise); });
  $effect(() => { settingsStore.getState().set("trackingSpeed", trackingSpeed); });
  $effect(() => { settingsStore.getState().set("trackingIntensity", trackingIntensity); });

  function resetDefaults() {
    settingsStore.getState().resetDefaults();
    scale = DEFAULTS.scale;
    warp = DEFAULTS.warp;
    minVin = DEFAULTS.minVin;
    thin = DEFAULTS.thin;
    blur = DEFAULTS.blur;
    mask = DEFAULTS.mask;
    maskType = DEFAULTS.maskType;
    chromatic = DEFAULTS.chromatic;
    noise = DEFAULTS.noise;
    trackingSpeed = DEFAULTS.trackingSpeed;
    trackingIntensity = DEFAULTS.trackingIntensity;
  }
</script>

<SettingsPanel onmousedown={(e) => e.stopPropagation()}>
  <div class="section">
    <h3>CRT Display</h3>
    <RangeSlider label="Scanline Scale" bind:value={scale} min={0.1} max={1.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Scanline Thickness" bind:value={thin} min={0.5} max={1.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Blur" bind:value={blur} min={-4.0} max={0.0} step={0.05} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Mask Intensity" bind:value={mask} min={0.0} max={1.5} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <SelectInput label="Mask Type" bind:value={maskType}>
      <option value={0}>Shadow</option>
      <option value={1}>Grille</option>
      <option value={2}>Grille Lite</option>
      <option value={3}>None</option>
    </SelectInput>
  </div>

  <div class="section">
    <h3>Tube</h3>
    <RangeSlider label="Warp" bind:value={warp} min={0.0} max={8.0} step={0.05} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Vignette" bind:value={minVin} min={0.0} max={1.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
  </div>

  <div class="section">
    <h3>VHS Effects</h3>
    <RangeSlider label="Chromatic Aberration" bind:value={chromatic} min={0} max={10} step={0.1} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Static Noise" bind:value={noise} min={0} max={1} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Tracking Speed" bind:value={trackingSpeed} min={0} max={5} step={0.1} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Tracking Intensity" bind:value={trackingIntensity} min={0} max={1} step={0.01} formatValue={(v) => v.toFixed(2)} />
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
