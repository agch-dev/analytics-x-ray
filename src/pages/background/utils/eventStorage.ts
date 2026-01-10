/**
 * Event Storage Utilities
 *
 * Handles storing and retrieving events from both in-memory cache and persistent storage.
 */

import Browser from 'webextension-polyfill';

import {
  createContextLogger,
  type SegmentEvent,
  logStorageSize,
} from '@src/lib';
import { useConfigStore } from '@src/stores';

const log = createContextLogger('background');

// Type for events stored per tab
export interface StoredEvents {
  [tabId: number]: SegmentEvent[];
}

// In-memory event storage (per tab)
// Note: Service workers can be terminated, so we also persist to storage
export const tabEvents = new Map<number, SegmentEvent[]>();

/**
 * Get the current maxEvents limit from config store
 * Falls back to 500 if config store is not available
 */
function getMaxEvents(): number {
  try {
    return useConfigStore.getState().maxEvents;
  } catch (error) {
    log.debug(
      '⚠️ Could not read maxEvents from config store, using default: 500',
      error
    );
    return 500;
  }
}

/**
 * Store events in memory and persist to storage
 *
 * Note: This function does NOT perform deduplication. Deduplication is handled
 * by the tabStore when events are added via addEvent(). The background script
 * simply forwards events to storage, and the store ensures no duplicates
 * (by checking both id and messageId) before adding them to the state.
 */
export async function storeEvents(
  tabId: number,
  newEvents: SegmentEvent[]
): Promise<void> {
  // Update in-memory store
  // Note: Deduplication happens in tabStore.addEvent(), not here
  const existing = tabEvents.get(tabId) || [];
  const maxEvents = getMaxEvents();
  const updated = [...newEvents, ...existing].slice(0, maxEvents);
  tabEvents.set(tabId, updated);

  log.debug(
    `💾 Stored ${newEvents.length} event(s) in memory (total: ${updated.length} for tab ${tabId})`
  );

  // Persist to storage for service worker restarts
  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    events[tabId] = updated;
    await Browser.storage.local.set({ events });
    log.debug(
      `💾 Persisted ${updated.length} event(s) to storage.local['events'][${tabId}]`
    );

    // Log storage size periodically (every 10 events to avoid spam)
    if (updated.length % 10 === 0) {
      logStorageSize('background');
    }
  } catch (error) {
    log.error('❌ Failed to persist events:', error);
    // Check if storage quota exceeded
    if (error instanceof Error && error.message.includes('QUOTA')) {
      log.error('🚨 Storage quota exceeded! Logging current usage...');
      logStorageSize('background');
    }
  }
}

/**
 * Get events for a specific tab
 */
export async function getEventsForTab(tabId: number): Promise<SegmentEvent[]> {
  // Try memory first
  if (tabEvents.has(tabId)) {
    return tabEvents.get(tabId) || [];
  }

  // Fall back to storage
  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    return events[tabId] || [];
  } catch {
    return [];
  }
}

/**
 * Clear events for a specific tab
 */
export async function clearEventsForTab(tabId: number): Promise<void> {
  tabEvents.delete(tabId);

  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    delete events[tabId];
    await Browser.storage.local.set({ events });

    // Also clear reload timestamps for this tab
    const reloadsKey = `tab_${tabId}_reloads`;
    await Browser.storage.local.remove(reloadsKey);
    log.debug(`🗑️ Cleared reload timestamps for tab ${tabId}`);
  } catch (error) {
    console.error('[analytics-x-ray] Failed to clear events:', error);
  }
}

/**
 * Restore events from storage on service worker startup
 */
export async function restoreEventsFromStorage(): Promise<void> {
  try {
    log.info('🔄 Restoring events from storage...');
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};

    let totalEvents = 0;
    for (const [tabIdStr, tabEventList] of Object.entries(events)) {
      const tabId = parseInt(tabIdStr, 10);
      if (!isNaN(tabId) && Array.isArray(tabEventList)) {
        tabEvents.set(tabId, tabEventList as SegmentEvent[]);
        totalEvents += tabEventList.length;
        log.debug(
          `  ✅ Restored ${tabEventList.length} events for tab ${tabId}`
        );
      }
    }
    log.info(
      `✅ Restored ${totalEvents} total events across ${Object.keys(events).length} tab(s)`
    );
  } catch (error) {
    log.error('❌ Failed to restore events:', error);
  }
}
