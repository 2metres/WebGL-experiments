import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";

export function createPersistedStore<T extends object>(
  key: string,
  defaults: T,
) {
  type Store = T & {
    set: <K extends keyof T>(key: K, value: T[K]) => void;
    resetDefaults: () => void;
  };

  return createStore<Store>()(
    persist(
      (set) => ({
        ...defaults,
        set: (k, value) => set({ [k]: value } as Partial<Store>),
        resetDefaults: () => set(defaults as Partial<Store>),
      }),
      { name: key },
    ),
  );
}
