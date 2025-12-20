/**
 * Configuration Store
 * 
 * Stores global extension settings and preferences.
 * Persisted to Chrome storage.local for persistence across sessions.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createChromeStorage } from '@src/lib/storage';

/**
 * Pinned properties configuration
 * Structure supports future-proofing with profiles (e.g., "default", "project-a", etc.)
 */
export interface PinnedPropertiesProfile {
  // Top-level properties section pins
  properties: string[];
  // Top-level traits section pins (for identify events)
  traits: string[];
  // Context section pins organized by subsection
  context: {
    page: string[];
    library: string[];
    other: string[];
    browser: string[];
  };
  // Metadata section pins organized by subsection
  metadata: {
    identifiers: string[];
    captureInfo: string[];
    integrations: string[];
  };
}

export interface PinnedPropertiesConfig {
  [profileKey: string]: PinnedPropertiesProfile;
}

const defaultPinnedProfile: PinnedPropertiesProfile = {
  properties: [],
  traits: [],
  context: {
    page: [],
    library: [],
    other: [],
    browser: [],
  },
  metadata: {
    identifiers: [],
    captureInfo: [],
    integrations: [],
  },
};

export interface ExtensionConfig {
  // Event capture settings
  maxEvents: number;
  
  // Display settings
  theme: 'light' | 'dark' | 'auto';
  
  // Advanced settings
  throttleMs: number; // Throttle interval for high-frequency events
  
  // Pinned properties settings (keyed by profile, "default" is the default profile)
  pinnedProperties: PinnedPropertiesConfig;
}

interface ConfigStore extends ExtensionConfig {
  // Actions
  setMaxEvents: (max: number) => void;
  setTheme: (theme: ExtensionConfig['theme']) => void;
  setThrottleMs: (ms: number) => void;
  reset: () => void;
  
  // Pin actions
  togglePin: (section: string, subsection: string | null, property: string, profile?: string) => void;
  isPinned: (section: string, subsection: string | null, property: string, profile?: string) => boolean;
  getPinnedProperties: (section: string, subsection: string | null, profile?: string) => string[];
}

const defaultConfig: ExtensionConfig = {
  maxEvents: 500,
  theme: 'auto',
  throttleMs: 100,
  pinnedProperties: {
    default: defaultPinnedProfile,
  },
};

/**
 * Helper to get pinned array path based on section and subsection
 */
function getPinnedPath(
  profile: PinnedPropertiesProfile,
  section: string,
  subsection: string | null
): string[] | null {
  if (section === 'properties') {
    return profile.properties;
  }
  if (section === 'traits') {
    return profile.traits;
  }
  if (section === 'context' && subsection) {
    const contextKey = subsection as keyof typeof profile.context;
    return profile.context[contextKey] ?? null;
  }
  if (section === 'metadata' && subsection) {
    const metadataKey = subsection as keyof typeof profile.metadata;
    return profile.metadata[metadataKey] ?? null;
  }
  return null;
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      ...defaultConfig,

      setMaxEvents: (max) => set({ maxEvents: Math.max(1, Math.min(10000, max)) }),
      setTheme: (theme) => set({ theme }),
      setThrottleMs: (ms) => set({ throttleMs: Math.max(0, Math.min(5000, ms)) }),
      // Reset only user-visible settings, preserve pinned properties (internal state)
      reset: () => set((state) => ({
        maxEvents: defaultConfig.maxEvents,
        theme: defaultConfig.theme,
        throttleMs: defaultConfig.throttleMs,
        // Preserve pinnedProperties - they're internal state not shown in Options
        pinnedProperties: state.pinnedProperties,
      })),

      togglePin: (section, subsection, property, profile = 'default') => {
        set((state) => {
          const currentProfile = state.pinnedProperties[profile] ?? { ...defaultPinnedProfile };
          const newProfile = JSON.parse(JSON.stringify(currentProfile)) as PinnedPropertiesProfile;
          
          if (section === 'properties') {
            const idx = newProfile.properties.indexOf(property);
            if (idx === -1) {
              newProfile.properties.push(property);
            } else {
              newProfile.properties.splice(idx, 1);
            }
          } else if (section === 'traits') {
            const idx = newProfile.traits.indexOf(property);
            if (idx === -1) {
              newProfile.traits.push(property);
            } else {
              newProfile.traits.splice(idx, 1);
            }
          } else if (section === 'context' && subsection) {
            const contextKey = subsection as keyof typeof newProfile.context;
            if (newProfile.context[contextKey]) {
              const arr = newProfile.context[contextKey];
              const idx = arr.indexOf(property);
              if (idx === -1) {
                arr.push(property);
              } else {
                arr.splice(idx, 1);
              }
            }
          } else if (section === 'metadata' && subsection) {
            const metadataKey = subsection as keyof typeof newProfile.metadata;
            if (newProfile.metadata[metadataKey]) {
              const arr = newProfile.metadata[metadataKey];
              const idx = arr.indexOf(property);
              if (idx === -1) {
                arr.push(property);
              } else {
                arr.splice(idx, 1);
              }
            }
          }
          
          return {
            pinnedProperties: {
              ...state.pinnedProperties,
              [profile]: newProfile,
            },
          };
        });
      },

      isPinned: (section, subsection, property, profile = 'default') => {
        const state = get();
        const currentProfile = state.pinnedProperties[profile];
        if (!currentProfile) return false;
        
        const pinnedArr = getPinnedPath(currentProfile, section, subsection);
        return pinnedArr?.includes(property) ?? false;
      },

      getPinnedProperties: (section, subsection, profile = 'default') => {
        const state = get();
        const currentProfile = state.pinnedProperties[profile];
        if (!currentProfile) return [];
        
        const pinnedArr = getPinnedPath(currentProfile, section, subsection);
        return pinnedArr ?? [];
      },
    }),
    {
      name: 'analytics-xray-config',
      storage: createJSONStorage(() => createChromeStorage()),
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as ExtensionConfig;
        if (version < 2) {
          // Migration from v1 to v2: add pinnedProperties
          return {
            ...state,
            pinnedProperties: {
              default: defaultPinnedProfile,
            },
          };
        }
        if (version < 3) {
          // Migration from v2 to v3: add traits to pinnedProperties profiles
          const updatedPinnedProperties: PinnedPropertiesConfig = {};
          for (const [profileKey, profile] of Object.entries(state.pinnedProperties)) {
            updatedPinnedProperties[profileKey] = {
              ...profile,
              traits: [],
            };
          }
          return {
            ...state,
            pinnedProperties: updatedPinnedProperties,
          };
        }
        return state;
      },
    }
  )
);

// Selectors for optimized re-renders
export const selectMaxEvents = (state: ConfigStore) => state.maxEvents;
export const selectTheme = (state: ConfigStore) => state.theme;
export const selectThrottleMs = (state: ConfigStore) => state.throttleMs;
export const selectPinnedProperties = (state: ConfigStore) => state.pinnedProperties;
export const selectTogglePin = (state: ConfigStore) => state.togglePin;
export const selectIsPinned = (state: ConfigStore) => state.isPinned;
export const selectGetPinnedProperties = (state: ConfigStore) => state.getPinnedProperties;

