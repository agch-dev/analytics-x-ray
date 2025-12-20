# Stores Documentation

This directory contains Zustand stores for managing extension state with Chrome storage persistence.

## Stores Overview

### `configStore.ts` - Global Configuration
Stores global extension settings that persist across all tabs and sessions.

**Available Properties:**
- `maxEvents` (number) - Maximum number of events to store (1-10000)
- `theme` ('light' | 'dark' | 'auto') - UI theme preference
- `throttleMs` (number) - Throttle interval for high-frequency events (0-5000ms)

**Note:** Event capture is always enabled automatically.

**Usage:**
```typescript
import { useConfigStore, selectTheme } from '@src/stores';

// In a component
function MyComponent() {
  const theme = useConfigStore(selectTheme);
  const setTheme = useConfigStore((state) => state.setTheme);
  
  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}>
        <option value="auto">Auto</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  );
}

// Outside React (background script, utilities)
import { useConfigStore } from '@src/stores';

const maxEvents = useConfigStore.getState().maxEvents;
useConfigStore.getState().setMaxEvents(1000);
useConfigStore.getState().setThrottleMs(200);
```

### `tabStore.ts` - Per-Tab Data
Stores tab-specific analytics events and UI state. Each tab has its own isolated store.

**Available Properties:**
- `events` (SegmentEvent[]) - Array of captured Segment events for this tab
- `selectedEventId` (string | null) - ID of the currently selected event (for detail panel)
- `expandedEventIds` (Set<string>) - Set of expanded event IDs (for list view)
- `tabUrl` (string | null) - Current tab URL
- `lastUpdated` (number) - Timestamp of last update

**Key Methods:**
- `addEvent(event)` - Add a new event to the tab
- `clearEvents()` - Clear all events for this tab
- `setSelectedEvent(id)` - Select one event (for detail panel - only one can be selected)
- `toggleEventExpanded(id)` - Toggle event expansion in list (multiple can be expanded)
- `setTabUrl(url)` - Update the tab URL
- `reset()` - Reset tab state to defaults

**Usage:**
```typescript
import { getTabStore, getCurrentTabId } from '@src/stores';
import { useConfigStore } from '@src/stores';

// Get current tab ID
const tabId = await getCurrentTabId();
if (!tabId) return;

// Get or create store for this tab
const maxEvents = useConfigStore.getState().maxEvents;
const tabStore = getTabStore(tabId, maxEvents);

// In a React component
function SegmentEvents() {
  const tabId = useTabId(); // You'll need to implement this hook
  const store = getTabStore(tabId);
  
  const events = store((state) => state.events);
  const selectedEventId = store((state) => state.selectedEventId);
  const expandedEventIds = store((state) => state.expandedEventIds);
  const addEvent = store((state) => state.addEvent);
  const setSelectedEvent = store((state) => state.setSelectedEvent);
  const toggleEventExpanded = store((state) => state.toggleEventExpanded);
  
  return (
    <div>
      {events.map((event) => (
        <div key={event.id}>
          <button onClick={() => setSelectedEvent(event.id)}>
            {event.name}
          </button>
          <button onClick={() => toggleEventExpanded(event.id)}>
            {expandedEventIds.has(event.id) ? 'Collapse' : 'Expand'}
          </button>
        </div>
      ))}
    </div>
  );
}

// Outside React
const events = tabStore.getState().events;
tabStore.getState().addEvent({
  id: 'event-1',
  type: 'track',
  name: 'Button Clicked',
  properties: { button: 'submit' },
  timestamp: Date.now(),
});
```

## Storage Adapter

The `src/lib/storage.ts` module provides:

- `createChromeStorage()` - Storage adapter for global config
- `createTabStorage(tabId)` - Storage adapter for tab-specific data
- `getCurrentTabId()` - Helper to get current tab ID
- `cleanupTabStorage()` - Clean up stale tab storage entries

## Best Practices

1. **Use Selectors**: Always use selectors to avoid unnecessary re-renders
   ```typescript
   // ✅ Good
   const maxEvents = useConfigStore(selectMaxEvents);
   const theme = useConfigStore(selectTheme);
   
   // ❌ Bad - re-renders on any config change
   const { maxEvents, theme } = useConfigStore();
   ```

2. **Clean Up Tab Stores**: Remove tab stores when tabs are closed
   ```typescript
   import { removeTabStore } from '@src/stores';
   
   Browser.tabs.onRemoved.addListener((tabId) => {
     removeTabStore(tabId);
   });
   ```

3. **Access Outside React**: Use `getState()` for non-React contexts
   ```typescript
   const state = useConfigStore.getState();
   ```

4. **Subscribe to Changes**: Use `subscribe()` for side effects
   ```typescript
   useConfigStore.subscribe(
     (state) => state.maxEvents,
     (maxEvents) => {
       console.log('Max events changed:', maxEvents);
     }
   );
   ```

## Storage Keys

- Global config: `analytics-xray-config`
- Tab data: `tab_{tabId}_tab-{tabId}`

Storage is automatically managed by Zustand's persist middleware.

