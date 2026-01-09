# API Documentation

This document describes the public APIs available in the analytics-x-ray extension.

## Table of Contents

- [Stores](#stores)
  - [Config Store](#config-store)
  - [Tab Store](#tab-store)
- [Utilities](#utilities)
  - [Segment Parsing](#segment-parsing)
  - [Search](#search)
  - [Domain Utilities](#domain-utilities)
  - [Storage](#storage)
  - [Event Buckets](#event-buckets)
- [Types](#types)
  - [Segment Types](#segment-types)
  - [Store Types](#store-types)

## Stores

### Config Store

The configuration store manages global extension settings and preferences.

**Import:**
```typescript
import { useConfigStore } from '@src/stores/configStore';
```

#### State

```typescript
interface ExtensionConfig {
  maxEvents: number;                    // Maximum number of events to store (1-10000)
  theme: 'light' | 'dark' | 'auto';     // UI theme preference
  preferredEventDetailView: 'json' | 'structured';  // Default view mode
  pinnedProperties: PinnedPropertiesConfig;  // Pinned property configurations
  dismissedOnboardingModals: string[];  // List of dismissed modal IDs
  sectionDefaults: SectionDefaults;      // Default section expansion states
}
```

#### Actions

**setMaxEvents(max: number)**
- Sets the maximum number of events to store
- Validates range: 1-10000
- Automatically trims existing events if limit is reduced

**setTheme(theme: 'light' | 'dark' | 'auto')**
- Sets the UI theme preference

**setPreferredEventDetailView(view: 'json' | 'structured')**
- Sets the default view mode for event details

**togglePin(section: string, subsection: string | null, property: string, profile?: string)**
- Toggles pin state for a property
- Sections: `'properties'`, `'traits'`, `'context'`, `'metadata'`
- Subsections: For context: `'page'`, `'library'`, `'other'`, `'browser'`
- Subsections: For metadata: `'identifiers'`, `'captureInfo'`, `'integrations'`
- Profile defaults to `'default'`

**isPinned(section: string, subsection: string | null, property: string, profile?: string): boolean**
- Checks if a property is pinned

**getPinnedProperties(section: string, subsection: string | null, profile?: string): string[]**
- Returns array of pinned property names for a section/subsection

**dismissOnboardingModal(modalId: string)**
- Marks an onboarding modal as dismissed

**isOnboardingModalDismissed(modalId: string): boolean**
- Checks if an onboarding modal has been dismissed

**setSectionDefaultExpanded(sectionKey: keyof SectionDefaults['sections'], expanded: boolean)**
- Sets default expansion state for a section

**setSubsectionDefaultExpanded(sectionKey: 'context' | 'metadata', subsectionKey: string, expanded: boolean)**
- Sets default expansion state for a subsection

**reset()**
- Resets user-visible settings to defaults (preserves pinned properties)

#### Usage Example

```typescript
import { useConfigStore } from '@src/stores/configStore';

function MyComponent() {
  const maxEvents = useConfigStore((state) => state.maxEvents);
  const setMaxEvents = useConfigStore((state) => state.setMaxEvents);
  const togglePin = useConfigStore((state) => state.togglePin);
  
  // Update max events
  setMaxEvents(1000);
  
  // Toggle pin
  togglePin('properties', null, 'userId');
}
```

### Tab Store

The tab store manages per-tab event data and UI state.

**Import:**
```typescript
import { getTabStore } from '@src/stores/tabStore';
```

#### State

```typescript
interface TabState {
  events: SegmentEvent[];              // Captured events for this tab
  selectedEventId: string | null;      // Currently selected event ID
  expandedEventIds: Set<string>;       // Set of expanded event IDs
  hiddenEventNames: Set<string>;       // Set of hidden event names
  searchQuery: string;                 // Current search query
  lastUpdated: number;                 // Timestamp of last update
  reloadTimestamps: number[];          // Page reload timestamps
}
```

#### Actions

**addEvent(event: SegmentEvent)**
- Adds an event to the store
- Automatically deduplicates by `id` and `messageId`
- Respects `maxEvents` limit from config store
- Prepends new events (newest first)

**clearEvents()**
- Clears all events and resets UI state

**setSelectedEvent(id: string | null)**
- Sets the selected event ID (for detail view)

**toggleEventExpanded(id: string)**
- Toggles expansion state for an event

**toggleEventNameVisibility(eventName: string)**
- Toggles visibility of events with a specific name

**showAllEventNames()**
- Shows all hidden event names

**hideAllEventNames(eventNames: string[])**
- Hides all provided event names

**setSearchQuery(query: string)**
- Sets the search query for filtering

**addReloadTimestamp(timestamp: number)**
- Adds a page reload timestamp

**reset()**
- Resets store to default state

#### Usage Example

```typescript
import { getTabStore } from '@src/stores/tabStore';
import type { SegmentEvent } from '@src/types/segment';

const tabId = 123;
const useTabStore = getTabStore(tabId);

// In a component
function EventList() {
  const events = useTabStore((state) => state.events);
  const addEvent = useTabStore((state) => state.addEvent);
  const toggleEventExpanded = useTabStore((state) => state.toggleEventExpanded);
  
  // Add event
  const newEvent: SegmentEvent = { /* ... */ };
  addEvent(newEvent);
  
  // Toggle expansion
  toggleEventExpanded(eventId);
}
```

## Utilities

### Segment Parsing

Utilities for parsing and processing Segment analytics payloads.

**Import:**
```typescript
import {
  detectProvider,
  decodeRequestBody,
  parseSegmentPayload,
  isValidBatchEvent,
  getEventName,
  normalizeEvent,
  processBatchPayload,
  SEGMENT_ENDPOINTS,
} from '@src/lib/segment';
```

#### Functions

**detectProvider(url: string): SegmentProvider**
- Detects the analytics provider from a URL
- Returns: `'segment'`, `'rudderstack'`, `'dreamdata'`, or `'unknown'`

**decodeRequestBody(raw: Array<{ bytes?: unknown; file?: string }>): string | null**
- Decodes raw request body from webRequest API
- Returns decoded string or null on error

**parseSegmentPayload(jsonString: string): SegmentBatchPayload | null**
- Parses JSON string into Segment batch payload
- Handles both batch and single event formats
- Returns null on parse error

**isValidBatchEvent(event: unknown): event is SegmentBatchEvent**
- Type guard to validate a batch event
- Checks for valid event type

**getEventName(event: SegmentBatchEvent): string**
- Extracts display name from a batch event
- Formats based on event type

**normalizeEvent(batchEvent: SegmentBatchEvent, tabId: number, url: string, sentAt: string, provider: SegmentProvider): SegmentEvent**
- Converts batch event to normalized SegmentEvent format
- Generates fallback messageId if missing

**processBatchPayload(payload: SegmentBatchPayload, tabId: number, url: string, provider: SegmentProvider): SegmentEvent[]**
- Processes a complete batch payload
- Returns array of normalized events

#### Constants

**SEGMENT_ENDPOINTS**
- Array of URL patterns for Segment-compatible endpoints
- Used for webRequest listener configuration

### Search

Utilities for searching and highlighting text in events.

**Import:**
```typescript
import {
  parseSearchQuery,
  eventMatchesSearch,
  highlightText,
  type SearchMatch,
} from '@src/lib/search';
```

#### Functions

**parseSearchQuery(query: string): SearchMatch | null**
- Parses search query string
- Returns SearchMatch object or null if empty

**eventMatchesSearch(event: SegmentEvent, match: SearchMatch | null): boolean**
- Checks if an event matches a search query
- Searches recursively through all event properties
- Case-insensitive matching

**highlightText(text: string, searchQuery: string): Array<{ text: string; highlight: boolean }>**
- Splits text into highlighted and non-highlighted parts
- Returns array of text parts with highlight flags

### Domain Utilities

Utilities for domain management and validation.

**Import:**
```typescript
import {
  extractDomain,
  normalizeDomain,
  isDomainAllowed,
  getBaseDomain,
  isSpecialPage,
} from '@src/lib/domain';
```

#### Functions

**extractDomain(url: string): string | null**
- Extracts domain from a URL
- Returns null for invalid URLs or special pages

**normalizeDomain(domain: string): string**
- Normalizes domain (lowercase, removes www)
- Returns normalized domain string

**isDomainAllowed(domain: string, allowedDomains: AllowedDomain[]): boolean**
- Checks if a domain is in the allowed list
- Respects subdomain settings

**getBaseDomain(domain: string): string**
- Extracts base domain (removes subdomains)
- Returns base domain (e.g., "example.com")

**isSpecialPage(url: string): boolean**
- Checks if URL is a special browser page
- Returns true for chrome://, about:, etc.

### Storage

Utilities for Chrome storage operations.

**Import:**
```typescript
import {
  createChromeStorage,
  createTabStorage,
  cleanupTabStorage,
  cleanupStaleTabs,
  getStorageSizeInfo,
  logStorageSize,
} from '@src/lib/storage';
```

#### Functions

**createChromeStorage(): StorageAdapter**
- Creates storage adapter for Chrome storage.local
- Returns StorageAdapter compatible with Zustand

**createTabStorage(tabId: number): StorageAdapter**
- Creates storage adapter for tab-specific storage
- Uses key prefix: `tab_${tabId}_`

**cleanupTabStorage(tabId: number): Promise<void>**
- Cleans up all storage for a specific tab
- Removes events, reload timestamps, and store data

**cleanupStaleTabs(maxAgeMs: number): Promise<number>**
- Cleans up tabs that haven't been updated in specified time
- Only cleans closed tabs
- Returns number of tabs cleaned

**getStorageSizeInfo(): Promise<StorageSizeInfo>**
- Gets storage size information
- Returns size in bytes and percentage used

**logStorageSize(context?: string): Promise<void>**
- Logs storage size information to console
- Useful for debugging storage issues

### Event Buckets

Utilities for categorizing events into visual buckets.

**Import:**
```typescript
import {
  categorizeEvent,
  getBucketConfig,
  getBucketColor,
  DEFAULT_EVENT_BUCKETS,
  type EventBucket,
  type EventBucketConfig,
} from '@src/lib/eventBuckets';
```

#### Functions

**categorizeEvent(event: SegmentEvent, buckets?: EventBucketConfig[]): EventBucket**
- Categorizes an event into a bucket
- Returns bucket ID: `'page'`, `'view'`, `'interaction'`, `'identify'`, `'navigation'`, `'conversion'`, `'error'`, or `'default'`

**getBucketConfig(bucketId: EventBucket, buckets?: EventBucketConfig[]): EventBucketConfig | undefined**
- Gets configuration for a bucket
- Returns bucket config or undefined

**getBucketColor(bucketId: EventBucket, buckets?: EventBucketConfig[]): string**
- Gets Tailwind color class for a bucket
- Returns color class string (e.g., `'border-l-emerald-500'`)

#### Constants

**DEFAULT_EVENT_BUCKETS**
- Array of default bucket configurations
- Can be customized via user settings in the future

## Types

### Segment Types

**Import:**
```typescript
import type {
  SegmentEvent,
  SegmentEventType,
  SegmentProvider,
  SegmentBatchEvent,
  SegmentBatchPayload,
  SegmentContext,
} from '@src/types/segment';
```

#### SegmentEvent

Normalized event format used throughout the extension.

```typescript
interface SegmentEvent {
  id: string;                    // Unique event ID (usually messageId)
  type: SegmentEventType;         // Event type
  name: string;                  // Display name
  properties: Record<string, unknown>;  // Event properties
  traits?: Record<string, unknown>;     // User traits (for identify/group)
  anonymousId?: string;           // Anonymous user ID
  userId?: string;                // User ID
  groupId?: string;               // Group ID
  messageId: string;              // Segment message ID
  timestamp: string;              // ISO timestamp
  sentAt: string;                 // ISO timestamp when sent
  context: SegmentContext;        // Event context
  integrations?: Record<string, unknown>;  // Integration settings
  tabId: number;                  // Tab ID where event was captured
  capturedAt: number;             // Timestamp when captured (ms)
  url: string;                    // URL where event was fired
  provider: SegmentProvider;      // Analytics provider
  rawPayload: SegmentBatchEvent;  // Original batch event
}
```

#### SegmentEventType

```typescript
type SegmentEventType = 'track' | 'page' | 'screen' | 'identify' | 'group' | 'alias';
```

#### SegmentProvider

```typescript
type SegmentProvider = 'segment' | 'rudderstack' | 'dreamdata' | 'unknown';
```

### Store Types

**Import:**
```typescript
import type {
  ExtensionConfig,
  PinnedPropertiesProfile,
  PinnedPropertiesConfig,
  SectionDefaults,
  AllowedDomain,
} from '@src/stores/configStore';

import type {
  TabState,
} from '@src/stores/tabStore';
```

See [Stores](#stores) section for type definitions.
