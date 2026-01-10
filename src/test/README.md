# Test Utilities

This directory contains shared testing utilities for the analytics-x-ray test suite.

## Usage

Import utilities from the test index:

```typescript
import {
  createSegmentEvent,
  createBatchPayload,
  setupMockChromeStorage,
} from '@src/test';
```

## Available Utilities

### Segment Event Factories

Create test Segment events with sensible defaults:

```typescript
import {
  createBatchEvent,
  createBatchPayload,
  createSegmentEvent,
} from '@src/test';

// Create a basic batch event
const event = createBatchEvent({ type: 'track', event: 'Button Clicked' });

// Create a batch payload
const payload = createBatchPayload([event], { sentAt: '2024-01-01T00:00:00Z' });

// Create a normalized Segment event
const segmentEvent = createSegmentEvent({
  type: 'page',
  name: 'Home Page',
  tabId: 1,
  url: 'https://example.com',
});

// Create multiple events of different types
const events = createEventsByType(['track', 'page', 'identify']);
```

### Storage Mocking

Mock Chrome storage APIs with realistic behavior:

```typescript
import { setupMockChromeStorage, createMockStorage } from '@src/test';

describe('MyComponent', () => {
  it('should read from storage', async () => {
    const mockStorage = setupMockChromeStorage({
      'my-key': { value: 'test' },
    });

    const result = await mockStorage.get('my-key');
    expect(result).toEqual({ 'my-key': { value: 'test' } });
  });
});
```

### Logger Mocking

Mock the logger for tests:

```typescript
import { createMockLogger, mockLogger } from '@src/test';

// Option 1: Create a mock logger instance
const logger = createMockLogger();
logger.debug('test');

// Option 2: Mock the entire logger module (use in vi.mock)
mockLogger();
```

### Time/Date Helpers

Control time in tests:

```typescript
import { mockDateNow, mockNewDate, createFixedDate } from '@src/test';

it('should handle dates correctly', () => {
  const restore = mockDateNow(1704067200000);
  // Test code that uses Date.now()
  restore(); // Restore original Date.now()
});
```

### ArrayBuffer Helpers

Create ArrayBuffers for testing request body decoding:

```typescript
import { createArrayBufferFromString } from '@src/test';

const buffer = createArrayBufferFromString('{"test": "data"}');
```

### Async Helpers

Wait for conditions in async tests:

```typescript
import { waitFor, waitForCondition } from '@src/test';

// Wait for a specific time
await waitFor(100);

// Wait for a condition to be true
await waitForCondition(() => someCondition === true, 1000);
```

### Provider Helpers

Create test URLs for different analytics providers:

```typescript
import { createProviderUrl } from '@src/test';

const segmentUrl = createProviderUrl('segment');
// Returns: 'https://api.segment.io/v1/batch'
```

### Store Testing

Reset Zustand stores between tests:

```typescript
import { resetStore } from '@src/test';
import { useConfigStore } from '@src/stores';

afterEach(() => {
  resetStore(useConfigStore);
});
```

## Examples

### Example: Testing Segment Event Processing

```typescript
import { describe, it, expect } from 'vitest';
import { processBatchPayload } from '@src/lib';
import { createBatchPayload, createEventsByType } from '@src/test';

describe('processBatchPayload', () => {
  it('should process multiple events', () => {
    const events = createEventsByType(['track', 'page', 'identify']);
    const payload = createBatchPayload(events);

    const result = processBatchPayload(
      payload,
      1,
      'https://example.com',
      'segment'
    );
    expect(result).toHaveLength(3);
  });
});
```

### Example: Testing with Storage

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockChromeStorage } from '@src/test';

describe('Storage Operations', () => {
  let mockStorage: ReturnType<typeof setupMockChromeStorage>;

  beforeEach(() => {
    mockStorage = setupMockChromeStorage({ key: 'value' });
  });

  it('should read from storage', async () => {
    const result = await mockStorage.get('key');
    expect(result).toEqual({ key: 'value' });
  });
});
```

## Best Practices

1. **Use factories for test data**: Always use the factory functions instead of manually creating test objects. This ensures consistency and makes tests easier to maintain.

2. **Clean up mocks**: Always restore mocked functions/APIs in `afterEach` hooks.

3. **Use realistic test data**: The factories provide sensible defaults, but override them when testing edge cases.

4. **Isolate tests**: Use `beforeEach` to set up fresh mocks and `afterEach` to clean up.

5. **Test utilities are for tests only**: These utilities should never be imported in production code.
