/**
 * Storage Module Barrel Export
 *
 * Central export point for all storage-related utilities.
 */

// Chrome Storage Adapter
export { createChromeStorage } from './chromeStorage';

// Tab Storage
export { createTabStorage } from './tabStorage';

// Cleanup Utilities
export { cleanupTabStorage, cleanupStaleTabs } from './cleanup';

// Monitoring Utilities
export { logStorageSize } from './monitoring';
