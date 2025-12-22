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

export interface AllowedDomain {
  domain: string;        // e.g., "example.com"
  allowSubdomains: boolean;
}

export interface ExtensionConfig {
  // Event capture settings
  maxEvents: number;
  
  // Display settings
  theme: 'light' | 'dark' | 'auto';
  preferredEventDetailView: 'json' | 'structured'; // Preferred view mode for event details
  
  // Domain tracking settings
  allowedDomains: AllowedDomain[];
  deniedDomains: string[]; // List of domains user has explicitly denied
  
  // Pinned properties settings (keyed by profile, "default" is the default profile)
  pinnedProperties: PinnedPropertiesConfig;
}

interface ConfigStore extends ExtensionConfig {
  // Actions
  setMaxEvents: (max: number) => void;
  setTheme: (theme: ExtensionConfig['theme']) => void;
  setPreferredEventDetailView: (view: ExtensionConfig['preferredEventDetailView']) => void;
  reset: () => void;
  
  // Domain allowlist actions
  addAllowedDomain: (domain: string, allowSubdomains: boolean) => void;
  removeAllowedDomain: (domain: string) => void;
  updateDomainSubdomainSetting: (domain: string, allowSubdomains: boolean) => void;
  addDeniedDomain: (domain: string) => void;
  removeDeniedDomain: (domain: string) => void;
  
  // Pin actions
  togglePin: (section: string, subsection: string | null, property: string, profile?: string) => void;
  isPinned: (section: string, subsection: string | null, property: string, profile?: string) => boolean;
  getPinnedProperties: (section: string, subsection: string | null, profile?: string) => string[];
}

const defaultConfig: ExtensionConfig = {
  maxEvents: 500,
  theme: 'auto',
  preferredEventDetailView: 'structured',
  allowedDomains: [],
  deniedDomains: [],
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
      setPreferredEventDetailView: (view) => set({ preferredEventDetailView: view }),
      // Reset only user-visible settings, preserve pinned properties (internal state)
      reset: () => set((state) => ({
        maxEvents: defaultConfig.maxEvents,
        theme: defaultConfig.theme,
        preferredEventDetailView: defaultConfig.preferredEventDetailView,
        // Preserve pinnedProperties - they're internal state not shown in Options
        pinnedProperties: state.pinnedProperties,
        // Preserve allowedDomains and deniedDomains - user may want to keep their settings
        allowedDomains: state.allowedDomains,
        deniedDomains: state.deniedDomains,
      })),

      // Domain allowlist actions
      addAllowedDomain: (domain, allowSubdomains) => {
        set((state) => {
          // Import domain utilities (dynamic import to avoid circular dependency)
          // Note: Domain normalization should be done by the caller, but we'll handle it here too
          let normalizedDomain = domain.toLowerCase().trim();
          
          // Remove www. prefix if present
          if (normalizedDomain.startsWith('www.')) {
            normalizedDomain = normalizedDomain.slice(4);
          }
          
          // If allowing subdomains, get base domain (strip subdomains)
          if (allowSubdomains && normalizedDomain.split('.').length > 2) {
            const parts = normalizedDomain.split('.');
            normalizedDomain = parts.slice(-2).join('.');
          }
          
          // Remove from denied list if it's there (check both original and normalized)
          const updatedDenied = state.deniedDomains.filter((d) => {
            const normalizedDenied = d.toLowerCase().startsWith('www.') ? d.slice(4) : d.toLowerCase();
            return normalizedDenied !== normalizedDomain && d !== domain;
          });
          
          // Check if domain already exists in allowed list (compare normalized)
          const existingIndex = state.allowedDomains.findIndex((d) => {
            const existingNormalized = d.domain.toLowerCase().startsWith('www.') 
              ? d.domain.toLowerCase().slice(4) 
              : d.domain.toLowerCase();
            return existingNormalized === normalizedDomain || d.domain === normalizedDomain;
          });
          
          if (existingIndex >= 0) {
            // Update existing entry
            const updated = [...state.allowedDomains];
            updated[existingIndex] = { domain: normalizedDomain, allowSubdomains };
            return { 
              allowedDomains: updated,
              deniedDomains: updatedDenied,
            };
          }
          // Add new domain
          return {
            allowedDomains: [...state.allowedDomains, { domain: normalizedDomain, allowSubdomains }],
            deniedDomains: updatedDenied,
          };
        });
      },
      removeAllowedDomain: (domain) => {
        set((state) => ({
          allowedDomains: state.allowedDomains.filter((d) => d.domain !== domain),
        }));
      },
      updateDomainSubdomainSetting: (domain, allowSubdomains) => {
        set((state) => {
          const existingIndex = state.allowedDomains.findIndex((d) => d.domain === domain);
          if (existingIndex >= 0) {
            const updated = [...state.allowedDomains];
            updated[existingIndex] = { ...updated[existingIndex], allowSubdomains };
            return { allowedDomains: updated };
          }
          return state;
        });
      },
      addDeniedDomain: (domain) => {
        set((state) => {
          // Normalize domain (strip www.)
          let normalizedDomain = domain.toLowerCase().trim();
          if (normalizedDomain.startsWith('www.')) {
            normalizedDomain = normalizedDomain.slice(4);
          }
          
          // Remove from allowed if it was there (check both original and normalized)
          const updatedAllowed = state.allowedDomains.filter((d) => {
            const allowedNormalized = d.domain.toLowerCase().startsWith('www.') 
              ? d.domain.toLowerCase().slice(4) 
              : d.domain.toLowerCase();
            return allowedNormalized !== normalizedDomain && d.domain !== domain && d.domain !== normalizedDomain;
          });
          
          // Add to denied if not already there (check both original and normalized)
          const alreadyDenied = state.deniedDomains.some((d) => {
            const deniedNormalized = d.toLowerCase().startsWith('www.') 
              ? d.toLowerCase().slice(4) 
              : d.toLowerCase();
            return deniedNormalized === normalizedDomain || d === domain || d === normalizedDomain;
          });
          
          const updatedDenied = alreadyDenied
            ? state.deniedDomains
            : [...state.deniedDomains, normalizedDomain];
          
          return {
            allowedDomains: updatedAllowed,
            deniedDomains: updatedDenied,
          };
        });
      },
      removeDeniedDomain: (domain) => {
        set((state) => ({
          deniedDomains: state.deniedDomains.filter((d) => d !== domain),
        }));
      },

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
        version: 5,
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
          if (version < 4) {
            // Migration from v3 to v4: add preferredEventDetailView
            return {
              ...state,
              preferredEventDetailView: defaultConfig.preferredEventDetailView,
            };
          }
          if (version < 5) {
            // Migration from v4 to v5: add allowedDomains and deniedDomains
            return {
              ...state,
              allowedDomains: defaultConfig.allowedDomains,
              deniedDomains: defaultConfig.deniedDomains,
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
export const selectPreferredEventDetailView = (state: ConfigStore) => state.preferredEventDetailView;
export const selectAllowedDomains = (state: ConfigStore) => state.allowedDomains;
export const selectDeniedDomains = (state: ConfigStore) => state.deniedDomains;
export const selectPinnedProperties = (state: ConfigStore) => state.pinnedProperties;
export const selectTogglePin = (state: ConfigStore) => state.togglePin;
export const selectIsPinned = (state: ConfigStore) => state.isPinned;
export const selectGetPinnedProperties = (state: ConfigStore) => state.getPinnedProperties;

