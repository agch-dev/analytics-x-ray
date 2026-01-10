/**
 * Test Utilities
 *
 * Shared utilities for writing tests across the codebase.
 * These helpers reduce boilerplate and make tests more maintainable.
 */

import { vi, type MockedFunction } from 'vitest';

import type {
  SegmentEvent,
  SegmentBatchEvent,
  SegmentBatchPayload,
  SegmentEventType,
  SegmentProvider,
  SegmentContext,
} from '@src/types';

// ============================================================================
// Segment Event Factories
// ============================================================================

/**
 * Create a test SegmentBatchEvent with sensible defaults
 */
export function createBatchEvent(
  overrides: Partial<SegmentBatchEvent> = {}
): SegmentBatchEvent {
  const defaults: SegmentBatchEvent = {
    type: 'track',
    event: 'Test Event',
    messageId: `test-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    properties: {},
    context: {
      library: {
        name: 'analytics.js',
        version: '4.1.0',
      },
    },
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a test SegmentBatchPayload with sensible defaults
 */
export function createBatchPayload(
  events: SegmentBatchEvent[] = [createBatchEvent()],
  overrides: Partial<SegmentBatchPayload> = {}
): SegmentBatchPayload {
  const defaults: SegmentBatchPayload = {
    batch: events,
    sentAt: new Date().toISOString(),
  };

  return { ...defaults, ...overrides };
}

/**
 * Create a test SegmentEvent (normalized) with sensible defaults
 */
export function createSegmentEvent(
  overrides: Partial<SegmentEvent> = {}
): SegmentEvent {
  const messageId =
    overrides.messageId ||
    `test-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const batchEvent = createBatchEvent({
    messageId,
    ...overrides.rawPayload,
  });

  const defaults: SegmentEvent = {
    id: messageId,
    messageId,
    type: 'track',
    name: 'Test Event',
    properties: {},
    timestamp: new Date().toISOString(),
    sentAt: new Date().toISOString(),
    context: {
      library: {
        name: 'analytics.js',
        version: '4.1.0',
      },
    },
    tabId: 1,
    capturedAt: Date.now(),
    url: 'https://example.com',
    provider: 'segment',
    rawPayload: batchEvent,
  };

  return { ...defaults, ...overrides };
}

/**
 * Create multiple test events of different types
 */
export function createEventsByType(
  types: SegmentEventType[] = ['track', 'page', 'identify']
): SegmentEvent[] {
  return types.map((type, index) => {
    const base = createSegmentEvent({ type });

    switch (type) {
      case 'track':
        return {
          ...base,
          name: `Track Event ${index}`,
          rawPayload: { ...base.rawPayload, event: `Track Event ${index}` },
        };
      case 'page':
        return {
          ...base,
          name: `Page: Page ${index}`,
          rawPayload: { ...base.rawPayload, name: `Page ${index}` },
        };
      case 'screen':
        return {
          ...base,
          name: `Screen: Screen ${index}`,
          rawPayload: { ...base.rawPayload, name: `Screen ${index}` },
        };
      case 'identify':
        return {
          ...base,
          name: `Identify: user-${index}`,
          rawPayload: { ...base.rawPayload, userId: `user-${index}` },
        };
      case 'group':
        return {
          ...base,
          name: `Group: group-${index}`,
          rawPayload: { ...base.rawPayload, groupId: `group-${index}` },
        };
      case 'alias':
        return {
          ...base,
          name: 'Alias',
        };
      default:
        return base;
    }
  });
}

// ============================================================================
// Storage Mocking Helpers
// ============================================================================

export interface MockStorage {
  data: Record<string, unknown>;
  get: MockedFunction<
    (
      keys: string | string[] | Record<string, unknown> | null
    ) => Promise<Record<string, unknown>>
  >;
  set: MockedFunction<(items: Record<string, unknown>) => Promise<void>>;
  remove: MockedFunction<(keys: string | string[]) => Promise<void>>;
  clear: MockedFunction<() => Promise<void>>;
  // Chrome StorageArea required properties
  QUOTA_BYTES: number;
  getBytesInUse: MockedFunction<
    (keys?: string | string[] | null) => Promise<number>
  >;
  setAccessLevel: MockedFunction<
    (accessOptions: { accessLevel: string }) => Promise<void>
  >;
  onChanged: {
    addListener: MockedFunction<(callback: () => void) => void>;
    removeListener: MockedFunction<(callback: () => void) => void>;
    hasListener: MockedFunction<(callback: () => void) => boolean>;
  };
  getKeys: MockedFunction<() => Promise<string[]>>;
}

/**
 * Create a mock storage object with realistic behavior
 */
export function createMockStorage(
  initialData: Record<string, unknown> = {}
): MockStorage {
  const data: Record<string, unknown> = { ...initialData };

  const get = vi.fn(
    async (keys: string | string[] | Record<string, unknown> | null) => {
      if (keys === null || keys === undefined) {
        return { ...data };
      }

      if (typeof keys === 'string') {
        return { [keys]: data[keys] };
      }

      if (Array.isArray(keys)) {
        const result: Record<string, unknown> = {};
        keys.forEach((key) => {
          result[key] = data[key];
        });
        return result;
      }

      // Object with default values
      const result: Record<string, unknown> = {};
      Object.keys(keys).forEach((key) => {
        result[key] = data[key] !== undefined ? data[key] : keys[key];
      });
      return result;
    }
  );

  const set = vi.fn(async (items: Record<string, unknown>) => {
    Object.assign(data, items);
  });

  const remove = vi.fn(async (keys: string | string[]) => {
    const keysToRemove = Array.isArray(keys) ? keys : [keys];
    keysToRemove.forEach((key) => {
      delete data[key];
    });
  });

  const clear = vi.fn(async () => {
    Object.keys(data).forEach((key) => {
      delete data[key];
    });
  });

  const getBytesInUse = vi.fn(
    async (keys?: string | string[] | null): Promise<number> => {
      // Simple mock: return approximate size
      if (keys === null || keys === undefined) {
        return JSON.stringify(data).length;
      }
      const keysToCheck = Array.isArray(keys) ? keys : [keys];
      let size = 0;
      keysToCheck.forEach((key) => {
        if (data[key] !== undefined) {
          size += JSON.stringify(data[key]).length;
        }
      });
      return size;
    }
  );

  const setAccessLevel = vi.fn(
    async (_accessOptions: { accessLevel: string }) => {
      // Mock implementation
    }
  );

  const onChanged = {
    addListener: vi.fn((_callback: () => void) => {
      // Mock implementation
    }),
    removeListener: vi.fn((_callback: () => void) => {
      // Mock implementation
    }),
    hasListener: vi.fn((_callback: () => void) => false),
  };

  const getKeys = vi.fn(async (): Promise<string[]> => {
    return Object.keys(data);
  });

  return {
    data,
    get,
    set,
    remove,
    clear,
    QUOTA_BYTES: 10 * 1024 * 1024, // 10MB default
    getBytesInUse,
    setAccessLevel,
    onChanged,
    getKeys,
  };
}

/**
 * Setup mock chrome.storage.local with realistic behavior
 */
export function setupMockChromeStorage(
  initialData: Record<string, unknown> = {}
): MockStorage {
  const mockStorage = createMockStorage(initialData);
  const mockSyncStorage = createMockStorage();

  global.chrome = {
    ...global.chrome,
    storage: {
      ...global.chrome?.storage,
      local: mockStorage as unknown as chrome.storage.LocalStorageArea,
      sync: mockSyncStorage as unknown as chrome.storage.SyncStorageArea,
    },
  } as typeof chrome;

  return mockStorage;
}

/**
 * Setup mock webextension-polyfill storage
 */
export function setupMockBrowserStorage(
  initialData: Record<string, unknown> = {}
): MockStorage {
  const mockStorage = createMockStorage(initialData);

  // This will be used by vi.mock in individual test files if needed
  return mockStorage;
}

// ============================================================================
// Store Testing Helpers
// ============================================================================

/**
 * Reset a Zustand store to its initial state
 * Useful for cleaning up between tests
 */
export function resetStore<T>(store: {
  setState: (state: Partial<T>) => void;
  getState: () => T;
}): void {
  const initialState = store.getState();
  store.setState(initialState as Partial<T>);
}

// ============================================================================
// Logger Mocking
// ============================================================================

/**
 * Create a mock logger that can be used across tests
 */
export function createMockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    group: vi.fn(),
    groupEnd: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
    table: vi.fn(),
  };
}

