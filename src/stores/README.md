# Stores Documentation

This directory contains Zustand stores for managing extension state with Chrome storage persistence. All stores use Zustand's `persist` middleware to automatically sync with Chrome's `storage.local` API.

## Stores Overview

### `configStore.ts` - Global Configuration

Stores global extension settings that persist across all tabs and sessions.

**Available Properties:**

- `maxEvents` (number) - Maximum number of events to store per tab (1-10000, default: 500)
- `theme` ('light' | 'dark' | 'auto') - UI theme preference (default: 'auto')
- `preferredEventDetailView` ('json' | 'structured') - Preferred view mode for event details (default: 'structured')
- `pinnedProperties` (PinnedPropertiesConfig) - Configuration for pinned properties in event detail view
- `dismissedOnboardingModals` (string[]) - List of onboarding modal IDs that have been dismissed
- `sectionDefaults` (SectionDefaults) - Default expanded states for event detail sections

**Available Actions:**

- `setMaxEvents(max: number)` - Set maximum number of events to store
- `setTheme(theme: 'light' | 'dark' | 'auto')` - Set UI theme
- `setPreferredEventDetailView(view: 'json' | 'structured')` - Set preferred event detail view mode
- `reset()` - Reset user-visible settings to defaults (preserves pinned properties)
- `togglePin(section, subsection, property, profile?)` - Toggle pinning of a property
- `isPinned(section, subsection, property, profile?)` - Check if a property is pinned
- `getPinnedProperties(section, subsection, profile?)` - Get all pinned properties for a section
- `dismissOnboardingModal(modalId)` - Mark an onboarding modal as dismissed
- `isOnboardingModalDismissed(modalId)` - Check if an onboarding modal is dismissed
- `resetOnboardingModals()` - Reset all dismissed onboarding modals
- `setSectionDefaultExpanded(sectionKey, expanded)` - Set default expanded state for a section
- `setSubsectionDefaultExpanded(sectionKey, subsectionKey, expanded)` - Set default expanded state for a subsection
- `setSpecialDefault(key, value)` - Set special default behavior
- `resetSectionDefaults()` - Reset all section defaults

**Available Selectors:**

- `selectMaxEvents` - Selector for maxEvents
- `selectTheme` - Selector for theme
- `selectPreferredEventDetailView` - Selector for preferredEventDetailView

**Usage:**

```typescript
import { useConfigStore, selectTheme, selectMaxEvents } from '@src/stores';

// In a component (using selectors)
function MyComponent() {
  const theme = useConfigStore(selectTheme);
  const maxEvents = useConfigStore(selectMaxEvents);
  const setTheme = useConfigStore((state) => state.setTheme);
  const setMaxEvents = useConfigStore((state) => state.setMaxEvents);

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}>
        <option value="auto">Auto</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <input
        type="number"
        value={maxEvents}
        onChange={(e) => setMaxEvents(Number(e.target.value))}
      />
    </div>
  );
}

// Outside React (background script, utilities)
import { useConfigStore } from '@src/stores';

const maxEvents = useConfigStore.getState().maxEvents;
useConfigStore.getState().setMaxEvents(1000);
```

**Note:** Event capture is always enabled automatically. The `maxEvents` setting controls how many events are retained per tab.

### `tabStore.ts` - Per-Tab Data

Stores tab-specific analytics events and UI state. Each tab has its own isolated store instance managed by a registry system.

**Available Properties:**

- `events` (SegmentEvent[]) - Array of captured Segment events for this tab
- `selectedEventId` (string | null) - ID of the currently selected event (for detail panel - only one can be selected)
- `expandedEventIds` (Set<string>) - Set of expanded event IDs (for list view - multiple can be expanded)
- `hiddenEventNames` (Set<string>) - Set of event names that are hidden/filtered
- `searchQuery` (string) - Search query for filtering events
- `lastUpdated` (number) - Timestamp of last update
- `lastUpdatedFormatted` (string) - Human-readable format of lastUpdated
- `reloadTimestamps` (number[]) - Timestamps of page reloads for this tab (keeps last 100)

