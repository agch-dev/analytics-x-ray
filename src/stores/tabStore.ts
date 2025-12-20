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
import { createTabStorage } from '@src/lib/storage';
import type { SegmentEvent } from '@src/types/segment';

export interface TabState {
  // Events captured for this tab
  events: SegmentEvent[];
  
  // UI state
  selectedEventId: string | null; // Single selected event (for detail panel)
  expandedEventIds: Set<string>; // Multiple expanded events (for list view)
  
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
  setTabUrl: (url: string) => void;
  reset: () => void;
}

const defaultTabState: TabState = {
  events: [],
  selectedEventId: null,
  expandedEventIds: new Set(),
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
          set((state) => {
            const events = [event, ...state.events].slice(0, maxEvents);
            return {
              events,
              lastUpdated: Date.now(),
            };
          });
        },

        clearEvents: () => {
          set({
            events: [],
            selectedEventId: null,
            expandedEventIds: new Set(),
            lastUpdated: Date.now(),
          });
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
        // Custom serialization for Set
        partialize: (state) => ({
          ...state,
          expandedEventIds: Array.from(state.expandedEventIds),
        }),
        // Custom deserialization for Set
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.expandedEventIds = new Set(state.expandedEventIds as unknown as string[]);
          }
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
    tabStoreRegistry.set(tabId, createTabStore(tabId, maxEvents));
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

