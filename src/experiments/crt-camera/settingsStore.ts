import { createPersistedStore } from "../../lib/stores";

export interface CrtSettings {
  scale: number;
  warp: number;
  minVin: number;
  thin: number;
  blur: number;
  mask: number;
  maskType: number;
  antiMoire: boolean;
  chromatic: number;
  noise: number;
  noiseShape: number;
  trackingScale: number;
  trackingGlitch: number;
  trackingGlitchScale: number;
  trackingSpeed: number;
  trackingIntensity: number;
  trackingBlend: number;
  glow: number;
  bpmScale: number;
  audioReactive: Record<string, number>;
  audioMax: Record<string, number>;
}

export const DEFAULTS: CrtSettings = {
  scale: 0.4,
  warp: 32,
  minVin: 0,
  thin: 0.6,
  blur: 0,
  mask: 0.07,
  maskType: 2,
  antiMoire: false,
  chromatic: 10,
  noise: 0.24,
  noiseShape: 0,
  trackingScale: 0.05,
  trackingGlitch: 0,
  trackingGlitchScale: 20,
  trackingSpeed: 2.3,
  trackingIntensity: 3,
  trackingBlend: 2,
  glow: 0,
  bpmScale: 0,
  audioReactive: {
    scale: 0, thin: 0, blur: 0, glow: 0, mask: 0,
    warp: 0, minVin: 0,
    chromatic: 0, noise: 0,
    trackingIntensity: 1, trackingScale: 1,
    trackingGlitch: 0, trackingGlitchScale: 0,
  },
  audioMax: {
    scale: 1.0, thin: 1.0, blur: 5, glow: 1, mask: 0.5,
    warp: 32, minVin: 0.5,
    chromatic: 30, noise: 0.5,
    trackingIntensity: 6, trackingScale: 0.2,
    trackingGlitch: 1, trackingGlitchScale: 80,
  },
};

export const settingsStore = createPersistedStore<CrtSettings>("crt-camera:settings", DEFAULTS);

const PRESETS_KEY = "crt-camera:presets";

export function loadPresets(): Record<string, CrtSettings> {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_KEY) || "{}");
  } catch { return {}; }
}

export function savePreset(name: string, settings: CrtSettings) {
  const presets = loadPresets();
  presets[name] = settings;
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function deletePreset(name: string) {
  const presets = loadPresets();
  delete presets[name];
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}
