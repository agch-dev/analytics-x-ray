/**
 * Per-Tab Data Store
 *
 * Stores tab-specific analytics data and state.
 * Each tab has its own isolated storage namespace.
 *
 * Usage:
 *   const store = useTabStore(tabId);
 *   store.addEvent(event);
 */

import Browser from 'webextension-polyfill';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { createContextLogger } from '@src/lib/logger';
import { createTabStorage, logStorageSize } from '@src/lib/storage';
import { useConfigStore } from '@src/stores';
import type { SegmentEvent } from '@src/types';

const log = createContextLogger('storage');

/**
 * Checks if an event is a duplicate by comparing id and messageId
 * @param existingEvent - Event from the store
 * @param newEvent - Event being added
 * @returns true if the event is a duplicate
 */
function isEventDuplicate(
  existingEvent: SegmentEvent,
  newEvent: SegmentEvent
): boolean {
  return (
    existingEvent.id === newEvent.id ||
    existingEvent.messageId === newEvent.messageId
  );
}

/**
 * Converts persisted Set/array data to a Set
 * Handles both array and Set types from persisted state
 */
function normalizeToSet<T>(value: T[] | Set<T> | undefined): Set<T> {
  if (Array.isArray(value)) {
    return new Set(value);
  }
  if (value instanceof Set) {
    return value;
  }
  return new Set<T>();
}

/**
 * Checks if an event already exists in the events array
 * @param events - Array of existing events
 * @param newEvent - Event to check for duplicates
 * @returns true if the event is a duplicate
 */
function hasDuplicateEvent(
  events: SegmentEvent[],
  newEvent: SegmentEvent
): boolean {
  return events.some((e) => isEventDuplicate(e, newEvent));
}

/**
 * Gets the current maxEvents value from config store or falls back to default
 * @param fallbackMaxEvents - Fallback value if config store is unavailable
 * @returns The maxEvents value to use
 */
function getMaxEvents(fallbackMaxEvents: number): number {
  try {
    const configState = useConfigStore.getState();
    return configState.maxEvents;
  } catch (error) {
    // Config store might not be available in all contexts (e.g., during initialization),
    // use fallback value. This is expected behavior, not an error condition.
    if (error instanceof Error) {
      log.debug(
        `  ⚠️ Could not read maxEvents from config store (${error.message}), using fallback: ${fallbackMaxEvents}`
      );
    } else {
      log.debug(
        `  ⚠️ Could not read maxEvents from config store, using fallback: ${fallbackMaxEvents}`
      );
    }
    return fallbackMaxEvents;
  }
}

/**
 * Processes adding a new event to the state
 * Handles deduplication and event limit enforcement
 * @param state - Current tab state
 * @param event - Event to add
 * @param maxEvents - Maximum events fallback value
 * @returns New state with event added, or original state if duplicate
 */
function processAddEvent(
  state: TabState,
  event: SegmentEvent,
  maxEvents: number
): TabState {
  // DEDUPLICATION: This is the single source of truth for deduplication.
  // Events are deduplicated by checking both id AND messageId to catch
  // duplicates even if one field differs. The background script does NOT
  // perform deduplication - it just forwards events here.
  if (hasDuplicateEvent(state.events, event)) {
    log.debug(
      `  ⚠️ Event ${event.id} (messageId: ${event.messageId}) already exists, skipping`
    );
    return state;
  }

  // Read maxEvents dynamically from config store to allow instant updates
  const currentMaxEvents = getMaxEvents(maxEvents);

  const events = [event, ...state.events].slice(0, currentMaxEvents);
  log.debug(
    `  ✅ Added event. Total events in store: ${events.length} (max: ${currentMaxEvents})`
  );

  // Log storage size periodically (every 25 events to avoid spam)
  if (events.length % 25 === 0) {
    logStorageSize('storage');
  }

  return {
    ...state,
    events,
    lastUpdated: Date.now(),
  };
}

export interface TabState {
  // Events captured for this tab
  events: SegmentEvent[];

