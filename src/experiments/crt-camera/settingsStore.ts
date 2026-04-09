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
  scale: 0.75,
  warp: 2,
  minVin: 0,
  thin: 1,
  blur: -3,
  mask: 0.69,
  maskType: 2,
  chromatic: 0.1,
  noise: 0.05,
  trackingSpeed: 1.7,
  trackingIntensity: 0.13,
};

export const settingsStore = createPersistedStore<CrtSettings>("crt-camera:settings", DEFAULTS);
