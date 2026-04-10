import { createPersistedStore } from "../../lib/stores";

export interface Settings {
  growthRate: number;
  maxRadius: number;
  threshold: number;
  shininess: number;
  ambient: number;
  specStrength: number;
  rimPower: number;
  rimStrength: number;
  brushRadius: number;
  lightAngleX: number;
  lightAngleY: number;
}

export const DEFAULTS: Settings = {
  growthRate: 2.0,
  maxRadius: 3.0,
  threshold: 0.12,
  shininess: 32,
  ambient: 0.25,
  specStrength: 0.6,
  rimPower: 3.0,
  rimStrength: 0.4,
  brushRadius: 3,
  lightAngleX: 0.4,
  lightAngleY: 0.6,
};

export const settingsStore = createPersistedStore<Settings>("bubble-map:settings", DEFAULTS);
