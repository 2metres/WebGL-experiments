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
  trackingSpeed: number;
  trackingIntensity: number;
}

export const DEFAULTS: CrtSettings = {
  scale: 0.33333,
  warp: 1.0,
  minVin: 0.5,
  thin: 0.75,
  blur: -2.75,
  mask: 0.65,
  maskType: 0,
  chromatic: 0.0,
  noise: 0.0,
  trackingSpeed: 0.0,
  trackingIntensity: 0.0,
};

export const settingsStore = createPersistedStore<CrtSettings>("crt-camera:settings", DEFAULTS);
