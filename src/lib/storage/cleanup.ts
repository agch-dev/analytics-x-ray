/**
 * Storage Cleanup Utilities
 *
 * Provides functions for cleaning up stale or unused storage entries.
 */

import Browser from 'webextension-polyfill';

/**
 * Storage key patterns for tab-specific storage
 */
const TAB_KEY_PREFIX = 'tab_';
const TAB_KEY_PATTERN = /^tab_(\d+)_/;
const TAB_STORE_KEY_PATTERN = /^tab_(\d+)_store$/;

/**
 * Get all currently active tab IDs
 */
const getActiveTabIds = async (): Promise<Set<number>> => {
  const allTabs = await Browser.tabs.query({});
  return new Set(
    allTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined)
  );
};

/**
 * Extract tab ID from a storage key
 * Returns null if the key doesn't match the tab pattern
 */
const extractTabIdFromKey = (key: string): number | null => {
  const match = TAB_KEY_PATTERN.exec(key);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Clean up old tab-specific storage entries
 * Useful for memory management - removes storage for tabs that no longer exist
 * This is a catch-all cleanup that removes ALL storage keys for closed tabs,
 * regardless of age. Used as a safety net to catch orphaned keys.
 */
export const cleanupTabStorage = async (): Promise<void> => {
  try {
    const activeTabIds = await getActiveTabIds();
    const allStorage = await Browser.storage.local.get(null);
    const keysToRemove: string[] = [];

    for (const key of Object.keys(allStorage)) {
      const tabId = extractTabIdFromKey(key);
      if (tabId !== null && !activeTabIds.has(tabId)) {
        keysToRemove.push(key);
      }
    }

    if (keysToRemove.length > 0) {
      await Browser.storage.local.remove(keysToRemove);
      console.log(
        `Cleaned up ${keysToRemove.length} stale tab storage entries`
      );
    }
  } catch (error) {
    console.error('Failed to cleanup tab storage:', error);
  }
};

/**
 * Check if a tab store entry is stale based on its lastUpdated timestamp
 */
const isTabStoreStale = (
  storedValue: unknown,
  now: number,
  maxAgeMs: number
): boolean => {
  if (typeof storedValue !== 'string') {
    return false;
  }

  try {
    const parsed = JSON.parse(storedValue);
    const lastUpdated = parsed?.state?.lastUpdated;

    if (typeof lastUpdated === 'number') {
      const age = now - lastUpdated;
      return age > maxAgeMs;
    }

    // If no lastUpdated, consider it stale
    return true;
  } catch {
    // If parsing fails, not stale (will be skipped)
    return false;
  }
};

/**
 * Process tab store keys to identify stale tabs
 */
const processTabStoreKeys = (
  allStorage: Record<string, unknown>,
  activeTabIds: Set<number>,
  now: number,
  maxAgeMs: number
): { staleTabIds: Set<number>; keysToRemove: string[] } => {
  const staleTabIds = new Set<number>();
  const keysToRemove: string[] = [];

  for (const key of Object.keys(allStorage)) {
    const match = TAB_STORE_KEY_PATTERN.exec(key);
    if (!match) continue;

    const tabId = parseInt(match[1], 10);

    // Skip if tab is still open
    if (activeTabIds.has(tabId)) {
      continue;
    }

    const storedValue = allStorage[key];
    if (isTabStoreStale(storedValue, now, maxAgeMs)) {
      staleTabIds.add(tabId);
      keysToRemove.push(key);
    }
  }

  return { staleTabIds, keysToRemove };
};

/**
 * Clean up storage keys for stale tabs
 */
const cleanupStaleTabKeys = (
  staleTabIds: Set<number>,
  eventsStorage: unknown,
  keysToRemove: string[]
): void => {
  for (const tabId of staleTabIds) {
    // Remove events entry
    if (eventsStorage && typeof eventsStorage === 'object') {
      const events = eventsStorage as Record<string, unknown>;
      delete events[tabId.toString()];
    }

    // Remove reload timestamps
    keysToRemove.push(`${TAB_KEY_PREFIX}${tabId}_reloads`);
  }
};

/**
 * Clean up stale tabs that haven't been updated in a specified time period
 * Only cleans up tabs that are confirmed to be closed (not currently open)
 *
 * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours)
 * @returns Number of tabs cleaned up
 */
export const cleanupStaleTabs = async (
  maxAgeMs: number = 24 * 60 * 60 * 1000
): Promise<number> => {
  try {
    const activeTabIds = await getActiveTabIds();
    const allStorage = await Browser.storage.local.get(null);
    const now = Date.now();

    // Find Zustand storage keys (tab_${tabId}_store) and check their lastUpdated
    const { staleTabIds, keysToRemove } = processTabStoreKeys(
      allStorage,
      activeTabIds,
      now,
      maxAgeMs
    );

    // Also check the 'events' storage object for tabs that might be stale
    // This catches edge cases where Zustand storage might be missing but events exist
    const eventsStorage = allStorage['events'];
    if (eventsStorage && typeof eventsStorage === 'object') {
      const events = eventsStorage as Record<string, unknown>;
      for (const tabIdStr of Object.keys(events)) {
        const tabId = parseInt(tabIdStr, 10);
        if (isNaN(tabId)) continue;

        // Skip if tab is still open or already marked as stale
        if (activeTabIds.has(tabId) || staleTabIds.has(tabId)) {
          continue;
        }

        // If tab has events but no Zustand storage (edge case), check if we should clean it
        // For now, we only clean tabs that have Zustand storage with valid lastUpdated
        // Tabs without Zustand storage will be cleaned by the general cleanupTabStorage function
      }
    }

    // Clean up all storage keys for stale tabs
    cleanupStaleTabKeys(staleTabIds, eventsStorage, keysToRemove);

    // Remove all identified keys
    if (keysToRemove.length > 0) {
      await Browser.storage.local.remove(keysToRemove);
    }

    // Update events storage if we modified it
    if (eventsStorage && typeof eventsStorage === 'object') {
      const events = eventsStorage as Record<string, unknown>;
      await Browser.storage.local.set({ events });
    }

    const cleanedCount = staleTabIds.size;
    if (cleanedCount > 0) {
      console.log(
        `🧹 Cleaned up ${cleanedCount} stale tab(s) (older than ${Math.round(maxAgeMs / (60 * 60 * 1000))} hours)`
      );
    }

    return cleanedCount;
  } catch (error) {
    console.error('Failed to cleanup stale tabs:', error);
    return 0;
  }
};