  // UI state
  selectedEventId: string | null; // Single selected event (for detail panel)
  expandedEventIds: Set<string>; // Multiple expanded events (for list view)
  hiddenEventNames: Set<string>; // Event names that are hidden/filtered
  searchQuery: string; // Search query for filtering events

  // Tab metadata
  lastUpdated: number;

  // Reload tracking
  reloadTimestamps: number[]; // Timestamps of page reloads for this tab
}

interface TabStore extends TabState {
  // Actions
  addEvent: (event: SegmentEvent) => void;
  clearEvents: () => void;
  setSelectedEvent: (id: string | null) => void; // Select one event (for detail view)
  toggleEventExpanded: (id: string) => void; // Expand/collapse events in list (can have multiple)
  toggleEventNameVisibility: (eventName: string) => void; // Hide/show events by name
  showAllEventNames: () => void; // Show all hidden event names
  hideAllEventNames: (eventNames: string[]) => void; // Hide all provided event names
  setSearchQuery: (query: string) => void; // Set search query
  addReloadTimestamp: (timestamp: number) => void; // Add a reload timestamp
  reset: () => void;
}

const defaultTabState: TabState = {
  events: [],
  selectedEventId: null,
  expandedEventIds: new Set(),
  hiddenEventNames: new Set(),
  searchQuery: '',
  lastUpdated: Date.now(),
  reloadTimestamps: [],
};

/**
 * Creates a tab-specific store instance
 * Each tab gets its own persisted store
 *
 * @param tabId - The tab ID to create/store data for
 * @param maxEvents - Maximum number of events to store (default: from config or 500)
 *                    Note: This is only used as a fallback. The actual limit is read
 *                    dynamically from the config store to allow instant updates.
 */
export const createTabStore = (tabId: number, maxEvents: number = 500) => {
  return create<TabStore>()(
    persist(
      (set, _get) => ({
        ...defaultTabState,

        addEvent: (event) => {
          log.debug(
            `➕ Adding event to store (tabId: ${tabId}):`,
            event.name,
            event.type,
            event.id
          );
          set((state) => processAddEvent(state, event, maxEvents));
        },

        clearEvents: async () => {
          log.info(`🗑️ Clearing all events for tab ${tabId}`);

          // Clear reload timestamps from storage
          try {
            const reloadsKey = `tab_${tabId}_reloads`;
            await Browser.storage.local.remove(reloadsKey);
            log.debug(`  ✅ Cleared reload timestamps from storage`);
          } catch (error) {
            log.error(`  ⚠️ Failed to clear reload timestamps:`, error);
          }

          set({
            events: [],
            selectedEventId: null,
            expandedEventIds: new Set<string>(),
            hiddenEventNames: new Set<string>(),
            searchQuery: '',
            reloadTimestamps: [],
            lastUpdated: Date.now(),
          });
          log.debug(`  ✅ Store cleared, events count: 0`);
        },

        setSelectedEvent: (id) => {
          set({ selectedEventId: id });
        },

        toggleEventExpanded: (id) => {
          set((state) => {
            const expanded = new Set(state.expandedEventIds);
            if (expanded.has(id)) {
              expanded.delete(id);
            } else {
              expanded.add(id);
            }
            return { expandedEventIds: expanded };
          });
        },

        toggleEventNameVisibility: (eventName) => {
          set((state) => {
            const hidden = new Set(state.hiddenEventNames);
            if (hidden.has(eventName)) {
              hidden.delete(eventName);
            } else {
              hidden.add(eventName);
            }
            return { hiddenEventNames: hidden };
          });
        },

        showAllEventNames: () => {
          set({ hiddenEventNames: new Set() });
        },

        hideAllEventNames: (eventNames) => {
          set({ hiddenEventNames: new Set(eventNames) });
        },

        setSearchQuery: (query) => {
          set({ searchQuery: query });
        },

        addReloadTimestamp: (timestamp) => {
          set((state) => ({
            reloadTimestamps: [...state.reloadTimestamps, timestamp].slice(
              -100
            ), // Keep last 100
          }));
        },

        reset: () => {
          set(defaultTabState);
        },
      }),
      {
        name: 'store', // Storage key will be: tab_${tabId}_store
        storage: createJSONStorage(() => createTabStorage(tabId)),
        version: 1,
        // Custom serialization for Set - convert to arrays for JSON storage
        partialize: (state) => ({
          ...state,
          expandedEventIds: Array.from(state.expandedEventIds),
          hiddenEventNames: Array.from(state.hiddenEventNames),
        }),
        // Custom deserialization for Set - convert arrays back to Sets during merge
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<TabState> | undefined;

          // Load reload timestamps from storage synchronously (will be loaded async after)
          // For now, use persisted reloadTimestamps if available, otherwise empty array
          const reloadTimestamps = Array.isArray(persisted?.reloadTimestamps)
            ? persisted.reloadTimestamps
            : [];

          if (!persisted) {
            return {
              ...currentState,
              reloadTimestamps,
            };
          }

          return {
            ...currentState,
            ...persisted,
            // Ensure Sets are properly reconstructed from persisted arrays
            expandedEventIds: normalizeToSet(persisted.expandedEventIds),
            hiddenEventNames: normalizeToSet(persisted.hiddenEventNames),
            // Use reload timestamps from persisted state
            reloadTimestamps,
          };
        },
      }
    )
  );
};

