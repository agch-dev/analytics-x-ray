/**
 * Storage Module Barrel Export
 * 
 * Central export point for all storage-related utilities.
 */

// Chrome Storage Adapter
export {
  createChromeStorage,
  type StorageAdapter,
} from './chromeStorage';

// Tab Storage
export {
  createTabStorage,
  getCurrentTabId,
} from './tabStorage';

// Cleanup Utilities
export {
  cleanupTabStorage,
  cleanupStaleTabs,
} from './cleanup';

// Monitoring Utilities
export {
  getStorageSizeInfo,
  logStorageSize,
  type StorageSizeInfo,
} from './monitoring';

// Type Guards
export {
  isSegmentEventArray,
  isStoredEvents,
  isNumberArray,
  isStorageResult,
} from './typeGuards';
