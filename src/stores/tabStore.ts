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

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createTabStorage, logStorageSize } from '@src/lib/storage';
import type { SegmentEvent } from '@src/types/segment';
import { createContextLogger } from '@src/lib/logger';

const log = createContextLogger('storage');

export interface TabState {
  // Events captured for this tab
  events: SegmentEvent[];
  
  // UI state
  selectedEventId: string | null; // Single selected event (for detail panel)
  expandedEventIds: Set<string>; // Multiple expanded events (for list view)
  hiddenEventNames: Set<string>; // Event names that are hidden/filtered
  searchQuery: string; // Search query for filtering events
  
  // Tab metadata
  tabUrl: string | null;
  lastUpdated: number;
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
  setTabUrl: (url: string) => void;
  reset: () => void;
}

const defaultTabState: TabState = {
  events: [],
  selectedEventId: null,
  expandedEventIds: new Set(),
  hiddenEventNames: new Set(),
  searchQuery: '',
  tabUrl: null,
  lastUpdated: Date.now(),
};

/**
 * Creates a tab-specific store instance
 * Each tab gets its own persisted store
 * 
 * @param tabId - The tab ID to create/store data for
 * @param maxEvents - Maximum number of events to store (default: from config or 500)
 */
export const createTabStore = (tabId: number, maxEvents: number = 500) => {
  return create<TabStore>()(
    persist(
      (set, get) => ({
        ...defaultTabState,

        addEvent: (event) => {
          log.debug(`➕ Adding event to store (tabId: ${tabId}):`, event.name, event.type, event.id);
          set((state) => {
            // DEDUPLICATION: This is the single source of truth for deduplication.
            // Events are deduplicated by checking both id AND messageId to catch
            // duplicates even if one field differs. The background script does NOT
            // perform deduplication - it just forwards events here.
            const isDuplicate = state.events.some(
              (e) => e.id === event.id || e.messageId === event.messageId
            );
            if (isDuplicate) {
              log.debug(`  ⚠️ Event ${event.id} (messageId: ${event.messageId}) already exists, skipping`);
              return state;
            }
            
            const events = [event, ...state.events].slice(0, maxEvents);
            log.debug(`  ✅ Added event. Total events in store: ${events.length}`);
            
            // Log storage size periodically (every 25 events to avoid spam)
            if (events.length % 25 === 0) {
              logStorageSize('storage');
            }
            
            return {
              events,
              lastUpdated: Date.now(),
            };
          });
        },

        clearEvents: () => {
          log.info(`🗑️ Clearing all events for tab ${tabId}`);
          set({
            events: [],
            selectedEventId: null,
            expandedEventIds: new Set<string>(),
            hiddenEventNames: new Set<string>(),
            searchQuery: '',
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

        setTabUrl: (url) => {
          set({ tabUrl: url });
        },

        reset: () => {
          set(defaultTabState);
        },
      }),
      {
        name: `tab-${tabId}`,
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
          if (!persisted) {
            return currentState;
          }
          return {
            ...currentState,
            ...persisted,
            // Ensure Sets are properly reconstructed from persisted arrays
            expandedEventIds: new Set(
              Array.isArray(persisted.expandedEventIds) 
                ? persisted.expandedEventIds 
                : persisted.expandedEventIds instanceof Set 
                  ? persisted.expandedEventIds 
                  : []
            ),
            hiddenEventNames: new Set(
              Array.isArray(persisted.hiddenEventNames) 
                ? persisted.hiddenEventNames 
                : persisted.hiddenEventNames instanceof Set 
                  ? persisted.hiddenEventNames 
                  : []
            ),
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
    log.info(`🏗️ Creating new tab store for tab ${tabId} (maxEvents: ${maxEvents})`);
    tabStoreRegistry.set(tabId, createTabStore(tabId, maxEvents));
  } else {
    log.debug(`♻️ Reusing existing tab store for tab ${tabId}`);
  }
  return tabStoreRegistry.get(tabId)!;
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