**Available Actions:**

- `addEvent(event: SegmentEvent)` - Add a new event to the tab (automatically deduplicates by id and messageId)
- `clearEvents()` - Clear all events for this tab (also clears reload timestamps)
- `setSelectedEvent(id: string | null)` - Select one event (for detail panel - only one can be selected)
- `toggleEventExpanded(id: string)` - Toggle event expansion in list (multiple can be expanded)
- `toggleEventNameVisibility(eventName: string)` - Hide/show events by name
- `showAllEventNames()` - Show all hidden event names
- `hideAllEventNames(eventNames: string[])` - Hide all provided event names
- `setSearchQuery(query: string)` - Set search query for filtering
- `addReloadTimestamp(timestamp: number)` - Add a reload timestamp
- `reset()` - Reset tab state to defaults

**Store Registry Functions:**

- `getTabStore(tabId: number, maxEvents?: number)` - Get or create a store for a specific tab
- `removeTabStore(tabId: number)` - Remove a tab store from the registry (call when tab is closed)
- `getActiveTabIds()` - Get all active tab IDs from the registry
- `syncReloadTimestamps(tabId: number)` - Sync reload timestamps from storage to the store

**Usage:**

```typescript
import { getTabStore, removeTabStore } from '@src/stores';
import Browser from 'webextension-polyfill';

// In a component
function EventList({ tabId }: { tabId: number }) {
  // Get the store for this tab (creates if doesn't exist)
  const useTabStore = useMemo(() => getTabStore(tabId), [tabId]);

  // Use selectors to avoid unnecessary re-renders
  const events = useTabStore((state) => state.events);
  const selectedEventId = useTabStore((state) => state.selectedEventId);
  const setSelectedEvent = useTabStore((state) => state.setSelectedEvent);
  const clearEvents = useTabStore((state) => state.clearEvents);

  return (
    <div>
      <button onClick={clearEvents}>Clear Events</button>
      {events.map(event => (
        <div
          key={event.id}
          onClick={() => setSelectedEvent(event.id)}
          className={selectedEventId === event.id ? 'selected' : ''}
        >
          {event.name}
        </div>
      ))}
    </div>
  );
}

// In background script
Browser.tabs.onRemoved.addListener((tabId) => {
  removeTabStore(tabId);
});

// Access outside React
const store = getTabStore(tabId);
store.getState().addEvent(event);
```

**Important Notes:**

- Tab stores are automatically deduplicated by `id` and `messageId` when adding events
- The `maxEvents` limit is read dynamically from `configStore` on each `addEvent` call, allowing instant updates
- Tab stores use a registry system to prevent duplicate stores for the same tab
- Always call `removeTabStore(tabId)` when a tab is closed to free memory
- Sets (`expandedEventIds`, `hiddenEventNames`) are automatically serialized to arrays for storage

### `domainStore.ts` - Domain Allowlist

Manages domain allowlist configuration for controlling which domains can capture events.

**Available Properties:**

- `allowedDomains` (AllowedDomain[]) - Array of allowed domains with subdomain settings

**Available Actions:**

- `addAllowedDomain(domain: string, allowSubdomains: boolean)` - Add a domain to the allowlist
- `removeAllowedDomain(domain: string)` - Remove a domain from the allowlist
- `clearAllAllowedDomains()` - Clear all allowed domains
- `updateDomainSubdomainSetting(domain: string, allowSubdomains: boolean)` - Update subdomain setting for a domain
- `autoAllowDomain(domain: string)` - Automatically add a domain to the allowlist (handles subdomain detection)

**Available Selectors:**

- `selectAllowedDomains` - Selector for allowedDomains

**Usage:**

