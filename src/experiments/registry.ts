import type { Component } from "svelte";

export interface ExperimentEntry {
  id: string;
  label: string;
  loader: () => Promise<{ default: Component }>;
}

export const experiments: ExperimentEntry[] = [
  {
    id: "vector-map",
    label: "Vector Map",
    loader: () => import("./vector-map/VectorMap.svelte"),
  },
  {
    id: "crt-camera",
    label: "CRT Camera",
    loader: () => import("./crt-camera/CrtCamera.svelte"),
  },
];

export function getExperiment(id: string): ExperimentEntry | undefined {
  return experiments.find((e) => e.id === id);
}
