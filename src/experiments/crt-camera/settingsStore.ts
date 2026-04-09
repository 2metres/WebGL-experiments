import { createPersistedStore } from "../../lib/stores";

export interface CrtSettings {
  scale: number;
  warp: number;
  minVin: number;
  thin: number;
  blur: number;
  mask: number;
  maskType: number;
  chromatic: number;
  noise: number;
  noiseShape: number;
  scanlineGlitch: number;
  trackingSpeed: number;
  trackingIntensity: number;
  trackingBlend: number;
  audioReactive: boolean;
}

export const DEFAULTS: CrtSettings = {
  scale: 0.4,
  warp: 32,
  minVin: 0,
  thin: 0.6,
  blur: 0,
  mask: 0.07,
  maskType: 2,
  chromatic: 10,
  noise: 0.24,
  noiseShape: 0,
  scanlineGlitch: 0,
  trackingSpeed: 2.3,
  trackingIntensity: 3,
  trackingBlend: 2,
  audioReactive: true,
};

export const settingsStore = createPersistedStore<CrtSettings>("crt-camera:settings", DEFAULTS);
