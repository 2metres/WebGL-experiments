<script lang="ts">
  import { RangeSlider, SettingsPanel } from "../../lib/ui";
  import { settingsStore, DEFAULTS, loadPresets, savePreset, deletePreset } from "./settingsStore";
  import type { CrtSettings } from "./settingsStore";

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
  let bpmScale = $state(settingsStore.getState().bpmScale ?? DEFAULTS.bpmScale);
  let manualBpm = $state(settingsStore.getState().manualBpm ?? DEFAULTS.manualBpm);
  let bpmFocused = $state(false);
  let bpmDisplay = $state(String(manualBpm));
  // Poll store for detected BPM updates when input not focused
  $effect(() => {
    if (bpmFocused) return;
    const interval = setInterval(() => {
      const stored = settingsStore.getState().manualBpm;
      if (stored !== manualBpm) {
        manualBpm = stored;
        bpmDisplay = String(stored);
      }
    }, 250);
    return () => clearInterval(interval);
  });
  const storedAr = settingsStore.getState().audioReactive;
  let ar = $state<Record<string, number>>({
    ...DEFAULTS.audioReactive,
    ...(typeof storedAr === "object" && storedAr !== null && !Array.isArray(storedAr) ? storedAr : {}),
  });
  const storedAm = settingsStore.getState().audioMax;
  let am = $state<Record<string, number>>({
    ...DEFAULTS.audioMax,
    ...(typeof storedAm === "object" && storedAm !== null && !Array.isArray(storedAm) ? storedAm : {}),
  });

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
  $effect(() => { settingsStore.getState().set("bpmScale", bpmScale); });
  $effect(() => { settingsStore.getState().set("manualBpm", manualBpm); });
  $effect(() => { JSON.stringify(ar); settingsStore.getState().set("audioReactive", {...ar}); });
  $effect(() => { JSON.stringify(am); settingsStore.getState().set("audioMax", {...am}); });

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
    bpmScale = DEFAULTS.bpmScale;
    manualBpm = DEFAULTS.manualBpm;
    ar = {...DEFAULTS.audioReactive};
    am = {...DEFAULTS.audioMax};
  }

  let presetNames = $state<string[]>(Object.keys(loadPresets()));
  let savingPreset = $state(false);
  let presetName = $state("");

  function currentSettings(): CrtSettings {
    return {
      scale, warp, minVin, thin, blur, mask, maskType, antiMoire,
      chromatic, noise, noiseShape, trackingScale, trackingGlitch,
      trackingGlitchScale, trackingSpeed, trackingIntensity, trackingBlend,
      glow, bpmScale, manualBpm, audioReactive: {...ar}, audioMax: {...am},
    };
  }

  function handleSavePreset() {
    const name = presetName.trim();
    if (!name) return;
    savePreset(name, currentSettings());
    presetNames = Object.keys(loadPresets());
    presetName = "";
    savingPreset = false;
  }

  function applySettings(s: CrtSettings) {
    scale = s.scale; warp = s.warp; minVin = s.minVin; thin = s.thin;
    blur = s.blur; mask = s.mask; maskType = s.maskType; antiMoire = s.antiMoire;
    chromatic = s.chromatic; noise = s.noise; noiseShape = s.noiseShape;
    trackingScale = s.trackingScale; trackingGlitch = s.trackingGlitch;
    trackingGlitchScale = s.trackingGlitchScale; trackingSpeed = s.trackingSpeed;
    trackingIntensity = s.trackingIntensity; trackingBlend = s.trackingBlend;
    glow = s.glow;
    bpmScale = s.bpmScale ?? DEFAULTS.bpmScale;
    manualBpm = s.manualBpm ?? DEFAULTS.manualBpm;
    ar = {...DEFAULTS.audioReactive, ...(s.audioReactive ?? {})};
    am = {...DEFAULTS.audioMax, ...(s.audioMax ?? {})};
  }

  function handleLoadPreset(name: string) {
    const presets = loadPresets();
    if (presets[name]) applySettings(presets[name]);
  }

  function handleDeletePreset(name: string) {
    deletePreset(name);
    presetNames = Object.keys(loadPresets());
  }
</script>

