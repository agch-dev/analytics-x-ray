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

export interface SectionDefaults {
  // Section default expanded states
  sections: {
    properties: boolean;
    traits: boolean;
    context: boolean;
    metadata: boolean;
  };
  // Subsection default expanded states (keys prefixed with section key)
  subsections: {
    context: {
      contextPage: boolean;
      contextLibrary: boolean;
      contextOther: boolean;
      contextBrowser: boolean;
    };
    metadata: {
      metadataIdentifiers: boolean;
      metadataCaptureInfo: boolean;
      metadataIntegrations: boolean;
    };
  };
  // Special behavior toggles
  specialDefaults: {
    contextPageAlwaysOpenForPageEvents: boolean;
    metadataIdentifiersAlwaysOpenForIdentityEvents: boolean;
  };
}

export interface ExtensionConfig {
  // Event capture settings
  maxEvents: number;

  // Display settings
  theme: 'light' | 'dark' | 'auto';
  preferredEventDetailView: 'json' | 'structured'; // Preferred view mode for event details

  // Pinned properties settings (keyed by profile, "default" is the default profile)
  pinnedProperties: PinnedPropertiesConfig;

  // Onboarding settings
  dismissedOnboardingModals: string[]; // List of onboarding modal IDs that have been dismissed

  // Section defaults configuration
  sectionDefaults: SectionDefaults;
}

interface ConfigStore extends ExtensionConfig {
  // Actions
  setMaxEvents: (max: number) => void;
  setTheme: (theme: ExtensionConfig['theme']) => void;
  setPreferredEventDetailView: (
    view: ExtensionConfig['preferredEventDetailView']
  ) => void;
  reset: () => void;

  // Pin actions
  togglePin: (
    section: string,
    subsection: string | null,
    property: string,
    profile?: string
  ) => void;
  isPinned: (
    section: string,
    subsection: string | null,
    property: string,
    profile?: string
  ) => boolean;
  getPinnedProperties: (
    section: string,
    subsection: string | null,
    profile?: string
  ) => string[];

  // Onboarding actions
  dismissOnboardingModal: (modalId: string) => void;
  isOnboardingModalDismissed: (modalId: string) => boolean;
  resetOnboardingModals: () => void;

  // Section defaults actions
  setSectionDefaultExpanded: (
    sectionKey: keyof SectionDefaults['sections'],
    expanded: boolean
  ) => void;
  setSubsectionDefaultExpanded: (
    sectionKey: 'context' | 'metadata',
    subsectionKey: string,
    expanded: boolean
  ) => void;
  setSpecialDefault: (
    key: keyof SectionDefaults['specialDefaults'],
    value: boolean
  ) => void;
  resetSectionDefaults: () => void;
}

const defaultSectionDefaults: SectionDefaults = {
  sections: {
    properties: true,
    traits: true,
    context: true,
    metadata: true,
  },
  subsections: {
    context: {
      contextPage: false,
      contextLibrary: false,
      contextOther: false,
      contextBrowser: false,
    },
    metadata: {
      metadataIdentifiers: false,
      metadataCaptureInfo: false,
      metadataIntegrations: false,
    },
  },
  specialDefaults: {
    contextPageAlwaysOpenForPageEvents: true,
    metadataIdentifiersAlwaysOpenForIdentityEvents: true,
  },
};

