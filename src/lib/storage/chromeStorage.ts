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
