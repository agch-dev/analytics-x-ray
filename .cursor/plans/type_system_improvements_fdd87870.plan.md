---
name: Type System Improvements
overview: Create shared message types and replace type assertions with proper type guards for better type safety across extension contexts.
todos:
  - id: create-message-types
    content: Create src/types/messages.ts with all extension message types
    status: completed
  - id: add-type-guards
    content: Add type guard functions for each message type
    status: completed
  - id: update-background
    content: Update background/index.ts to use shared types and guards
    status: completed
  - id: update-use-event-sync
    content: Update useEventSync.ts to use shared types and guards
    status: completed
  - id: update-type-exports
    content: Add message types to src/types/index.ts barrel export
    status: completed
---

# Type System Improvements

## Problem

Type definitions are duplicated and some type assertions (`as`) could be replaced with safer type guards.---

## 1. Shared Message Types

### Current State

`ExtensionMessage` is defined inline in multiple places:**Background script** ([`src/pages/background/index.ts`](src/pages/background/index.ts) lines 28-32):

```typescript
interface ExtensionMessage {
  type: 'GET_EVENTS' | 'CLEAR_EVENTS' | 'GET_EVENT_COUNT' | 'EVENTS_CAPTURED';
  tabId?: number;
  payload?: unknown;
}
```

**useEventSync hook** ([`src/pages/devtools/hooks/useEventSync.ts`](src/pages/devtools/hooks/useEventSync.ts) lines 22-28):

```typescript
interface EventsCapturedMessage {
  type: 'EVENTS_CAPTURED';
  payload: {
    tabId: number;
    events: SegmentEvent[];
  };
}
```



### Solution

Create a centralized message types file:

```typescript
// src/types/messages.ts
import type { SegmentEvent } from './segment';

// All message types used in extension communication
export type MessageType = 
  | 'GET_EVENTS' 
  | 'CLEAR_EVENTS' 
  | 'GET_EVENT_COUNT' 
  | 'EVENTS_CAPTURED';

// Base message interface
export interface BaseMessage {
  type: MessageType;
  tabId?: number;
}

// Specific message types with typed payloads
export interface GetEventsMessage extends BaseMessage {
  type: 'GET_EVENTS';
  tabId: number;
}

export interface ClearEventsMessage extends BaseMessage {
  type: 'CLEAR_EVENTS';
  tabId: number;
}

export interface GetEventCountMessage extends BaseMessage {
  type: 'GET_EVENT_COUNT';
  tabId: number;
}

export interface EventsCapturedMessage extends BaseMessage {
  type: 'EVENTS_CAPTURED';
  payload: {
    tabId: number;
    events: SegmentEvent[];
  };
}

// Union of all messages
export type ExtensionMessage = 
  | GetEventsMessage 
  | ClearEventsMessage 
  | GetEventCountMessage 
  | EventsCapturedMessage;

// Type guards
export function isEventsCapturedMessage(msg: unknown): msg is EventsCapturedMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as BaseMessage).type === 'EVENTS_CAPTURED'
  );
}
```

---

## 2. Replace Type Assertions with Type Guards

### Current State

Several places use unsafe `as` assertions:**Background script** ([`src/pages/background/index.ts`](src/pages/background/index.ts) line 229):

```typescript
const msg = message as ExtensionMessage;
```

**useEventSync** ([`src/pages/devtools/hooks/useEventSync.ts`](src/pages/devtools/hooks/useEventSync.ts) line 65):

```typescript
const msg = message as EventsCapturedMessage;
```



### Solution

Use the type guards from the shared types:

```typescript
// Before
const msg = message as ExtensionMessage;

// After
import { isExtensionMessage } from '@src/types/messages';

if (!isExtensionMessage(message)) return;
// message is now typed as ExtensionMessage
```

---

## 3. Add Readonly to Immutable Data

### Opportunity

Several interfaces could benefit from `Readonly<>` to prevent accidental mutation:

- `SegmentEvent` properties that shouldn't change after creation
- Store state selectors
```typescript
// Example
export type SegmentEvent = Readonly<{
  id: string;
  type: SegmentEventType;
  // ...
}>;
```


---

## Files to Create

| File | Purpose ||------|---------|| `src/types/messages.ts` | Centralized message type definitions |

## Files to Modify

| File | Changes ||------|---------|| `src/pages/background/index.ts` | Import shared types, use type guards || `src/pages/devtools/hooks/useEventSync.ts` | Import shared types, use type guards || `src/types/index.ts` | Re-export message types |---