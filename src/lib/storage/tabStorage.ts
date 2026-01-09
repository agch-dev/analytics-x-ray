/**
 * Tab-Specific Storage Utilities
 * 
 * Provides storage adapters and utilities for managing per-tab storage.
 */

import Browser from 'webextension-polyfill';
import { createChromeStorage, type StorageAdapter } from './chromeStorage';

/**
 * Creates a tab-specific storage adapter
 * Stores data keyed by tab ID for per-tab state management
 * Reuses the base chromeStorage implementation with key prefixing
 */
export const createTabStorage = (tabId: number): StorageAdapter => {
  const baseStorage = createChromeStorage();
  const storageKey = (name: string) => `tab_${tabId}_${name}`;

  return {
    getItem: async (name: string) => {
      return baseStorage.getItem(storageKey(name));
    },

    setItem: async (name: string, value: string) => {
      return baseStorage.setItem(storageKey(name), value);
    },

    removeItem: async (name: string) => {
      return baseStorage.removeItem(storageKey(name));
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
