/**
 * Storage Cleanup Utilities
 *
 * Handles cleanup of tab data when tabs are closed and periodic cleanup of stale tabs.
 */

import Browser from 'webextension-polyfill';

import {
  createContextLogger,
  cleanupTabStorage,
  cleanupStaleTabs,
} from '@src/lib';

import { tabEvents } from './eventStorage';

const log = createContextLogger('background');

// Type for events stored per tab
interface StoredEvents {
  [tabId: number]: unknown[];
}

/**
 * Clean up all storage for a specific tab
 * Removes events, reload timestamps, tab URLs, and Zustand persisted storage
 */
export async function cleanupTabData(tabId: number): Promise<void> {
  try {
    // Clean up in-memory events
    tabEvents.delete(tabId);

    // Clean up events from storage
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    delete events[tabId];
    await Browser.storage.local.set({ events });

    // Clean up reload timestamps
    const reloadsKey = `tab_${tabId}_reloads`;
    await Browser.storage.local.remove(reloadsKey);

    // Clean up Zustand persisted storage (tab_${tabId}_store)
    const zustandKey = `tab_${tabId}_store`;
    await Browser.storage.local.remove(zustandKey);

    log.debug(`✅ Cleaned up all data for tab ${tabId}`);
  } catch (error) {
    log.error(`❌ Failed to cleanup tab ${tabId}:`, error);
  }
}

/**
 * Set up periodic cleanup of stale tabs
 * Runs cleanup every hour and on service worker startup
 * Cleans up tabs that haven't been updated in 24+ hours (if they're closed)
 * Also runs a catch-all cleanup to remove any orphaned storage keys
 */
export function setupPeriodicCleanup(): void {
  const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  const STALE_TAB_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Run cleanup immediately on startup
  Promise.all([
    cleanupStaleTabs(STALE_TAB_AGE_MS),
    cleanupTabStorage(), // Catch-all cleanup for orphaned keys
  ])
    .then(([staleCount]) => {
      if (staleCount > 0) {
        log.info(`🧹 Startup cleanup: Removed ${staleCount} stale tab(s)`);
      }
    })
    .catch((error) => {
      log.error('❌ Startup cleanup failed:', error);
    });

  // Set up periodic cleanup
  setInterval(() => {
    Promise.all([
      cleanupStaleTabs(STALE_TAB_AGE_MS),
      cleanupTabStorage(), // Catch-all cleanup for orphaned keys
    ])
      .then(([staleCount]) => {
        if (staleCount > 0) {
          log.info(`🧹 Periodic cleanup: Removed ${staleCount} stale tab(s)`);
        }
      })
      .catch((error) => {
        log.error('❌ Periodic cleanup failed:', error);
      });
  }, CLEANUP_INTERVAL_MS);

  log.info(
    `🕐 Periodic cleanup scheduled (every ${CLEANUP_INTERVAL_MS / (60 * 1000)} minutes, cleaning tabs older than ${STALE_TAB_AGE_MS / (60 * 60 * 1000)} hours)`
  );
}