/**
 * Mock the logger module for tests
 */
export function mockLogger() {
  return vi.mock('@src/lib/logger', () => ({
    createContextLogger: () => createMockLogger(),
    logger: createMockLogger(),
  }));
}

// ============================================================================
// Time/Date Helpers
// ============================================================================

/**
 * Create a fixed date for testing time-dependent code
 */
export function createFixedDate(
  isoString: string = '2024-01-01T00:00:00Z'
): Date {
  return new Date(isoString);
}

/**
 * Mock Date.now() to return a fixed timestamp
 */
export function mockDateNow(timestamp: number = 1704067200000): () => void {
  const originalNow = Date.now;
  Date.now = vi.fn(() => timestamp);

  return () => {
    Date.now = originalNow;
  };
}

/**
 * Mock new Date() to return a fixed date
 */
export function mockNewDate(
  isoString: string = '2024-01-01T00:00:00Z'
): () => void {
  const fixedDate = new Date(isoString);
  const originalDate = global.Date;

  // Mocking Date constructor
  global.Date = vi.fn(() => fixedDate) as unknown as DateConstructor;
  global.Date.now = vi.fn(() => fixedDate.getTime());
  global.Date.parse = originalDate.parse;
  global.Date.UTC = originalDate.UTC;

  return () => {
    global.Date = originalDate;
  };
}

