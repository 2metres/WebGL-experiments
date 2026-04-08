import { createPersistedStore } from "../../lib/stores";

export interface Settings {
  cameraStrength: number;
  audioBoostMin: number;
  audioBoostMax: number;
  velocityDecay: number;
  cameraVelocityDecay: number;
  triggerDecay: number;
  diffusion: number;
  motionThreshold: number;
  renderMode: number;
}

export const DEFAULTS: Settings = {
  cameraStrength: 25,
  audioBoostMin: 0.05,
  audioBoostMax: 8,
  velocityDecay: 0.99,
  cameraVelocityDecay: 0.9,
  triggerDecay: 0.999,
  diffusion: 0.15,
  motionThreshold: 2,
  renderMode: 0,
};

export const settingsStore = createPersistedStore<Settings>("vector-map:settings", DEFAULTS);

export type SettingsStore = ReturnType<typeof settingsStore.getState>;
