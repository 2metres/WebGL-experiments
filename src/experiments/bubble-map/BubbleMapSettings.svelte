<script lang="ts">
  import { RangeSlider, SettingsPanel } from "../../lib/ui";
  import { settingsStore, DEFAULTS } from "./settingsStore";

  let growthRate = $state(settingsStore.getState().growthRate);
  let maxRadius = $state(settingsStore.getState().maxRadius);
  let threshold = $state(settingsStore.getState().threshold);
  let shininess = $state(settingsStore.getState().shininess);
  let ambient = $state(settingsStore.getState().ambient);
  let specStrength = $state(settingsStore.getState().specStrength);
  let rimPower = $state(settingsStore.getState().rimPower);
  let rimStrength = $state(settingsStore.getState().rimStrength);
  let brushRadius = $state(settingsStore.getState().brushRadius);
  let lightAngleX = $state(settingsStore.getState().lightAngleX);
  let lightAngleY = $state(settingsStore.getState().lightAngleY);

  $effect(() => { settingsStore.getState().set("growthRate", growthRate); });
  $effect(() => { settingsStore.getState().set("maxRadius", maxRadius); });
  $effect(() => { settingsStore.getState().set("threshold", threshold); });
  $effect(() => { settingsStore.getState().set("shininess", shininess); });
  $effect(() => { settingsStore.getState().set("ambient", ambient); });
  $effect(() => { settingsStore.getState().set("specStrength", specStrength); });
  $effect(() => { settingsStore.getState().set("rimPower", rimPower); });
  $effect(() => { settingsStore.getState().set("rimStrength", rimStrength); });
  $effect(() => { settingsStore.getState().set("brushRadius", brushRadius); });
  $effect(() => { settingsStore.getState().set("lightAngleX", lightAngleX); });
  $effect(() => { settingsStore.getState().set("lightAngleY", lightAngleY); });

  function resetDefaults() {
    settingsStore.getState().resetDefaults();
    growthRate = DEFAULTS.growthRate;
    maxRadius = DEFAULTS.maxRadius;
    threshold = DEFAULTS.threshold;
    shininess = DEFAULTS.shininess;
    ambient = DEFAULTS.ambient;
    specStrength = DEFAULTS.specStrength;
    rimPower = DEFAULTS.rimPower;
    rimStrength = DEFAULTS.rimStrength;
    brushRadius = DEFAULTS.brushRadius;
    lightAngleX = DEFAULTS.lightAngleX;
    lightAngleY = DEFAULTS.lightAngleY;
  }
</script>

<SettingsPanel onmousedown={(e) => e.stopPropagation()}>
  <div class="section">
    <h3>Bubbles</h3>
    <RangeSlider label="Growth Rate" bind:value={growthRate} min={0.1} max={10} step={0.1} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Max Radius" bind:value={maxRadius} min={0.5} max={10} step={0.1} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Brush Size" bind:value={brushRadius} min={1} max={10} step={1} />
  </div>

  <div class="section">
    <h3>Goo Surface</h3>
    <RangeSlider label="Threshold" bind:value={threshold} min={0.01} max={0.5} step={0.01} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Shininess" bind:value={shininess} min={1} max={128} step={1} />
    <RangeSlider label="Specular" bind:value={specStrength} min={0} max={2} step={0.05} formatValue={(v) => v.toFixed(2)} />
  </div>

  <div class="section">
    <h3>Lighting</h3>
    <RangeSlider label="Ambient" bind:value={ambient} min={0} max={1} step={0.05} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Light X" bind:value={lightAngleX} min={-1.5} max={1.5} step={0.05} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Light Y" bind:value={lightAngleY} min={-1.5} max={1.5} step={0.05} formatValue={(v) => v.toFixed(2)} />
    <RangeSlider label="Rim Power" bind:value={rimPower} min={0.5} max={8} step={0.1} formatValue={(v) => v.toFixed(1)} />
    <RangeSlider label="Rim Strength" bind:value={rimStrength} min={0} max={2} step={0.05} formatValue={(v) => v.toFixed(2)} />
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