<SettingsPanel onmousedown={(e) => e.stopPropagation()}>
  <details class="section" open>
    <summary>CRT Display</summary>
    <div class="section-body">
      <RangeSlider label="Scanline Scale" bind:value={scale} bind:audioMode={ar.scale} bind:audioMax={am.scale} min={0.1} max={4.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
      <RangeSlider label="Scanline Thickness" bind:value={thin} bind:audioMode={ar.thin} bind:audioMax={am.thin} min={0.0} max={4.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
      <label class="checkbox-row">
        <input type="checkbox" bind:checked={antiMoire} />
        Anti-Moiré
      </label>
      <RangeSlider label="Blur" bind:value={blur} bind:audioMode={ar.blur} bind:audioMax={am.blur} min={0} max={10} step={0.1} formatValue={(v) => v.toFixed(1)} />
      <RangeSlider label="Glow" bind:value={glow} bind:audioMode={ar.glow} bind:audioMax={am.glow} min={0} max={2} step={0.01} formatValue={(v) => v.toFixed(2)} />
      <RangeSlider label="Mask Intensity" bind:value={mask} bind:audioMode={ar.mask} bind:audioMax={am.mask} min={0.0} max={1.5} step={0.01} formatValue={(v) => v.toFixed(2)} />
      <div class="toggle-label">Mask Type</div>
      <div class="toggle-group">
        <button class:active={maskType === 0} onclick={() => maskType = 0}>Shadow</button>
        <button class:active={maskType === 1} onclick={() => maskType = 1}>Grille</button>
        <button class:active={maskType === 2} onclick={() => maskType = 2}>Lite</button>
        <button class:active={maskType === 3} onclick={() => maskType = 3}>None</button>
      </div>
    </div>
  </details>

  <details class="section" open>
    <summary>Tube</summary>
    <div class="section-body">
      <RangeSlider label="Warp" bind:value={warp} bind:audioMode={ar.warp} bind:audioMax={am.warp} min={0.0} max={128.0} step={0.05} formatValue={(v) => v.toFixed(2)} />
      <RangeSlider label="Vignette" bind:value={minVin} bind:audioMode={ar.minVin} bind:audioMax={am.minVin} min={0.0} max={1.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
    </div>
  </details>

  <details class="section" open>
    <summary>VHS Effects</summary>
    <div class="section-body">
      <RangeSlider label="Chromatic Aberration" bind:value={chromatic} bind:audioMode={ar.chromatic} bind:audioMax={am.chromatic} min={0} max={100} step={0.1} formatValue={(v) => v.toFixed(1)} />
      <RangeSlider label="Static Noise" bind:value={noise} bind:audioMode={ar.noise} bind:audioMax={am.noise} min={0} max={1} step={0.01} formatValue={(v) => v.toFixed(2)} />
      <div class="toggle-label">Noise Shape</div>
      <div class="toggle-group">
        <button class:active={noiseShape === 0} onclick={() => noiseShape = 0}>Snow</button>
        <button class:active={noiseShape === 1} onclick={() => noiseShape = 1}>RGB</button>
        <button class:active={noiseShape === 2} onclick={() => noiseShape = 2}>Fine</button>
        <button class:active={noiseShape === 3} onclick={() => noiseShape = 3}>None</button>
      </div>
    </div>
  </details>

  <details class="section" open>
    <summary>Tracking</summary>
    <div class="section-body">
      <label class="bpm-input-row">
        BPM
        <input
          class="bpm-input"
          type="text"
          inputmode="numeric"
          bind:value={bpmDisplay}
          onfocus={(e) => { bpmFocused = true; e.currentTarget.select(); }}
          onblur={() => {
            const v = parseInt(bpmDisplay);
            if (v >= 30 && v <= 300) manualBpm = v;
            bpmDisplay = String(manualBpm);
            bpmFocused = false;
          }}
          onkeydown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        />
      </label>
      <div class="toggle-label">BPM Scale</div>
      <div class="toggle-group">
        <button class:active={bpmScale === 0.25} onclick={() => bpmScale = 0.25}>1/4</button>
        <button class:active={bpmScale === 0.5} onclick={() => bpmScale = 0.5}>1/2</button>
        <button class:active={bpmScale === 1} onclick={() => bpmScale = 1}>1x</button>
        <button class:active={bpmScale === 2} onclick={() => bpmScale = 2}>2x</button>
        <button class:active={bpmScale === 4} onclick={() => bpmScale = 4}>4x</button>
      </div>
      <RangeSlider label="Intensity" bind:value={trackingIntensity} bind:audioMode={ar.trackingIntensity} bind:audioMax={am.trackingIntensity} min={0} max={10} step={0.01} formatValue={(v) => v.toFixed(2)} />
      <RangeSlider label="Scale" bind:value={trackingScale} bind:audioMode={ar.trackingScale} bind:audioMax={am.trackingScale} min={0.01} max={2.0} step={0.01} formatValue={(v) => v.toFixed(2)} />
      <RangeSlider label="Glitch" bind:value={trackingGlitch} bind:audioMode={ar.trackingGlitch} bind:audioMax={am.trackingGlitch} min={0} max={2} step={0.01} formatValue={(v) => v.toFixed(2)} />
      <RangeSlider label="Glitch Scale" bind:value={trackingGlitchScale} bind:audioMode={ar.trackingGlitchScale} bind:audioMax={am.trackingGlitchScale} min={1} max={200} step={1} formatValue={(v) => v.toFixed(0)} />
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
    </div>
  </details>

  <details class="section" open>
    <summary>Presets</summary>
    <div class="section-body">
      {#if presetNames.length > 0}
        <div class="preset-list">
          {#each presetNames as name}
            <div class="preset-row">
              <button class="preset-load" onclick={() => handleLoadPreset(name)}>{name}</button>
              <button class="preset-delete" onclick={() => handleDeletePreset(name)} title="Delete">&times;</button>
            </div>
          {/each}
        </div>
      {/if}
      {#if savingPreset}
        <div class="preset-save-row">
          <input
            class="preset-input"
            type="text"
            placeholder="Preset name…"
            bind:value={presetName}
            onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter") handleSavePreset(); if (e.key === "Escape") savingPreset = false; }}
          />
          <button class="preset-confirm" onclick={handleSavePreset}>Save</button>
        </div>
      {:else}
        <button class="save-btn" onclick={() => savingPreset = true}>Save Preset</button>
      {/if}
    </div>
  </details>

  <div class="section">
    <button class="reset-btn" onclick={resetDefaults}>Reset to Defaults</button>
  </div>
</SettingsPanel>

<style>
  .section {
    margin-bottom: 0;
    padding-bottom: 12px;
  }
  details.section {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 12px 0;
  }
  details.section:first-child {
    padding-top: 0;
  }
  .section:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
  details.section > summary {
    margin: 0;
    padding: 4px 0;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.45);
    cursor: pointer;
    list-style: none;
    display: flex;
    align-items: center;
    gap: 6px;
    user-select: none;
    transition: color 0.2s;
  }
  details.section > summary::-webkit-details-marker {
    display: none;
  }
  details.section > summary::before {
    content: "\25B8";
    font-size: 10px;
    color: rgba(255, 255, 255, 0.25);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), color 0.2s;
  }
  details.section[open] > summary {
    color: rgba(255, 255, 255, 0.6);
  }
  details.section[open] > summary::before {
    transform: rotate(90deg);
    color: rgba(255, 255, 255, 0.45);
  }
  details.section > summary:hover {
    color: rgba(255, 255, 255, 0.75);
  }
  details.section > summary:hover::before {
    color: rgba(255, 255, 255, 0.5);
  }
  .section-body {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                opacity 0.2s ease;
  }
  details.section[open] > .section-body {
    grid-template-rows: 1fr;
    opacity: 1;
  }
  .section-body > :global(*) {
    overflow: hidden;
  }
  details.section[open] > .section-body {
    padding-top: 8px;
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
  .bpm-input-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
  }
  .bpm-input {
    width: 48px;
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    padding: 5px 0;
    font-size: 11px;
    font-family: inherit;
    text-align: center;
    transition: all 0.15s;
  }
  .bpm-input:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.7);
  }
  .bpm-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.3);
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
  .preset-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-bottom: 8px;
  }
  .preset-row {
    display: flex;
    gap: 2px;
  }
  .preset-load {
    flex: 1;
    padding: 5px 8px;
    font-size: 11px;
    text-align: left;
    color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: all 0.15s;
  }
  .preset-load:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }
  .preset-delete {
    width: 28px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    transition: all 0.15s;
  }
  .preset-delete:hover {
    color: rgba(255, 120, 120, 0.9);
    background: rgba(255, 120, 120, 0.1);
  }
  .preset-save-row {
    display: flex;
    gap: 4px;
  }
  .preset-input {
    flex: 1;
    padding: 5px 8px;
    font-size: 11px;
    color: #fff;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    outline: none;
  }
  .preset-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  .preset-confirm {
    padding: 5px 12px;
    font-size: 11px;
    color: rgba(120, 200, 255, 0.9);
    border: 1px solid rgba(120, 200, 255, 0.3);
    border-radius: 6px;
    background: rgba(120, 200, 255, 0.1);
    cursor: pointer;
  }
  .save-btn {
    width: 100%;
    padding: 8px;
    font-size: 12px;
    color: rgba(120, 200, 255, 0.8);
    border: 1px solid rgba(120, 200, 255, 0.25);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    cursor: pointer;
    backdrop-filter: blur(8px);
  }
  .save-btn:hover {
    background: rgba(120, 200, 255, 0.12);
    color: rgba(140, 210, 255, 1);
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