const defaultConfig: ExtensionConfig = {
  maxEvents: 500,
  theme: 'auto',
  preferredEventDetailView: 'structured',
  pinnedProperties: {
    default: defaultPinnedProfile,
  },
  dismissedOnboardingModals: [],
  sectionDefaults: defaultSectionDefaults,
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

/**
 * Helper to toggle an item in an array (add if not present, remove if present)
 */
function toggleItemInArray(arr: string[], item: string): void {
  const idx = arr.indexOf(item);
  if (idx === -1) {
    arr.push(item);
  } else {
    arr.splice(idx, 1);
  }
}

/**
 * Helper to update a pinned array in a profile based on section and subsection
 */
function updatePinnedArray(
  profile: PinnedPropertiesProfile,
  section: string,
  subsection: string | null,
  property: string
): void {
  if (section === 'properties') {
    toggleItemInArray(profile.properties, property);
    return;
  }

  if (section === 'traits') {
    toggleItemInArray(profile.traits, property);
    return;
  }

  if (section === 'context' && subsection) {
    const contextKey = subsection as keyof typeof profile.context;
    const arr = profile.context[contextKey];
    if (arr) {
      toggleItemInArray(arr, property);
    }
    return;
  }

  if (section === 'metadata' && subsection) {
    const metadataKey = subsection as keyof typeof profile.metadata;
    const arr = profile.metadata[metadataKey];
    if (arr) {
      toggleItemInArray(arr, property);
    }
  }
}

export const useConfigStore = create<ConfigStore>()(
  persist(
    (set, get) => ({
      ...defaultConfig,

      setMaxEvents: (max) =>
        set({ maxEvents: Math.max(1, Math.min(10000, max)) }),
      setTheme: (theme) => set({ theme }),
      setPreferredEventDetailView: (view) =>
        set({ preferredEventDetailView: view }),
      // Reset only user-visible settings, preserve pinned properties (internal state)
      reset: () =>
        set((state) => ({
          maxEvents: defaultConfig.maxEvents,
          theme: defaultConfig.theme,
          preferredEventDetailView: defaultConfig.preferredEventDetailView,
          // Preserve pinnedProperties - they're internal state not shown in Options
          pinnedProperties: state.pinnedProperties,
        })),

      togglePin: (section, subsection, property, profile = 'default') => {
        set((state) => {
          const currentProfile = state.pinnedProperties[profile] ?? {
            ...defaultPinnedProfile,
          };
          const newProfile = JSON.parse(
            JSON.stringify(currentProfile)
          ) as PinnedPropertiesProfile;

          updatePinnedArray(newProfile, section, subsection, property);

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

      // Onboarding actions
      dismissOnboardingModal: (modalId) => {
        set((state) => {
          if (!state.dismissedOnboardingModals.includes(modalId)) {
            return {
              dismissedOnboardingModals: [
                ...state.dismissedOnboardingModals,
                modalId,
              ],
            };
          }
          return state;
        });
      },
      isOnboardingModalDismissed: (modalId) => {
        const state = get();
        return state.dismissedOnboardingModals.includes(modalId);
      },
      resetOnboardingModals: () => {
        set({ dismissedOnboardingModals: [] });
      },

      // Section defaults actions
      setSectionDefaultExpanded: (sectionKey, expanded) => {
        set((state) => ({
          sectionDefaults: {
            ...state.sectionDefaults,
            sections: {
              ...state.sectionDefaults.sections,
              [sectionKey]: expanded,
            },
          },
        }));
      },

      setSubsectionDefaultExpanded: (sectionKey, subsectionKey, expanded) => {
        set((state) => ({
          sectionDefaults: {
            ...state.sectionDefaults,
            subsections: {
              ...state.sectionDefaults.subsections,
              [sectionKey]: {
                ...state.sectionDefaults.subsections[sectionKey],
                [subsectionKey]: expanded,
              },
            },
          },
        }));
      },

      setSpecialDefault: (key, value) => {
        set((state) => ({
          sectionDefaults: {
            ...state.sectionDefaults,
            specialDefaults: {
              ...state.sectionDefaults.specialDefaults,
              [key]: value,
            },
          },
        }));
      },

      resetSectionDefaults: () => {
        set({ sectionDefaults: defaultSectionDefaults });
      },
    }),
    {
      name: 'analytics-xray-config',
      storage: createJSONStorage(() => createChromeStorage()),
      version: 7,
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
          for (const [profileKey, profile] of Object.entries(
            state.pinnedProperties
          )) {
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
          // Migration from v4 to v5: allowedDomains moved to domainStore
          // No longer part of configStore, so we just skip this migration
          return state;
        }
        if (version < 6) {
          // Migration from v5 to v6: add dismissedOnboardingModals
          return {
            ...state,
            dismissedOnboardingModals: defaultConfig.dismissedOnboardingModals,
          };
        }
        if (version < 7) {
          // Migration from v6 to v7: add sectionDefaults
          return {
            ...state,
            sectionDefaults: defaultSectionDefaults,
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
export const selectPreferredEventDetailView = (state: ConfigStore) =>
  state.preferredEventDetailView;
export const selectPinnedProperties = (state: ConfigStore) =>
  state.pinnedProperties;
export const selectTogglePin = (state: ConfigStore) => state.togglePin;
export const selectIsPinned = (state: ConfigStore) => state.isPinned;
export const selectGetPinnedProperties = (state: ConfigStore) =>
  state.getPinnedProperties;