```typescript
import { useDomainStore, selectAllowedDomains } from '@src/stores';

// In a component
function DomainSettings() {
  const allowedDomains = useDomainStore(selectAllowedDomains);
  const addAllowedDomain = useDomainStore((state) => state.addAllowedDomain);
  const removeAllowedDomain = useDomainStore((state) => state.removeAllowedDomain);

  return (
    <div>
      {allowedDomains.map(({ domain, allowSubdomains }) => (
        <div key={domain}>
          {domain} {allowSubdomains && '(with subdomains)'}
          <button onClick={() => removeAllowedDomain(domain)}>Remove</button>
        </div>
      ))}
      <button onClick={() => addAllowedDomain('example.com', true)}>
        Add example.com
      </button>
    </div>
  );
}

// Auto-allow a domain (useful for onboarding)
const result = useDomainStore.getState().autoAllowDomain('example.com');
// Returns: { action: 'added' | 'updated' | 'already_allowed' | 'no_action', ... }
```

## Storage Adapter

The `src/lib/storage` module provides storage adapters and utilities:

- `createChromeStorage()` - Storage adapter for global config stores
- `createTabStorage(tabId)` - Storage adapter for tab-specific data
- `cleanupTabStorage()` - Clean up stale tab storage entries
- `cleanupStaleTabs()` - Clean up storage for tabs that no longer exist
- `logStorageSize(context?)` - Log current storage size for debugging

## Best Practices

1. **Use Selectors**: Always use selectors to avoid unnecessary re-renders

   ```typescript
   // ✅ Good - component only re-renders when maxEvents changes
   const maxEvents = useConfigStore(selectMaxEvents);
   const theme = useConfigStore(selectTheme);

   // ❌ Bad - re-renders on any config change
   const { maxEvents, theme } = useConfigStore();
   ```

2. **Clean Up Tab Stores**: Remove tab stores when tabs are closed

   ```typescript
   import { removeTabStore } from '@src/stores';
   import Browser from 'webextension-polyfill';

   Browser.tabs.onRemoved.addListener((tabId) => {
     removeTabStore(tabId);
   });
   ```

3. **Access Outside React**: Use `getState()` for non-React contexts

   ```typescript
   // In background script or utility functions
   const state = useConfigStore.getState();
   const maxEvents = state.maxEvents;
   state.setMaxEvents(1000);
   ```

4. **Subscribe to Changes**: Use `subscribe()` for side effects

   ```typescript
   useConfigStore.subscribe(
     (state) => state.maxEvents,
     (maxEvents) => {
       console.log('Max events changed:', maxEvents);
       // Perform side effect
     }
   );
   ```

5. **Use Store Registry for Tab Stores**: Always use `getTabStore()` instead of creating stores directly

   ```typescript
   // ✅ Good - uses registry
   const store = getTabStore(tabId);

   // ❌ Bad - creates duplicate stores
   const store = createTabStore(tabId);
   ```

6. **Memoize Tab Store Hooks**: When using tab stores in React components, memoize the hook

   ```typescript
   // ✅ Good
   const useTabStore = useMemo(() => getTabStore(tabId), [tabId]);

   // ❌ Bad - creates new store on every render
   const useTabStore = getTabStore(tabId);
   ```

## Storage Keys

- Global config: `analytics-xray-config` (version 7)
- Domain allowlist: `analytics-xray-domain` (version 1)
- Tab data: `tab_{tabId}_store` (version 1)
- Reload timestamps: `tab_{tabId}_reloads` (separate key for performance)

Storage is automatically managed by Zustand's persist middleware. All stores include migration logic to handle schema changes between versions.

## Store Versions and Migrations

Both `configStore` and `tabStore` use versioned persistence with automatic migrations:

- **configStore** (version 7): Includes migrations for pinned properties, traits, preferred view mode, onboarding modals, and section defaults
- **tabStore** (version 1): Handles Set serialization/deserialization for `expandedEventIds` and `hiddenEventNames`
- **domainStore** (version 1): No migrations currently needed

Migrations run automatically when the persisted version is older than the current version.
