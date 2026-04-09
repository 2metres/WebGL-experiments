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
  scale: 0.75,
  warp: 2,
  minVin: 0,
  thin: 1,
  blur: -2.5,
  mask: 0.69,
  maskType: 2,
  chromatic: 0.1,
  noise: 0.05,
  noiseShape: 0,
  scanlineGlitch: 0,
  trackingSpeed: 1.7,
  trackingIntensity: 0.13,
  trackingBlend: 0,
  audioReactive: false,
};

export const settingsStore = createPersistedStore<CrtSettings>("crt-camera:settings", DEFAULTS);