// ============================================================================
// Tab ID Helpers
// ============================================================================

/**
 * Generate a test tab ID
 */
export function createTestTabId(seed: number = 1): number {
  return seed;
}

/**
 * Create multiple test tab IDs
 */
export function createTestTabIds(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1);
}

// ============================================================================
// ArrayBuffer Helpers (for testing decodeRequestBody)
// ============================================================================

/**
 * Create an ArrayBuffer from a string for testing
 */
export function createArrayBufferFromString(text: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(text);
  // Create a new ArrayBuffer to ensure it passes instanceof check
  const buffer = new ArrayBuffer(encoded.length);
  new Uint8Array(buffer).set(encoded);
  return buffer;
}

// ============================================================================
// Async Helpers
// ============================================================================

/**
 * Wait for a promise to resolve (useful for testing async operations)
 */
export async function waitFor(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true (with timeout)
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 1000,
  interval: number = 10
): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
    await waitFor(interval);
  }
}

// ============================================================================
// Provider Helpers
// ============================================================================

/**
 * Create test URLs for different providers
 */
export function createProviderUrl(provider: SegmentProvider): string {
  switch (provider) {
    case 'segment':
      return 'https://api.segment.io/v1/batch';
    case 'rudderstack':
      return 'https://api.rudderstack.com/v1/batch';
    case 'dreamdata':
      return 'https://tracking.dreamdata.cloud/v1/batch';
    default:
      return 'https://example.com/api';
  }
}

// ============================================================================
// Context Helpers
// ============================================================================

/**
 * Create a test SegmentContext with sensible defaults
 */
export function createTestContext(
  overrides: Partial<SegmentContext> = {}
): SegmentContext {
  const defaults: SegmentContext = {
    library: {
      name: 'analytics.js',
      version: '4.1.0',
    },
    page: {
      path: '/test',
      referrer: 'https://example.com',
      search: '',
      title: 'Test Page',
      url: 'https://example.com/test',
    },
    userAgent: 'Mozilla/5.0 (Test)',
    locale: 'en-US',
    timezone: 'America/New_York',
  };

  return { ...defaults, ...overrides };
}
