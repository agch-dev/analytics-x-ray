---
name: Validation & Bug Fixes
overview: Fix event validation inconsistencies and remove redundant deduplication logic to prevent edge case bugs.
todos:
  - id: fix-validation
    content: Remove messageId requirement from isValidBatchEvent
    status: completed
  - id: document-dedup
    content: Add comments clarifying where deduplication happens
    status: completed
  - id: test-edge-cases
    content: Manually test events without messageId are captured correctly
    status: completed
---

# Validation & Bug Fixes

## Problem

There are validation inconsistencies that could cause subtle bugs with certain event payloads.---

## 1. Event Validation Mismatch

### Current State

**`isValidBatchEvent`** in [`src/lib/segment.ts`](src/lib/segment.ts) (lines 174-185):

```typescript
export function isValidBatchEvent(event: unknown): event is SegmentBatchEvent {
  // ...
  return (
    typeof e.type === 'string' &&
    ['track', 'page', 'screen', 'identify', 'group', 'alias'].includes(e.type) &&
    typeof e.messageId === 'string'  // <-- REQUIRES messageId
  );
}
```

**`normalizeEvent`** in the same file (line 221):

```typescript
const messageId = batchEvent.messageId || `generated_${Date.now()}_${Math.random()}`;
```



### The Bug

Events without `messageId` are filtered out by `isValidBatchEvent` BEFORE they reach `normalizeEvent`, so the fallback generation never happens.Some Segment implementations (especially custom ones) may not include `messageId`.

### Solution

Make `messageId` optional in validation since we can generate it:

```typescript
export function isValidBatchEvent(event: unknown): event is SegmentBatchEvent {
  if (typeof event !== 'object' || event === null) return false;

  const e = event as Record<string, unknown>;
  return (
    typeof e.type === 'string' &&
    ['track', 'page', 'screen', 'identify', 'group', 'alias'].includes(e.type)
    // Remove messageId requirement - normalizeEvent handles missing messageId
  );
}
```

---

## 2. Redundant Deduplication

### Current State

Events are deduplicated in TWO places:**Background script** ([`src/pages/background/index.ts`](src/pages/background/index.ts) line 140):

```typescript
const updated = [...newEvents, ...existing].slice(0, MAX_EVENTS_PER_TAB);
// No explicit dedup, but overwrites by tabId
```

**Tab store** ([`src/stores/tabStore.ts`](src/stores/tabStore.ts) lines 76-82):

```typescript
const isDuplicate = state.events.some(
  (e) => e.id === event.id || e.messageId === event.messageId
);
if (isDuplicate) {
  return state;
}
```



### Issues

1. Different dedup strategies in different places
2. If background already dedupes, tabStore dedup is redundant
3. If tabStore is the only dedup, background could grow unbounded

### Solution

Centralize deduplication in ONE place:**Option A**: Keep dedup only in tabStore (recommended)

- Background just forwards events
- Store handles all dedup logic
- Single source of truth

**Option B**: Keep dedup only in background

- Background dedupes before storage
- tabStore trusts incoming data
- Requires ensuring background is always the entry point

### Recommended Changes

```typescript
// src/stores/tabStore.ts - Keep the existing dedup (it's more thorough)

// src/pages/background/index.ts - Remove implicit dedup, just append
async function storeEvents(tabId: number, newEvents: SegmentEvent[]): Promise<void> {
  const existing = tabEvents.get(tabId) || [];
  // Prepend new events, limit size (dedup happens in tabStore)
  const updated = [...newEvents, ...existing].slice(0, MAX_EVENTS_PER_TAB);
  tabEvents.set(tabId, updated);
  // ... persist
}
```

---

## Files to Modify

| File | Changes |

|------|---------|

| `src/lib/segment.ts` | Remove messageId requirement from isValidBatchEvent |

| `src/pages/background/index.ts` | Document that dedup happens in tabStore |---

## Testing

After changes, verify:

1. Events without messageId are captured and displayed
2. Duplicate events (same messageId) don't appear twice