/**
 * Store registry to manage multiple tab stores
 * Prevents creating duplicate stores for the same tab
 */
const tabStoreRegistry = new Map<number, ReturnType<typeof createTabStore>>();

/**
 * Gets or creates a store for a specific tab
 *
 * @param tabId - The tab ID
 * @param maxEvents - Maximum events to store (default: from config or 500)
 */
export const getTabStore = (tabId: number, maxEvents: number = 500) => {
  if (!tabStoreRegistry.has(tabId)) {
    log.info(
      `🏗️ Creating new tab store for tab ${tabId} (maxEvents: ${maxEvents})`
    );
    const store = createTabStore(tabId, maxEvents);
    tabStoreRegistry.set(tabId, store);

    // Load reload timestamps from storage after store creation
    syncReloadTimestamps(tabId).catch((error) => {
      log.error(`Failed to load reload timestamps for tab ${tabId}:`, error);
    });
  } else {
    log.debug(`♻️ Reusing existing tab store for tab ${tabId}`);
  }
  const store = tabStoreRegistry.get(tabId);
  if (!store) {
    throw new Error(`Tab store not found for tab ${tabId}`);
  }
  return store;
};

/**
 * Removes a tab store from the registry
 * Call this when a tab is closed to free memory
 */
export const removeTabStore = (tabId: number) => {
  tabStoreRegistry.delete(tabId);
};

/**
 * Gets all active tab IDs from the registry
 */
export const getActiveTabIds = (): number[] => {
  return Array.from(tabStoreRegistry.keys());
};

/**
 * Sync reload timestamps from storage to the store
 * Call this after store initialization to ensure reload timestamps are loaded
 */
export const syncReloadTimestamps = async (tabId: number): Promise<void> => {
  const store = tabStoreRegistry.get(tabId);
  if (!store) {
    log.debug(
      `⚠️ No store found for tab ${tabId}, cannot sync reload timestamps`
    );
    return;
  }

  try {
    const reloadsKey = `tab_${tabId}_reloads`;
    const result = await Browser.storage.local.get(reloadsKey);
    const reloadTimestamps = (result[reloadsKey] as number[]) || [];

    // Update store with reload timestamps using setState
    store.setState({ reloadTimestamps });
    log.debug(
      `✅ Synced ${reloadTimestamps.length} reload timestamps for tab ${tabId}`
    );
  } catch (error) {
    log.error(`❌ Failed to sync reload timestamps for tab ${tabId}:`, error);
  }
};
