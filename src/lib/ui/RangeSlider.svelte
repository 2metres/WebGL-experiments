<script lang="ts">
  let {
    label,
    value = $bindable(),
    min,
    max,
    step,
    formatValue,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    formatValue?: (v: number) => string;
  } = $props();

  const display = $derived(formatValue ? formatValue(value) : String(value));
</script>

<label>
  <span>{label} <code>{display}</code></span>
  <input type="range" {min} {max} {step} bind:value />
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

  code {
    color: rgba(255, 255, 255, 0.5);
    font-size: 11px;
  }

  input[type="range"] {
    width: 100%;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    outline: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.7);
    cursor: pointer;
  }
</style>
