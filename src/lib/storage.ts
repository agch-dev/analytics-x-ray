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

/**
 * Clean up stale tabs that haven't been updated in a specified time period
 * Only cleans up tabs that are confirmed to be closed (not currently open)
 * 
 * @param maxAgeMs - Maximum age in milliseconds (default: 24 hours)
 * @returns Number of tabs cleaned up
 */
export const cleanupStaleTabs = async (maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> => {
  try {
    // Get all currently open tabs
    const allTabs = await Browser.tabs.query({});
    const activeTabIds = new Set(allTabs.map((tab) => tab.id).filter((id): id is number => id !== undefined));

    // Get all storage to find tab data
    const allStorage = await Browser.storage.local.get(null);
    const now = Date.now();
    const staleTabIds = new Set<number>();
    const keysToRemove: string[] = [];

    // Find Zustand storage keys (tab_${tabId}_store) and check their lastUpdated
    for (const key of Object.keys(allStorage)) {
      const zustandMatch = key.match(/^tab_(\d+)_store$/);
      if (zustandMatch) {
        const tabId = parseInt(zustandMatch[1], 10);
        
        // Skip if tab is still open
        if (activeTabIds.has(tabId)) {
          continue;
        }

        // Try to get lastUpdated from the stored state
        try {
          const storedValue = allStorage[key];
          if (typeof storedValue === 'string') {
            const parsed = JSON.parse(storedValue);
            const lastUpdated = parsed?.state?.lastUpdated;
            
            if (typeof lastUpdated === 'number') {
              const age = now - lastUpdated;
              if (age > maxAgeMs) {
                staleTabIds.add(tabId);
                keysToRemove.push(key);
              }
            } else {
              // If no lastUpdated, consider it stale if tab is closed
              staleTabIds.add(tabId);
              keysToRemove.push(key);
            }
          }
        } catch {
          // If parsing fails, skip this key
          continue;
        }
      }
    }

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
    for (const tabId of staleTabIds) {
      // Remove events entry
      if (eventsStorage && typeof eventsStorage === 'object') {
        const events = eventsStorage as Record<string, unknown>;
        delete events[tabId.toString()];
      }
      
      // Remove reload timestamps
      keysToRemove.push(`tab_${tabId}_reloads`);
    }

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
      console.log(`🧹 Cleaned up ${cleanedCount} stale tab(s) (older than ${Math.round(maxAgeMs / (60 * 60 * 1000))} hours)`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Failed to cleanup stale tabs:', error);
    return 0;
  }
};

/**
 * Storage size constants and utilities
 */
const STORAGE_LIMIT_BYTES = 10 * 1024 * 1024; // 10 MB Chrome extension limit

/**
 * Format bytes to human readable string
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Storage size breakdown by key category
 */
export interface StorageSizeInfo {
  totalBytes: number;
  totalFormatted: string;
  limitBytes: number;
  limitFormatted: string;
  usagePercent: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
  breakdown: {
    key: string;
    bytes: number;
    formatted: string;
    percent: number;
  }[];
}

/**
 * Get detailed storage size information
 * Provides breakdown by key and warnings if approaching limit
 */
export const getStorageSizeInfo = async (): Promise<StorageSizeInfo> => {
  try {
    const allStorage = await Browser.storage.local.get(null);
    
    const breakdown: StorageSizeInfo['breakdown'] = [];
    let totalBytes = 0;
    
    for (const [key, value] of Object.entries(allStorage)) {
      const serialized = JSON.stringify(value);
      const bytes = new Blob([serialized]).size;
      totalBytes += bytes;
      breakdown.push({
        key,
        bytes,
        formatted: formatBytes(bytes),
        percent: 0, // Will calculate after total
      });
    }
    
    // Calculate percentages
    for (const item of breakdown) {
      item.percent = totalBytes > 0 ? (item.bytes / totalBytes) * 100 : 0;
    }
    
    // Sort by size descending
    breakdown.sort((a, b) => b.bytes - a.bytes);
    
    const usagePercent = (totalBytes / STORAGE_LIMIT_BYTES) * 100;
    
    return {
      totalBytes,
      totalFormatted: formatBytes(totalBytes),
      limitBytes: STORAGE_LIMIT_BYTES,
      limitFormatted: formatBytes(STORAGE_LIMIT_BYTES),
      usagePercent,
      isNearLimit: usagePercent >= 80,
      isOverLimit: usagePercent >= 100,
      breakdown,
    };
  } catch (error) {
    console.error('Failed to get storage size:', error);
    return {
      totalBytes: 0,
      totalFormatted: '0 B',
      limitBytes: STORAGE_LIMIT_BYTES,
      limitFormatted: formatBytes(STORAGE_LIMIT_BYTES),
      usagePercent: 0,
      isNearLimit: false,
      isOverLimit: false,
      breakdown: [],
    };
  }
};

/**
 * Log storage size with detailed breakdown
 * Call this periodically or when debugging storage issues
 * Only logs in development mode to avoid cluttering production console
 */
export const logStorageSize = async (context: string = 'storage'): Promise<StorageSizeInfo> => {
  const info = await getStorageSizeInfo();
  
  // Only log in development mode
  if (!__DEV_MODE__) {
    return info;
  }
  
  const prefix = '[analytics-x-ray]';
  const contextTag = `[${context}]`;
  
  // Determine log level based on usage
  const logFn = info.isOverLimit 
    ? console.error 
    : info.isNearLimit 
      ? console.warn 
      : console.log;
  
  // Header
  logFn(
    `%c${prefix} ${contextTag}%c 📊 Storage Usage: ${info.totalFormatted} / ${info.limitFormatted} (${info.usagePercent.toFixed(1)}%)`,
    `color: #fdcb6e; font-weight: bold`,
    'color: inherit',
    info.isNearLimit ? '⚠️ NEAR LIMIT' : '',
    info.isOverLimit ? '🚨 OVER LIMIT' : ''
  );
  
  // Only show breakdown if there's significant usage or near limit
  if (info.usagePercent > 10 || info.isNearLimit) {
    console.group(`%c${prefix} ${contextTag}%c Storage breakdown:`, 
      'color: #fdcb6e; font-weight: bold', 
      'color: inherit'
    );
    
    // Show top 10 keys by size
    const topKeys = info.breakdown.slice(0, 10);
    for (const item of topKeys) {
      const bar = '█'.repeat(Math.ceil(item.percent / 5)) + '░'.repeat(20 - Math.ceil(item.percent / 5));
      console.log(
        `  ${bar} ${item.formatted.padStart(10)} (${item.percent.toFixed(1)}%) - ${item.key}`
      );
    }
    
    if (info.breakdown.length > 10) {
      const remaining = info.breakdown.slice(10);
      const remainingBytes = remaining.reduce((sum, item) => sum + item.bytes, 0);
      console.log(`  ... and ${remaining.length} more keys (${formatBytes(remainingBytes)} total)`);
    }
    
    console.groupEnd();
  }
  
  return info;
};

