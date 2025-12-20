/**
 * Configuration Store
 * 
 * Stores global extension settings and preferences.
 * Persisted to Chrome storage.local for persistence across sessions.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createChromeStorage } from '@src/lib/storage';

export interface ExtensionConfig {
  // Event capture settings
  maxEvents: number;
  
  // Display settings
  theme: 'light' | 'dark' | 'auto';
  
  // Advanced settings
  throttleMs: number; // Throttle interval for high-frequency events
}

interface ConfigStore extends ExtensionConfig {
  // Actions
  setMaxEvents: (max: number) => void;
  setTheme: (theme: ExtensionConfig['theme']) => void;
  setThrottleMs: (ms: number) => void;
  reset: () => void;
}

const defaultConfig: ExtensionConfig = {
  maxEvents: 500,
  theme: 'auto',
  throttleMs: 100,
};

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set) => ({
      ...defaultConfig,

      setMaxEvents: (max) => set({ maxEvents: Math.max(1, Math.min(10000, max)) }),
      setTheme: (theme) => set({ theme }),
      setThrottleMs: (ms) => set({ throttleMs: Math.max(0, Math.min(5000, ms)) }),
      reset: () => set(defaultConfig),
    }),
    {
      name: 'analytics-xray-config',
      storage: createJSONStorage(() => createChromeStorage()),
      version: 1,
    }
  )
);

// Selectors for optimized re-renders
export const selectMaxEvents = (state: ConfigStore) => state.maxEvents;
export const selectTheme = (state: ConfigStore) => state.theme;
export const selectThrottleMs = (state: ConfigStore) => state.throttleMs;

