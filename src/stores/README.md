# Stores Documentation

This directory contains Zustand stores for managing extension state with Chrome storage persistence.

## Stores Overview

### `configStore.ts` - Global Configuration

Stores global extension settings that persist across all tabs and sessions.

**Available Properties:**

- `maxEvents` (number) - Maximum number of events to store (1-10000)
- `theme` ('light' | 'dark' | 'auto') - UI theme preference

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
```

### `tabStore.ts` - Per-Tab Data

Stores tab-specific analytics events and UI state. Each tab has its own isolated store.

**Available Properties:**

- `events` (SegmentEvent[]) - Array of captured Segment events for this tab
- `selectedEventId` (string | null) - ID of the currently selected event (for detail panel)
- `expandedEventIds` (Set<string>) - Set of expanded event IDs (for list view)
- `lastUpdated` (number) - Timestamp of last update

**Key Methods:**

- `addEvent(event)` - Add a new event to the tab
- `clearEvents()` - Clear all events for this tab
- `setSelectedEvent(id)` - Select one event (for detail panel - only one can be selected)
- `toggleEventExpanded(id)` - Toggle event expansion in list (multiple can be expanded)
- `reset()` - Reset tab state to defaults

## Storage Adapter

The `src/lib/storage.ts` module provides:

- `createChromeStorage()` - Storage adapter for global config
- `createTabStorage(tabId)` - Storage adapter for tab-specific data
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
- Tab data: `tab_{tabId}_store`

Storage is automatically managed by Zustand's persist middleware.
