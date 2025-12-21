---
name: Testing Infrastructure
overview: Set up Vitest testing framework and add initial unit tests for critical parsing and search logic.
todos:
  - id: install-vitest
    content: Install vitest, @vitest/coverage-v8, and jsdom
    status: pending
  - id: create-vitest-config
    content: Create vitest.config.ts with path aliases and globals
    status: pending
  - id: add-test-scripts
    content: Add test, test:run, test:coverage scripts to package.json
    status: pending
  - id: test-segment-parsing
    content: Create src/lib/segment.test.ts with parsing tests
    status: pending
  - id: test-search-logic
    content: Create src/lib/search.test.ts with search/highlight tests
    status: pending
  - id: test-config-store
    content: Create src/stores/configStore.test.ts with store tests
    status: pending
---

# Testing Infrastructure

## Problem

The project has no test infrastructure. Critical logic in event parsing, search, and stores has zero test coverage, making refactoring risky.---

## 1. Set Up Vitest

### Why Vitest?

- Native Vite integration (already using Vite)
- Fast, ESM-first
- Jest-compatible API
- Built-in TypeScript support

### Installation

```bash
yarn add -D vitest @vitest/coverage-v8 jsdom
```



### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**', 'src/stores/**', 'src/hooks/**'],
    },
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@pages': path.resolve(__dirname, './src/pages'),
    },
  },
  define: {
    __DEV_MODE__: true,
  },
});
```



### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 2. Priority Test Files

### High Priority: Event Parsing

[`src/lib/segment.ts`](src/lib/segment.ts) - Core parsing logic:

```typescript
// src/lib/segment.test.ts
import { describe, it, expect } from 'vitest';
import {
  detectProvider,
  decodeRequestBody,
  parseSegmentPayload,
  isValidBatchEvent,
  getEventName,
  normalizeEvent,
  processBatchPayload,
} from './segment';

describe('detectProvider', () => {
  it('detects Segment from segment.io URL', () => {
    expect(detectProvider('https://api.segment.io/v1/batch')).toBe('segment');
  });

  it('detects Rudderstack', () => {
    expect(detectProvider('https://hosted.rudderlabs.com/v1/batch')).toBe('rudderstack');
  });

  it('returns unknown for unrecognized URLs', () => {
    expect(detectProvider('https://example.com/track')).toBe('unknown');
  });
});

describe('isValidBatchEvent', () => {
  it('validates track event', () => {
    expect(isValidBatchEvent({
      type: 'track',
      event: 'Button Clicked',
      messageId: 'msg-123',
    })).toBe(true);
  });

  it('rejects event with invalid type', () => {
    expect(isValidBatchEvent({
      type: 'invalid',
      messageId: 'msg-123',
    })).toBe(false);
  });
});

describe('getEventName', () => {
  it('returns event name for track events', () => {
    expect(getEventName({ type: 'track', event: 'Purchase' })).toBe('Purchase');
  });

  it('formats page events with name', () => {
    expect(getEventName({ type: 'page', name: 'Home' })).toBe('Page: Home');
  });

  it('handles identify events with userId', () => {
    expect(getEventName({ type: 'identify', userId: 'user-123' })).toBe('Identify: user-123');
  });
});

describe('parseSegmentPayload', () => {
  it('parses valid batch payload', () => {
    const json = JSON.stringify({
      batch: [{ type: 'track', event: 'Test', messageId: '123' }],
      sentAt: '2024-01-01T00:00:00Z',
    });
    const result = parseSegmentPayload(json);
    expect(result).not.toBeNull();
    expect(result?.batch).toHaveLength(1);
  });

  it('handles single event format', () => {
    const json = JSON.stringify({
      type: 'track',
      event: 'Test',
      messageId: '123',
    });
    const result = parseSegmentPayload(json);
    expect(result?.batch).toHaveLength(1);
  });
});
```



### High Priority: Search Logic

[`src/lib/search.ts`](src/lib/search.ts) - Search and highlighting:

```typescript
// src/lib/search.test.ts
import { describe, it, expect } from 'vitest';
import { parseSearchQuery, eventMatchesSearch, highlightText } from './search';

describe('parseSearchQuery', () => {
  it('returns null for empty query', () => {
    expect(parseSearchQuery('')).toBeNull();
    expect(parseSearchQuery('   ')).toBeNull();
  });

  it('trims whitespace', () => {
    expect(parseSearchQuery('  test  ')?.query).toBe('test');
  });
});

describe('eventMatchesSearch', () => {
  const mockEvent = {
    name: 'Button Clicked',
    type: 'track',
    properties: { buttonId: 'submit-btn', page: 'checkout' },
    // ... other required fields
  };

  it('matches event name', () => {
    expect(eventMatchesSearch(mockEvent, { query: 'Button' })).toBe(true);
  });

  it('matches nested property value', () => {
    expect(eventMatchesSearch(mockEvent, { query: 'checkout' })).toBe(true);
  });

  it('matches property key', () => {
    expect(eventMatchesSearch(mockEvent, { query: 'buttonId' })).toBe(true);
  });

  it('is case insensitive', () => {
    expect(eventMatchesSearch(mockEvent, { query: 'BUTTON' })).toBe(true);
  });
});

describe('highlightText', () => {
  it('returns single non-highlighted part for no match', () => {
    const result = highlightText('hello world', 'xyz');
    expect(result).toEqual([{ text: 'hello world', highlight: false }]);
  });

  it('highlights matching substring', () => {
    const result = highlightText('hello world', 'world');
    expect(result).toEqual([
      { text: 'hello ', highlight: false },
      { text: 'world', highlight: true },
    ]);
  });

  it('highlights multiple occurrences', () => {
    const result = highlightText('foo bar foo', 'foo');
    expect(result).toHaveLength(4);
    expect(result[0]).toEqual({ text: 'foo', highlight: true });
    expect(result[2]).toEqual({ text: 'foo', highlight: true });
  });
});
```



### Medium Priority: Store Tests

```typescript
// src/stores/configStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore } from './configStore';

describe('configStore', () => {
  beforeEach(() => {
    useConfigStore.setState({
      maxEvents: 500,
      theme: 'auto',
      preferredEventDetailView: 'structured',
      throttleMs: 100,
      pinnedProperties: { default: { properties: [], traits: [], context: {}, metadata: {} } },
    });
  });

  it('sets max events within bounds', () => {
    useConfigStore.getState().setMaxEvents(1000);
    expect(useConfigStore.getState().maxEvents).toBe(1000);

    useConfigStore.getState().setMaxEvents(50000); // Over limit
    expect(useConfigStore.getState().maxEvents).toBe(10000);
  });

  it('toggles pinned properties', () => {
    const { togglePin, isPinned } = useConfigStore.getState();
    
    expect(isPinned('properties', null, 'userId')).toBe(false);
    togglePin('properties', null, 'userId');
    expect(isPinned('properties', null, 'userId')).toBe(true);
  });
});
```

---

## 3. Files to Create

| File | Purpose |

|------|---------|

| `vitest.config.ts` | Vitest configuration |

| `src/lib/segment.test.ts` | Event parsing tests |

| `src/lib/search.test.ts` | Search logic tests |

| `src/stores/configStore.test.ts` | Config store tests |

| `src/lib/utils.test.ts` | Utility function tests |

## 4. Files to Modify

| File | Changes |

|------|---------|

| `package.json` | Add test scripts and devDependencies |

| `tsconfig.json` | Add vitest types if needed |---

## Future Test Expansion

Once infrastructure is in place, add tests for:

- `tabStore.ts` - Event deduplication, state management
- `usePinnedProperties.ts` - Hook behavior