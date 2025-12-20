/**
 * Hook for managing pinned properties in the structured view
 * 
 * Provides a convenient interface for components to check and toggle
 * pinned status for properties in different sections.
 */

import { useCallback } from 'react';
import { useConfigStore } from '@src/stores/configStore';

export type PinSection = 'properties' | 'context' | 'metadata';
export type ContextSubsection = 'page' | 'library' | 'other' | 'browser';
export type MetadataSubsection = 'identifiers' | 'captureInfo' | 'integrations';
export type PinSubsection = ContextSubsection | MetadataSubsection | null;

interface UsePinnedPropertiesOptions {
  section: PinSection;
  subsection?: PinSubsection;
  profile?: string;
}

interface UsePinnedPropertiesReturn {
  /** Check if a property is pinned */
  isPinned: (property: string) => boolean;
  /** Toggle the pin status of a property */
  togglePin: (property: string) => void;
  /** Get all pinned properties for this section/subsection */
  pinnedProperties: string[];
  /** Check if any property in this section/subsection is pinned */
  hasPinnedProperties: boolean;
}

/**
 * Helper to extract pinned properties array from profile
 */
function getPinnedArray(
  profile: import('@src/stores/configStore').PinnedPropertiesProfile,
  section: PinSection,
  subsection: PinSubsection
): string[] {
  if (section === 'properties') {
    return profile.properties;
  }
  if (section === 'context' && subsection) {
    const contextKey = subsection as ContextSubsection;
    return profile.context[contextKey] ?? [];
  }
  if (section === 'metadata' && subsection) {
    const metadataKey = subsection as MetadataSubsection;
    return profile.metadata[metadataKey] ?? [];
  }
  return [];
}

/**
 * Hook to manage pinned properties for a specific section
 */
export function usePinnedProperties({
  section,
  subsection = null,
  profile = 'default',
}: UsePinnedPropertiesOptions): UsePinnedPropertiesReturn {
  const storeTogglePin = useConfigStore((state) => state.togglePin);
  const storeIsPinned = useConfigStore((state) => state.isPinned);
  
  // Subscribe to pinned properties changes by selecting the specific profile
  const pinnedProperties = useConfigStore((state) => {
    const currentProfile = state.pinnedProperties[profile];
    if (!currentProfile) return [];
    return getPinnedArray(currentProfile, section, subsection);
  });

  const isPinned = useCallback(
    (property: string) => storeIsPinned(section, subsection, property, profile),
    [storeIsPinned, section, subsection, profile]
  );

  const togglePin = useCallback(
    (property: string) => storeTogglePin(section, subsection, property, profile),
    [storeTogglePin, section, subsection, profile]
  );

  const hasPinnedProperties = pinnedProperties.length > 0;

  return {
    isPinned,
    togglePin,
    pinnedProperties,
    hasPinnedProperties,
  };
}

/**
 * Utility to sort entries with pinned items first
 */
export function sortWithPinnedFirst<T extends { key: string }>(
  entries: T[],
  pinnedProperties: string[]
): { pinned: T[]; unpinned: T[] } {
  const pinnedSet = new Set(pinnedProperties);
  const pinned: T[] = [];
  const unpinned: T[] = [];

  for (const entry of entries) {
    if (pinnedSet.has(entry.key)) {
      pinned.push(entry);
    } else {
      unpinned.push(entry);
    }
  }

  // Sort pinned in the order they were pinned
  pinned.sort((a, b) => {
    const aIdx = pinnedProperties.indexOf(a.key);
    const bIdx = pinnedProperties.indexOf(b.key);
    return aIdx - bIdx;
  });

  return { pinned, unpinned };
}

