import { createPersistedStore } from "../../lib/stores";

export interface Settings {
  // Emitters & particles
  spawnRate: number;     // particles per emitter per second
  emitterLife: number;   // seconds before emitter dies (0=infinite)
  spread: number;        // emit angle spread (radians)
  particleLife: number;  // particle lifetime in seconds
  growthRate: number;
  maxRadius: number;
  brushRadius: number;
  // Physics
  physicsMode: number;
  gravity: number;
  viscosity: number;
  // Density field
  thickness: number;      // surface threshold
  densityScale: number;   // per-bubble contribution
  softness: number;       // falloff shape
  // Fluid appearance
  absorption: number;     // Beer's law absorption strength
  colorHue: number;
  colorSat: number;
  colorVal: number;
  useBaseColor: number;
  opacity: number;
  // Lighting
  depthScale: number;     // normal exaggeration
  shininess: number;
  specStrength: number;
  fresnelF0: number;      // base reflectivity (0.02=water, higher=gooier)
  envBright: number;      // environment reflection brightness
  bgBright: number;       // background brightness (0=dark, 1=white)
  lightAngleX: number;
  lightAngleY: number;
}

export const DEFAULTS: Settings = {
  spawnRate: 8,
  emitterLife: 5,
  spread: 2.0,
  particleLife: 4.0,
  growthRate: 4.0,
  maxRadius: 12.0,
  brushRadius: 4,
  physicsMode: 0,
  gravity: 15,
  viscosity: 0.3,
  thickness: 0.15,
  densityScale: 0.3,
  softness: 0.85,
  absorption: 3.0,
  colorHue: 0.55,
  colorSat: 0.7,
  colorVal: 0.9,
  useBaseColor: 0,
  opacity: 1.0,
  depthScale: 5.0,
  shininess: 180,
  specStrength: 2.0,
  fresnelF0: 0.05,
  envBright: 1.0,
  bgBright: 0.9,
  lightAngleX: 0.5,
  lightAngleY: 0.8,
};

export const settingsStore = createPersistedStore<Settings>("bubble-map:settings", DEFAULTS);
