/**
 * Chrome Storage Adapter for Zustand Persistence
 * 
 * Provides a storage adapter compatible with Zustand's persist middleware
 * that uses Chrome/Firefox storage.local API via webextension-polyfill.
 */

import Browser from 'webextension-polyfill';

export interface StorageAdapter {
  getItem: (name: string) => Promise<string | null>;
  setItem: (name: string, value: string) => Promise<void>;
  removeItem: (name: string) => Promise<void>;
}

/**
 * Creates a storage adapter for Chrome/Firefox storage.local
 * Compatible with Zustand's persist middleware
 */
export const createChromeStorage = (): StorageAdapter => ({
  getItem: async (name: string) => {
    try {
      const result = await Browser.storage.local.get(name);
      const value = result[name];
      return typeof value === 'string' ? value : null;
    } catch (error) {
      console.error(`Failed to get storage item "${name}":`, error);
      return null;
    }
  },

  setItem: async (name: string, value: string) => {
    try {
      await Browser.storage.local.set({ [name]: value });
    } catch (error) {
      console.error(`Failed to set storage item "${name}":`, error);
      throw error;
    }
  },

  removeItem: async (name: string) => {
    try {
      await Browser.storage.local.remove(name);
    } catch (error) {
      console.error(`Failed to remove storage item "${name}":`, error);
      throw error;
    }
  },
});

/**
 * Creates a tab-specific storage adapter
 * Stores data keyed by tab ID for per-tab state management
 */
export const createTabStorage = (tabId: number): StorageAdapter => {
  const storageKey = (name: string) => `tab_${tabId}_${name}`;

  return {
    getItem: async (name: string) => {
      try {
        const key = storageKey(name);
        const result = await Browser.storage.local.get(key);
        const value = result[key];
        return typeof value === 'string' ? value : null;
      } catch (error) {
        console.error(`Failed to get tab storage item "${name}":`, error);
        return null;
      }
    },

    setItem: async (name: string, value: string) => {
      try {
        const key = storageKey(name);
        await Browser.storage.local.set({ [key]: value });
      } catch (error) {
        console.error(`Failed to set tab storage item "${name}":`, error);
        throw error;
      }
    },

    removeItem: async (name: string) => {
      try {
        const key = storageKey(name);
        await Browser.storage.local.remove(key);
      } catch (error) {
        console.error(`Failed to remove tab storage item "${name}":`, error);
        throw error;
      }
    },
  };
};

/**
 * Helper to get current tab ID
 * Returns null if not available (e.g., in background script)
 */
export const getCurrentTabId = async (): Promise<number | null> => {
  try {
    const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
    return tabs[0]?.id ?? null;
  } catch (error) {
    console.error('Failed to get current tab ID:', error);
    return null;
  }
};

/**
 * Clean up old tab-specific storage entries
 * Useful for memory management - removes storage for tabs that no longer exist
 */
export const cleanupTabStorage = async (): Promise<void> => {
  try {
    const allTabs = await Browser.tabs.query({});
    const activeTabIds = new Set(allTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined));

    const allStorage = await Browser.storage.local.get(null);
    const keysToRemove: string[] = [];

    for (const key of Object.keys(allStorage)) {
      const tabMatch = key.match(/^tab_(\d+)_/);
      if (tabMatch) {
        const tabId = parseInt(tabMatch[1], 10);
        if (!activeTabIds.has(tabId)) {
          keysToRemove.push(key);
        }
      }
    }

    if (keysToRemove.length > 0) {
      await Browser.storage.local.remove(keysToRemove);
      console.log(`Cleaned up ${keysToRemove.length} stale tab storage entries`);
    }
  } catch (error) {
    console.error('Failed to cleanup tab storage:', error);
  }
};

