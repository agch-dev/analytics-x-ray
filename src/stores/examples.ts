/**
 * Usage Examples for Stores
 * 
 * This file demonstrates how to use the stores in different contexts.
 * These are examples only - not meant to be imported directly.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

// ============================================================================
// Example 1: Using Config Store in a React Component
// ============================================================================

/*
import { useConfigStore } from '@src/stores';

function SettingsPanel() {
  // ✅ Good: Use selector to avoid unnecessary re-renders
  const maxEvents = useConfigStore((state) => state.maxEvents);
  const theme = useConfigStore((state) => state.theme);
  
  const setMaxEvents = useConfigStore((state) => state.setMaxEvents);
  const setTheme = useConfigStore((state) => state.setTheme);

  return (
    <div>
      <label>
        Max Events:
        <input
          type="number"
          value={maxEvents}
          onChange={(e) => setMaxEvents(parseInt(e.target.value, 10))}
        />
      </label>
      <label>
        Theme:
        <select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}>
          <option value="auto">Auto</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>
  );
}
*/

// ============================================================================
// Example 2: Using Config Store Outside React (Background Script)
// ============================================================================

/*
import { useConfigStore } from '@src/stores';
import Browser from 'webextension-polyfill';

// Get current config
const config = useConfigStore.getState();
console.log('Max events:', config.maxEvents);

// Update config
useConfigStore.getState().setMaxEvents(1000);

// Subscribe to changes
useConfigStore.subscribe(
  (state) => state.maxEvents,
  (maxEvents) => {
    console.log('Max events changed to:', maxEvents);
    // Update background script behavior
  }
);
*/

// ============================================================================
// Example 3: Using Tab Store in a React Component
// ============================================================================

/*
import { getTabStore, getCurrentTabId } from '@src/stores';
import { useConfigStore } from '@src/stores';
import { useEffect, useState } from 'react';

function SegmentEventsPanel() {
  const [tabId, setTabId] = useState<number | null>(null);
  const maxEvents = useConfigStore((state) => state.maxEvents);

  useEffect(() => {
    getCurrentTabId().then(setTabId);
  }, []);

  if (!tabId) return <div>Loading...</div>;

  const tabStore = getTabStore(tabId, maxEvents);
  
  // ✅ Use selector to get only what you need
  const events = tabStore((state) => state.events);
  const selectedEventId = tabStore((state) => state.selectedEventId);
  const expandedEventIds = tabStore((state) => state.expandedEventIds);
  
  const addEvent = tabStore((state) => state.addEvent);
  const setSelectedEvent = tabStore((state) => state.setSelectedEvent);
  const toggleEventExpanded = tabStore((state) => state.toggleEventExpanded);

  return (
    <div>
      <h2>Events for Tab {tabId}</h2>
      <ul>
        {events.map((event) => {
          const isSelected = selectedEventId === event.id;
          const isExpanded = expandedEventIds.has(event.id);
          
          return (
            <li key={event.id}>
              <div
                onClick={() => setSelectedEvent(event.id)}
                style={{
                  backgroundColor: isSelected ? 'yellow' : 'white',
                  cursor: 'pointer',
                }}
              >
                {event.name} - {event.type}
              </div>
              <button onClick={() => toggleEventExpanded(event.id)}>
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
              {isExpanded && (
                <pre>{JSON.stringify(event.properties, null, 2)}</pre>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
*/

// ============================================================================
// Example 4: Using Tab Store in Content Script
// ============================================================================

/*
import { getTabStore } from '@src/stores';
import { useConfigStore } from '@src/stores';
import Browser from 'webextension-polyfill';

// Listen for Segment events from the page
window.addEventListener('message', async (event) => {
  if (event.data.type === 'SEGMENT_EVENT') {
    // Get current tab ID
    const tabs = await Browser.tabs.query({ active: true, currentWindow: true });
    const tabId = tabs[0]?.id;
    
    if (!tabId) return;

    // Get config for max events
    const maxEvents = useConfigStore.getState().maxEvents;
    
    // Get tab store and add event
    const tabStore = getTabStore(tabId, maxEvents);
    tabStore.getState().addEvent({
      id: `event-${Date.now()}`,
      type: event.data.eventType,
      name: event.data.eventName,
      properties: event.data.properties,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }
});
*/

// ============================================================================
// Example 5: Cleanup Tab Stores When Tabs Close
// ============================================================================

/*
import { removeTabStore, cleanupTabStorage } from '@src/stores';
import Browser from 'webextension-polyfill';

// Remove store when tab closes
Browser.tabs.onRemoved.addListener((tabId) => {
  removeTabStore(tabId);
});

// Periodically clean up stale storage entries
setInterval(async () => {
  await cleanupTabStorage();
}, 60000); // Every minute
*/

// ============================================================================
// Example 6: Understanding Selected vs Expanded Events
// ============================================================================

/*
import { getTabStore } from '@src/stores';

// Key difference:
// - setSelectedEvent: Selects ONE event for detail panel (only one can be selected)
// - toggleEventExpanded: Expands/collapses events in list (multiple can be expanded)

function EventList({ tabId }: { tabId: number }) {
  const tabStore = getTabStore(tabId);
  
  const events = tabStore((state) => state.events);
  const selectedEventId = tabStore((state) => state.selectedEventId);
  const expandedEventIds = tabStore((state) => state.expandedEventIds);
  
  const setSelectedEvent = tabStore((state) => state.setSelectedEvent);
  const toggleEventExpanded = tabStore((state) => state.toggleEventExpanded);

  // In list view: use toggleEventExpanded to show/hide details inline
  // Multiple events can be expanded at once
  const handleExpandClick = (eventId: string) => {
    toggleEventExpanded(eventId);
  };

  // For detail panel: use setSelectedEvent to show full details
  // Only one event can be selected at a time
  const handleSelectClick = (eventId: string) => {
    setSelectedEvent(eventId);
  };

  // Example: Check if event is expanded (for list view)
  const isEventExpanded = (eventId: string) => {
    return expandedEventIds.has(eventId);
  };

  // Example: Check if event is selected (for detail panel)
  const isEventSelected = (eventId: string) => {
    return selectedEventId === eventId;
  };

  return null; // Component implementation
}
*/

