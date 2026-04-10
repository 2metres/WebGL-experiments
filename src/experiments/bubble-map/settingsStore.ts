import { createPersistedStore } from "../../lib/stores";

export interface Settings {
  // Bubbles
  growthRate: number;
  maxRadius: number;
  brushRadius: number;
  // Physics
  physicsMode: number;  // 0=static, 1=float, 2=drip
  gravity: number;
  viscosity: number;
  // Appearance
  thickness: number;    // maps to density threshold
  densityScale: number; // per-bubble contribution (lower = more stacking depth)
  softness: number;     // 0=sharp bubbles, 1=soft clouds
  depthScale: number;   // visual depth exaggeration
  opacity: number;
  colorHue: number;
  colorSat: number;
  colorVal: number;
  useBaseColor: number; // 0=per-stroke hue, 1=base color
  // Lighting
  shininess: number;
  ambient: number;
  specStrength: number;
  rimPower: number;
  rimStrength: number;
  lightAngleX: number;
  lightAngleY: number;
}

export const DEFAULTS: Settings = {
  growthRate: 3.0,
  maxRadius: 5.0,
  brushRadius: 4,
  physicsMode: 0,
  gravity: 15,
  viscosity: 0.3,
  thickness: 0.04,
  densityScale: 0.06,
  softness: 0.8,
  depthScale: 6.0,
  opacity: 1.0,
  colorHue: 0.55,
  colorSat: 0.7,
  colorVal: 0.9,
  useBaseColor: 0,
  shininess: 64,
  ambient: 0.15,
  specStrength: 1.2,
  rimPower: 2.5,
  rimStrength: 0.8,
  lightAngleX: 0.5,
  lightAngleY: 0.8,
};

export const settingsStore = createPersistedStore<Settings>("bubble-map:settings", DEFAULTS);
