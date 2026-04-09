<script lang="ts">
  let {
    label,
    value = $bindable(),
    min,
    max,
    step,
    formatValue,
    audioMode = $bindable(undefined),
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    formatValue?: (v: number) => string;
    audioMode?: number;
  } = $props();

  const display = $derived(formatValue ? formatValue(value) : String(value));
</script>

<label>
  <span>{label} <code>{display}</code></span>
  <div class="slider-row">
    <input type="range" {min} {max} {step} bind:value />
    {#if audioMode !== undefined}
      <div class="audio-toggles">
        <button
          class="audio-btn"
          class:active={audioMode === 1}
          title="Low-pass"
          onclick={() => audioMode = audioMode === 1 ? 0 : 1}
        >
          <svg viewBox="0 0 256 256" width="14" height="14">
            <path d="M24.22 67.796a3.995 3.995 0 0 1 4.008-3.991h85.498c8.834 0 19.732 6.112 24.345 13.657l53.76 87.936c3.46 5.66 11.628 10.247 18.256 10.247h16.718a3.996 3.996 0 0 1 3.994 4.007v8.985a4.007 4.007 0 0 1-4.007 4.008h-24.7c-8.835 0-19.709-6.13-24.283-13.683l-52.324-86.4c-3.43-5.665-11.577-10.257-18.202-10.257H28.214a3.995 3.995 0 0 1-3.993-3.992V67.796z" fill="currentColor" fill-rule="evenodd"/>
          </svg>
        </button>
        <button
          class="audio-btn"
          class:active={audioMode === 2}
          title="Mid (low+high)"
          onclick={() => audioMode = audioMode === 2 ? 0 : 2}
        >
          <svg viewBox="0 0 256 256" width="14" height="14">
            <path d="M24.22 67.796a3.995 3.995 0 0 1 4.008-3.991h85.498c8.834 0 19.732 6.112 24.345 13.657l53.76 87.936c3.46 5.66 11.628 10.247 18.256 10.247h16.718a3.996 3.996 0 0 1 3.994 4.007v8.985a4.007 4.007 0 0 1-4.007 4.008h-24.7c-8.835 0-19.709-6.13-24.283-13.683l-52.324-86.4c-3.43-5.665-11.577-10.257-18.202-10.257H28.214a3.995 3.995 0 0 1-3.993-3.992V67.796z" fill="currentColor" fill-rule="evenodd" opacity="0.5"/>
            <path d="M231.007 68.729c0-2.206-1.787-4.995-4.007-4.995h-85.499c-6.466 0-19.531 7.705-22.66 15.97l-55.92 85.647c-3.624 5.55-11.93 10.05-18.559 10.05H28.167c-2.206 0-3.994 2.787-3.994 5.007v8.985a4.005 4.005 0 0 0 3.998 4.007h22.713c8.832 0 20.495-8.703 23.588-16.987l56.167-84.189c3.68-5.517 12.04-9.99 18.668-9.99h77.695c2.212 0 4.005-2.797 4.005-4.994v-8.51z" fill="currentColor" fill-rule="evenodd" opacity="0.5"/>
          </svg>
        </button>
        <button
          class="audio-btn"
          class:active={audioMode === 3}
          title="High-pass"
          onclick={() => audioMode = audioMode === 3 ? 0 : 3}
        >
          <svg viewBox="0 0 256 256" width="14" height="14">
            <path d="M231.007 68.729c0-2.206-1.787-4.995-4.007-4.995h-85.499c-6.466 0-19.531 7.705-22.66 15.97l-55.92 85.647c-3.624 5.55-11.93 10.05-18.559 10.05H28.167c-2.206 0-3.994 2.787-3.994 5.007v8.985a4.005 4.005 0 0 0 3.998 4.007h22.713c8.832 0 20.495-8.703 23.588-16.987l56.167-84.189c3.68-5.517 12.04-9.99 18.668-9.99h77.695c2.212 0 4.005-2.797 4.005-4.994v-8.51z" fill="currentColor" fill-rule="evenodd"/>
          </svg>
        </button>
      </div>
    {/if}
  </div>
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

  .slider-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .slider-row input[type="range"] {
    flex: 1;
    min-width: 0;
  }

  .audio-toggles {
    display: flex;
    gap: 2px;
    flex-shrink: 0;
  }

  .audio-btn {
    width: 20px;
    height: 20px;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    background: transparent;
    color: rgba(255, 255, 255, 0.25);
    cursor: pointer;
    transition: all 0.15s;
  }

  .audio-btn:hover {
    color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.05);
  }

  .audio-btn.active {
    color: rgba(120, 200, 255, 0.9);
    background: rgba(120, 200, 255, 0.12);
    border-color: rgba(120, 200, 255, 0.3);
  }
</style>
