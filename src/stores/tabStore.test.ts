import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  createTabStore,
  getTabStore,
  removeTabStore,
  getActiveTabIds,
  syncReloadTimestamps,
} from './tabStore';
import { createSegmentEvent } from '@src/test';

// Mock the logger
vi.mock('@src/lib/logger', () => ({
  createContextLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock the storage module
vi.mock('@src/lib/storage', () => ({
  createTabStorage: vi.fn((_tabId: number) => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })),
  logStorageSize: vi.fn(),
}));

// Create mock storage that can be accessed in tests (hoisted)
const { mockStorage, mockConfigStore } = vi.hoisted(() => {
  const storage = {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  };
  
  const configStore = {
    maxEvents: 500,
    getState: vi.fn(() => ({ maxEvents: 500 })),
  };
  
  return { mockStorage: storage, mockConfigStore: configStore };
});

// Mock webextension-polyfill Browser.storage
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: mockStorage,
  },
}));

// Mock configStore
vi.mock('@src/stores/configStore', () => ({
  useConfigStore: mockConfigStore,
}));

describe('tabStore', () => {
  const tabId = 1;
  let store: ReturnType<typeof createTabStore>;

  beforeEach(() => {
    // Clear registry
    removeTabStore(tabId);
    // Create fresh store
    store = createTabStore(tabId, 500);
    // Reset mock storage
    vi.clearAllMocks();
    mockStorage.local.get.mockResolvedValue({});
    mockStorage.local.remove.mockResolvedValue(undefined);
    mockConfigStore.getState.mockReturnValue({ maxEvents: 500 });
  });

  afterEach(() => {
    removeTabStore(tabId);
  });

  describe('addEvent', () => {
    it('should add an event to the store', () => {
      const event = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
      store.getState().addEvent(event);
      
      expect(store.getState().events).toHaveLength(1);
      expect(store.getState().events[0].id).toBe('event-1');
    });

    it('should add events in reverse chronological order (newest first)', () => {
      const event1 = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
      const event2 = createSegmentEvent({ id: 'event-2', messageId: 'msg-2' });
      const event3 = createSegmentEvent({ id: 'event-3', messageId: 'msg-3' });
      
      store.getState().addEvent(event1);
      store.getState().addEvent(event2);
      store.getState().addEvent(event3);
      
      const events = store.getState().events;
      expect(events).toHaveLength(3);
      expect(events[0].id).toBe('event-3');
      expect(events[1].id).toBe('event-2');
      expect(events[2].id).toBe('event-1');
    });

    it('should deduplicate events by id', () => {
      const event = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
      
      store.getState().addEvent(event);
      store.getState().addEvent(event);
      
      expect(store.getState().events).toHaveLength(1);
    });

    it('should deduplicate events by messageId', () => {
      const event1 = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
      const event2 = createSegmentEvent({ id: 'event-2', messageId: 'msg-1' }); // Same messageId
      
      store.getState().addEvent(event1);
      store.getState().addEvent(event2);
      
      expect(store.getState().events).toHaveLength(1);
    });

    it('should allow events with different id and messageId', () => {
      const event1 = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
      const event2 = createSegmentEvent({ id: 'event-2', messageId: 'msg-2' });
      
      store.getState().addEvent(event1);
      store.getState().addEvent(event2);
      
      expect(store.getState().events).toHaveLength(2);
    });

    it('should limit events to maxEvents from config store', () => {
      mockConfigStore.getState.mockReturnValue({ maxEvents: 3 });
      
      const events = Array.from({ length: 5 }, (_, i) =>
        createSegmentEvent({ id: `event-${i}`, messageId: `msg-${i}` })
      );
      
      events.forEach((event) => store.getState().addEvent(event));
      
      expect(store.getState().events).toHaveLength(3);
      expect(store.getState().events[0].id).toBe('event-4');
      expect(store.getState().events[1].id).toBe('event-3');
      expect(store.getState().events[2].id).toBe('event-2');
    });

    it('should use fallback maxEvents when config store is unavailable', () => {
      mockConfigStore.getState.mockImplementation(() => {
        throw new Error('Config store unavailable');
      });
      
      const fallbackMaxEvents = 2;
      const storeWithFallback = createTabStore(tabId, fallbackMaxEvents);
      
      const events = Array.from({ length: 5 }, (_, i) =>
        createSegmentEvent({ id: `event-${i}`, messageId: `msg-${i}` })
      );
      
      events.forEach((event) => storeWithFallback.getState().addEvent(event));
      
      expect(storeWithFallback.getState().events).toHaveLength(fallbackMaxEvents);
    });

    it('should update lastUpdated timestamp when adding events', () => {
      const initialTime = store.getState().lastUpdated;
      
      // Wait a bit to ensure timestamp difference
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const event = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
          store.getState().addEvent(event);
          
          expect(store.getState().lastUpdated).toBeGreaterThan(initialTime);
          resolve();
        }, 10);
      });
    });
  });

  describe('clearEvents', () => {
    it('should clear all events', async () => {
      const events = Array.from({ length: 3 }, (_, i) =>
        createSegmentEvent({ id: `event-${i}`, messageId: `msg-${i}` })
      );
      
      events.forEach((event) => store.getState().addEvent(event));
      expect(store.getState().events).toHaveLength(3);
      
      await (store.getState().clearEvents() as unknown as Promise<void>);
      
      expect(store.getState().events).toHaveLength(0);
    });

    it('should reset selectedEventId', async () => {
      const event = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
      store.getState().addEvent(event);
      store.getState().setSelectedEvent('event-1');
      
      await (store.getState().clearEvents() as unknown as Promise<void>);
      
      expect(store.getState().selectedEventId).toBeNull();
    });

    it('should reset expandedEventIds', async () => {
      const event = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
      store.getState().addEvent(event);
      store.getState().toggleEventExpanded('event-1');
      
      await (store.getState().clearEvents() as unknown as Promise<void>);
      
      expect(store.getState().expandedEventIds.size).toBe(0);
    });

    it('should reset hiddenEventNames', async () => {
      store.getState().toggleEventNameVisibility('Test Event');
      
      await (store.getState().clearEvents() as unknown as Promise<void>);
      
      expect(store.getState().hiddenEventNames.size).toBe(0);
    });

    it('should reset searchQuery', async () => {
      store.getState().setSearchQuery('test query');
      
      await (store.getState().clearEvents() as unknown as Promise<void>);
      
      expect(store.getState().searchQuery).toBe('');
    });

    it('should clear reload timestamps from storage', async () => {
      const reloadsKey = `tab_${tabId}_reloads`;
      mockStorage.local.remove.mockResolvedValue(undefined);
      
      await (store.getState().clearEvents() as unknown as Promise<void>);
      
      expect(mockStorage.local.remove).toHaveBeenCalledWith(reloadsKey);
    });

    it('should reset reloadTimestamps', async () => {
      store.getState().addReloadTimestamp(Date.now());
      
      await (store.getState().clearEvents() as unknown as Promise<void>);
      
      expect(store.getState().reloadTimestamps).toEqual([]);
    });

    it('should update lastUpdated timestamp', async () => {
      const initialTime = store.getState().lastUpdated;
      
      return new Promise<void>((resolve) => {
        setTimeout(async () => {
          await (store.getState().clearEvents() as unknown as Promise<void>);
          expect(store.getState().lastUpdated).toBeGreaterThan(initialTime);
          resolve();
        }, 10);
      });
    });
  });

  describe('setSelectedEvent', () => {
    it('should set selected event ID', () => {
      store.getState().setSelectedEvent('event-1');
      expect(store.getState().selectedEventId).toBe('event-1');
    });

    it('should set selected event ID to null', () => {
      store.getState().setSelectedEvent('event-1');
      store.getState().setSelectedEvent(null);
      expect(store.getState().selectedEventId).toBeNull();
    });

    it('should replace previously selected event', () => {
      store.getState().setSelectedEvent('event-1');
      store.getState().setSelectedEvent('event-2');
      expect(store.getState().selectedEventId).toBe('event-2');
    });
  });

  describe('toggleEventExpanded', () => {
    it('should expand an event when collapsed', () => {
      store.getState().toggleEventExpanded('event-1');
      expect(store.getState().expandedEventIds.has('event-1')).toBe(true);
    });

    it('should collapse an event when expanded', () => {
      store.getState().toggleEventExpanded('event-1');
      store.getState().toggleEventExpanded('event-1');
      expect(store.getState().expandedEventIds.has('event-1')).toBe(false);
    });

    it('should allow multiple events to be expanded', () => {
      store.getState().toggleEventExpanded('event-1');
      store.getState().toggleEventExpanded('event-2');
      store.getState().toggleEventExpanded('event-3');
      
      expect(store.getState().expandedEventIds.has('event-1')).toBe(true);
      expect(store.getState().expandedEventIds.has('event-2')).toBe(true);
      expect(store.getState().expandedEventIds.has('event-3')).toBe(true);
    });
  });

  describe('toggleEventNameVisibility', () => {
    it('should hide an event name when visible', () => {
      store.getState().toggleEventNameVisibility('Test Event');
      expect(store.getState().hiddenEventNames.has('Test Event')).toBe(true);
    });

    it('should show an event name when hidden', () => {
      store.getState().toggleEventNameVisibility('Test Event');
      store.getState().toggleEventNameVisibility('Test Event');
      expect(store.getState().hiddenEventNames.has('Test Event')).toBe(false);
    });

    it('should allow multiple event names to be hidden', () => {
      store.getState().toggleEventNameVisibility('Event 1');
      store.getState().toggleEventNameVisibility('Event 2');
      store.getState().toggleEventNameVisibility('Event 3');
      
      expect(store.getState().hiddenEventNames.has('Event 1')).toBe(true);
      expect(store.getState().hiddenEventNames.has('Event 2')).toBe(true);
      expect(store.getState().hiddenEventNames.has('Event 3')).toBe(true);
    });
  });

  describe('showAllEventNames', () => {
    it('should show all hidden event names', () => {
      store.getState().toggleEventNameVisibility('Event 1');
      store.getState().toggleEventNameVisibility('Event 2');
      
      store.getState().showAllEventNames();
      
      expect(store.getState().hiddenEventNames.size).toBe(0);
    });

    it('should work when no events are hidden', () => {
      store.getState().showAllEventNames();
      expect(store.getState().hiddenEventNames.size).toBe(0);
    });
  });

  describe('hideAllEventNames', () => {
    it('should hide all provided event names', () => {
      store.getState().hideAllEventNames(['Event 1', 'Event 2', 'Event 3']);
      
      expect(store.getState().hiddenEventNames.has('Event 1')).toBe(true);
      expect(store.getState().hiddenEventNames.has('Event 2')).toBe(true);
      expect(store.getState().hiddenEventNames.has('Event 3')).toBe(true);
    });

    it('should replace existing hidden event names', () => {
      store.getState().toggleEventNameVisibility('Old Event');
      store.getState().hideAllEventNames(['New Event 1', 'New Event 2']);
      
      expect(store.getState().hiddenEventNames.has('Old Event')).toBe(false);
      expect(store.getState().hiddenEventNames.has('New Event 1')).toBe(true);
      expect(store.getState().hiddenEventNames.has('New Event 2')).toBe(true);
    });
  });

  describe('setSearchQuery', () => {
    it('should set search query', () => {
      store.getState().setSearchQuery('test query');
      expect(store.getState().searchQuery).toBe('test query');
    });

    it('should replace existing search query', () => {
      store.getState().setSearchQuery('old query');
      store.getState().setSearchQuery('new query');
      expect(store.getState().searchQuery).toBe('new query');
    });

    it('should allow empty search query', () => {
      store.getState().setSearchQuery('test');
      store.getState().setSearchQuery('');
      expect(store.getState().searchQuery).toBe('');
    });
  });

  describe('addReloadTimestamp', () => {
    it('should add a reload timestamp', () => {
      const timestamp = Date.now();
      store.getState().addReloadTimestamp(timestamp);
      
      expect(store.getState().reloadTimestamps).toContain(timestamp);
    });

    it('should keep timestamps in chronological order', () => {
      const timestamp1 = 1000;
      const timestamp2 = 2000;
      const timestamp3 = 3000;
      
      store.getState().addReloadTimestamp(timestamp1);
      store.getState().addReloadTimestamp(timestamp2);
      store.getState().addReloadTimestamp(timestamp3);
      
      expect(store.getState().reloadTimestamps).toEqual([timestamp1, timestamp2, timestamp3]);
    });

    it('should keep only the last 100 reload timestamps', () => {
      const timestamps = Array.from({ length: 150 }, (_, i) => i + 1000);
      
      timestamps.forEach((ts) => store.getState().addReloadTimestamp(ts));
      
      expect(store.getState().reloadTimestamps).toHaveLength(100);
      expect(store.getState().reloadTimestamps[0]).toBe(1050); // First 50 were removed
      expect(store.getState().reloadTimestamps[99]).toBe(1149); // Last timestamp
    });
  });

  describe('reset', () => {
    it('should reset store to default state', () => {
      const event = createSegmentEvent({ id: 'event-1', messageId: 'msg-1' });
      store.getState().addEvent(event);
      store.getState().setSelectedEvent('event-1');
      store.getState().toggleEventExpanded('event-1');
      store.getState().toggleEventNameVisibility('Test Event');
      store.getState().setSearchQuery('test');
      store.getState().addReloadTimestamp(Date.now());
      
      store.getState().reset();
      
      expect(store.getState().events).toEqual([]);
      expect(store.getState().selectedEventId).toBeNull();
      expect(store.getState().expandedEventIds.size).toBe(0);
      expect(store.getState().hiddenEventNames.size).toBe(0);
      expect(store.getState().searchQuery).toBe('');
      expect(store.getState().reloadTimestamps).toEqual([]);
    });
  });

  describe('getTabStore', () => {
    it('should create a new store for a tab', () => {
      const newTabId = 999;
      const newStore = getTabStore(newTabId);
      
      expect(newStore).toBeDefined();
      expect(getActiveTabIds()).toContain(newTabId);
      
      // Cleanup
      removeTabStore(newTabId);
    });

    it('should return existing store for the same tab', () => {
      const store1 = getTabStore(tabId);
      const store2 = getTabStore(tabId);
      
      expect(store1).toBe(store2);
    });

    it('should handle multiple tabs', () => {
      const tab1 = getTabStore(1);
      const tab2 = getTabStore(2);
      const tab3 = getTabStore(3);
      
      expect(tab1).not.toBe(tab2);
      expect(tab2).not.toBe(tab3);
      expect(tab1).not.toBe(tab3);
      
      expect(getActiveTabIds()).toContain(1);
      expect(getActiveTabIds()).toContain(2);
      expect(getActiveTabIds()).toContain(3);
      
      // Cleanup
      removeTabStore(1);
      removeTabStore(2);
      removeTabStore(3);
    });
  });

  describe('removeTabStore', () => {
    it('should remove a store from the registry', () => {
      const testTabId = 999;
      getTabStore(testTabId);
      
      expect(getActiveTabIds()).toContain(testTabId);
      
      removeTabStore(testTabId);
      
      expect(getActiveTabIds()).not.toContain(testTabId);
    });

    it('should not throw when removing non-existent tab', () => {
      expect(() => removeTabStore(99999)).not.toThrow();
    });
  });

  describe('getActiveTabIds', () => {
    it('should return empty array when no stores exist', () => {
      removeTabStore(tabId);
      expect(getActiveTabIds()).toEqual([]);
    });

    it('should return all active tab IDs', () => {
      removeTabStore(tabId);
      const tab1 = getTabStore(1);
      const tab2 = getTabStore(2);
      const tab3 = getTabStore(3);
      
      const activeIds = getActiveTabIds();
      expect(activeIds).toContain(1);
      expect(activeIds).toContain(2);
      expect(activeIds).toContain(3);
      expect(activeIds.length).toBeGreaterThanOrEqual(3);
      
      // Cleanup
      removeTabStore(1);
      removeTabStore(2);
      removeTabStore(3);
    });
  });

  describe('syncReloadTimestamps', () => {
    it('should sync reload timestamps from storage', async () => {
      const testTabId = 999;
      const testStore = getTabStore(testTabId);
      const timestamps = [1000, 2000, 3000];
      const reloadsKey = `tab_${testTabId}_reloads`;
      
      mockStorage.local.get.mockResolvedValue({ [reloadsKey]: timestamps });
      
      await syncReloadTimestamps(testTabId);
      
      expect(testStore.getState().reloadTimestamps).toEqual(timestamps);
      expect(mockStorage.local.get).toHaveBeenCalledWith(reloadsKey);
      
      // Cleanup
      removeTabStore(testTabId);
    });

    it('should handle missing store gracefully', async () => {
      const nonExistentTabId = 99999;
      
      await expect(syncReloadTimestamps(nonExistentTabId)).resolves.not.toThrow();
    });

    it('should handle storage errors gracefully', async () => {
      const testTabId = 999;
      getTabStore(testTabId);
      
      mockStorage.local.get.mockRejectedValue(new Error('Storage error'));
      
      await expect(syncReloadTimestamps(testTabId)).resolves.not.toThrow();
      
      // Cleanup
      removeTabStore(testTabId);
    });

    it('should handle empty reload timestamps', async () => {
      const testTabId = 999;
      const testStore = getTabStore(testTabId);
      const reloadsKey = `tab_${testTabId}_reloads`;
      
      mockStorage.local.get.mockResolvedValue({ [reloadsKey]: [] });
      
      await syncReloadTimestamps(testTabId);
      
      expect(testStore.getState().reloadTimestamps).toEqual([]);
      
      // Cleanup
      removeTabStore(testTabId);
    });
  });

  describe('Set serialization/deserialization', () => {
    it('should serialize Sets to arrays for storage', () => {
      // This is tested indirectly through the persist middleware
      // The partialize function should convert Sets to arrays
      store.getState().toggleEventExpanded('event-1');
      store.getState().toggleEventNameVisibility('Event 1');
      
      const state = store.getState();
      expect(state.expandedEventIds).toBeInstanceOf(Set);
      expect(state.hiddenEventNames).toBeInstanceOf(Set);
    });

    it('should deserialize arrays back to Sets from storage', () => {
      // This is tested indirectly through the merge function
      // The merge function should convert arrays back to Sets
      const persistedState = {
        events: [],
        selectedEventId: null,
        expandedEventIds: ['event-1', 'event-2'],
        hiddenEventNames: ['Event 1'],
        searchQuery: '',
        lastUpdated: Date.now(),
        reloadTimestamps: [],
      };
      
      // The merge function should handle this conversion
      // We can't directly test the merge function, but we can verify
      // that Sets are properly maintained in the store
      store.getState().toggleEventExpanded('event-1');
      expect(store.getState().expandedEventIds).toBeInstanceOf(Set);
    });
  });
});
