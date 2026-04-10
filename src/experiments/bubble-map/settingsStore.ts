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
  lightAngleX: number;
  lightAngleY: number;
}

export const DEFAULTS: Settings = {
  spawnRate: 8,
  emitterLife: 5,
  spread: 2.0,
  particleLife: 4.0,
  growthRate: 3.0,
  maxRadius: 5.0,
  brushRadius: 4,
  physicsMode: 0,
  gravity: 15,
  viscosity: 0.3,
  thickness: 0.03,
  densityScale: 0.05,
  softness: 0.85,
  absorption: 4.0,
  colorHue: 0.55,
  colorSat: 0.7,
  colorVal: 0.9,
  useBaseColor: 0,
  opacity: 1.0,
  depthScale: 8.0,
  shininess: 200,
  specStrength: 1.5,
  fresnelF0: 0.04,
  envBright: 0.6,
  lightAngleX: 0.5,
  lightAngleY: 0.8,
};

export const settingsStore = createPersistedStore<Settings>("bubble-map:settings", DEFAULTS);
