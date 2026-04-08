<script lang="ts">
  import { RangeSlider, SelectInput, SettingsPanel } from "../../lib/ui";
  import { settingsStore, DEFAULTS } from "./settingsStore";

  let cameraStrength = $state(settingsStore.getState().cameraStrength);
  let audioBoostMin = $state(settingsStore.getState().audioBoostMin);
  let audioBoostMax = $state(settingsStore.getState().audioBoostMax);
  let velocityDecay = $state(settingsStore.getState().velocityDecay);
  let cameraVelocityDecay = $state(settingsStore.getState().cameraVelocityDecay);
  let triggerDecay = $state(settingsStore.getState().triggerDecay);
  let diffusion = $state(settingsStore.getState().diffusion);
  let motionThreshold = $state(settingsStore.getState().motionThreshold);
  let renderMode = $state(settingsStore.getState().renderMode);

  // Keep zustand in sync when Svelte state changes
  $effect(() => { settingsStore.getState().set("cameraStrength", cameraStrength); });
  $effect(() => { settingsStore.getState().set("audioBoostMin", audioBoostMin); });
  $effect(() => { settingsStore.getState().set("audioBoostMax", audioBoostMax); });
  $effect(() => { settingsStore.getState().set("velocityDecay", velocityDecay); });
  $effect(() => { settingsStore.getState().set("cameraVelocityDecay", cameraVelocityDecay); });
  $effect(() => { settingsStore.getState().set("triggerDecay", triggerDecay); });
  $effect(() => { settingsStore.getState().set("diffusion", diffusion); });
  $effect(() => { settingsStore.getState().set("motionThreshold", motionThreshold); });
  $effect(() => { settingsStore.getState().set("renderMode", renderMode); });

  function resetDefaults() {
    settingsStore.getState().resetDefaults();
    cameraStrength = DEFAULTS.cameraStrength;
    audioBoostMin = DEFAULTS.audioBoostMin;
    audioBoostMax = DEFAULTS.audioBoostMax;
    velocityDecay = DEFAULTS.velocityDecay;
    cameraVelocityDecay = DEFAULTS.cameraVelocityDecay;
    triggerDecay = DEFAULTS.triggerDecay;
    diffusion = DEFAULTS.diffusion;
    motionThreshold = DEFAULTS.motionThreshold;
    renderMode = DEFAULTS.renderMode;
  }
</script>

<SettingsPanel onmousedown={(e) => e.stopPropagation()}>
  <div class="section">
    <h3>Camera</h3>
    <RangeSlider label="Strength" bind:value={cameraStrength} min={1} max={100} step={1} formatValue={(v) => v.toFixed(0)} />
    <RangeSlider label="Audio Boost Min" bind:value={audioBoostMin} min={0} max={1} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Audio Boost Max" bind:value={audioBoostMax} min={1} max={30} step={0.5} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Noise Filter" bind:value={motionThreshold} min={0} max={4} step={1} />
  </div>

  <div class="section">
    <h3>Velocity</h3>
    <RangeSlider label="Decay" bind:value={velocityDecay} min={0} max={1} step={0.001} formatValue={(v) => v.toFixed(3)} />
    <RangeSlider label="Camera Decay" bind:value={cameraVelocityDecay} min={0} max={1} step={0.001} formatValue={(v) => v.toFixed(3)} />
    <RangeSlider label="Diffusion" bind:value={diffusion} min={0} max={1} step={0.001} formatValue={(v) => v.toFixed(3)} />
  </div>

  <div class="section">
    <h3>Triggers</h3>
    <RangeSlider label="Trigger Decay" bind:value={triggerDecay} min={0} max={1} step={0.001} formatValue={(v) => v.toFixed(4)} />
  </div>

  <div class="section">
    <h3>Display</h3>
    <SelectInput label="Render Mode" bind:value={renderMode}>
      <option value={0}>Arrows</option>
      <option value={1}>Digits (0–9)</option>
      <option value={2}>Lines (─│╱╲)</option>
    </SelectInput>
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
