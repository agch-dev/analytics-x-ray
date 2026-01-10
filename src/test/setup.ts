import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Cleanup after each test (only for React component tests)
// For pure unit tests, this is not needed
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { cleanup } = require('@testing-library/react');
  afterEach(() => {
    cleanup();
  });
} catch {
  // @testing-library/react not available or not needed for pure unit tests
}

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => {
  // Create a mock storage implementation that returns proper defaults
  const createMockStorage = () => {
    const data: Record<string, unknown> = {};
    return {
      get: vi.fn(
        async (
          keys: string | string[] | Record<string, unknown> | null
        ): Promise<Record<string, unknown>> => {
          if (keys == null) {
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
      ),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(data, items);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const keysToRemove = Array.isArray(keys) ? keys : [keys];
        keysToRemove.forEach((key) => {
          delete data[key];
        });
      }),
      clear: vi.fn(async () => {
        Object.keys(data).forEach((key) => {
          delete data[key];
        });
      }),
    };
  };

  const mockLocalStorage = createMockStorage();
  const mockSyncStorage = createMockStorage();

  return {
    default: {
      storage: {
        local: mockLocalStorage,
        sync: mockSyncStorage,
      },
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      tabs: {
        query: vi.fn(),
        get: vi.fn(),
      },
    },
  };
});

// Mock chrome APIs with proper storage mocks
const createChromeMockStorage = () => {
  const data: Record<string, unknown> = {};
  return {
    get: vi.fn(
      async (
        keys: string | string[] | Record<string, unknown> | null,
        callback?: (result: Record<string, unknown>) => void
      ): Promise<Record<string, unknown>> => {
        let result: Record<string, unknown>;
        if (keys == null) {
          result = { ...data };
        } else if (typeof keys === 'string') {
          result = { [keys]: data[keys] };
        } else if (Array.isArray(keys)) {
          result = {};
          keys.forEach((key) => {
            result[key] = data[key];
          });
        } else {
          result = {};
          Object.keys(keys).forEach((key) => {
            result[key] = data[key] !== undefined ? data[key] : keys[key];
          });
        }
        if (callback) {
          callback(result);
        }
        return Promise.resolve(result);
      }
    ),
    set: vi.fn(
      async (
        items: Record<string, unknown>,
        callback?: () => void
      ): Promise<void> => {
        Object.assign(data, items);
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }
    ),
    remove: vi.fn(
      async (keys: string | string[], callback?: () => void): Promise<void> => {
        const keysToRemove = Array.isArray(keys) ? keys : [keys];
        keysToRemove.forEach((key) => {
          delete data[key];
        });
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }
    ),
    clear: vi.fn(async (callback?: () => void): Promise<void> => {
      Object.keys(data).forEach((key) => {
        delete data[key];
      });
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }),
  };
};

global.chrome = {
  storage: {
    local: createChromeMockStorage(),
    sync: createChromeMockStorage(),
  },
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
  },
} as unknown as typeof chrome;

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: validateDOMNesting') ||
        args[0].includes('Failed to get storage item'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
