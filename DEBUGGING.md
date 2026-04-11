# Debugging Guide

## Overview

The extension now has comprehensive logging throughout all components. This guide explains the logging strategy and how to debug common issues.

## Logging Strategy

### Logger Architecture

All logging uses a centralized logger (`src/lib/logger.ts`) that provides:

- **Colorized output** - Different colors for different contexts
- **Log levels** - debug, info, warn, error
- **Context tagging** - Each module has its own logger context
- **Filtering** - Can filter by log level and context

### Log Contexts

| Context      | Color     | Purpose                                   |
| ------------ | --------- | ----------------------------------------- |
| `background` | 🔴 Red    | Background service worker (event capture) |
| `panel`      | 🔵 Cyan   | DevTools panel UI                         |
| `devtools`   | ⚪ Gray   | DevTools registration                     |
| `storage`    | 🟡 Yellow | Zustand store operations                  |
| `popup`      | 🔵 Blue   | Extension popup                           |
| `content`    | 🟢 Green  | Content script                            |
| `ui`         | 🟣 Purple | UI components                             |

### Key Logging Points

#### Background Script (`src/pages/background/index.ts`)

```
🚀 Background service worker loaded
📡 webRequest listener registered for endpoints
🔄 Restoring events from storage...
  ✅ Restored X events for tab Y
✅ Background script initialization complete

🎯 Request intercepted (tabId: X)
  URL: https://api.segment.io/...
  Body decoded (N chars)
  Provider: segment
  ✅ Captured X event(s) from segment: [event names]
💾 Stored X event(s) in memory (total: Y)
💾 Persisted X event(s) to storage.local['events'][Y]
📤 Sending EVENTS_CAPTURED message (tabId: X, N events)
  ✅ Message delivered successfully
  OR
  ⚠️ No listeners for message (panel may not be open)

📬 Received message: GET_EVENTS
📤 Responding with events for tab X
✅ Sent Y events for tab X
```

#### DevTools Panel (`src/pages/devtools/`)

```
🔧 DevTools script loading...
Inspected tab ID: X
✅ DevTools panel created successfully
✅ React app rendered

🎨 Panel mounted for tab X
Current event count in store: X

🔄 Setting up event sync for tab X
📥 Fetching initial events for tab X...
✅ Received X initial events from background
👂 Message listener registered

📬 Received EVENTS_CAPTURED message (tabId: X, events: N)
✅ Adding N new event(s) to store: [event names]

📊 Event count changed: X
```

#### Tab Store (`src/stores/tabStore.ts`)

```
🏗️ Creating new tab store for tab X (maxEvents: 500)
♻️ Reusing existing tab store for tab X

➕ Adding event to store (tabId: X): Event Name (track)
  Total events in store: N

🗑️ Clearing all events for tab X
```

## Debugging Common Issues

### Issue: No events showing in UI

**Check Console Logs in This Order:**

1. **Background Script Console** (Service Worker):

   ```
   chrome://extensions/ → Segment Analytics X-Ray → "service worker" link
   ```

   ✅ Should see:
   - `🚀 Background service worker loaded`
   - `📡 webRequest listener registered`
   - When visiting a page with Segment: `🎯 Request intercepted`
   - `✅ Captured X event(s)`
   - `💾 Stored X event(s)`
   - `📤 Sending EVENTS_CAPTURED message`

2. **DevTools Panel Console** (Open DevTools within DevTools):
   - Right-click in DevTools panel → Inspect
   - OR: `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows) while DevTools is focused

   ✅ Should see:
   - `🔧 DevTools script loading...`
   - `🎨 Panel mounted for tab X`
   - `🔄 Setting up event sync`
   - `✅ Received X initial events from background`
   - `📬 Received EVENTS_CAPTURED message`

### Debugging Flow

#### Step 1: Verify Background Script is Capturing

1. Open background service worker console
2. Navigate to a page with Segment (e.g., segment.com)
3. Look for `🎯 Request intercepted` logs
4. If you see them → Background is working ✅
5. If you don't see them:
   - Check if `📡 webRequest listener registered` shows correct endpoints
   - Check browser network tab for requests to `api.segment.io`
   - Verify manifest permissions are correct

#### Step 2: Verify Background Storage

In background console:

```javascript
// Check what's stored
chrome.storage.local.get('events', console.log);

// Should show:
// { events: { "123": [ ...array of events... ] } }
```

#### Step 3: Verify Panel Initialization

In DevTools panel console (inspect the DevTools panel):

```javascript
// Check if useEventSync is fetching events
// Look for: "📥 Fetching initial events"
// And: "✅ Received X initial events"
```

#### Step 4: Verify Message Passing

1. Keep both consoles open (background + panel)
2. Trigger a Segment event on the page
3. Background console should show:
   ```
   📤 Sending EVENTS_CAPTURED message
   ✅ Message delivered successfully
   ```
4. Panel console should show:
   ```
   📬 Received EVENTS_CAPTURED message
   ✅ Adding N new event(s) to store
   ```

### Common Issues & Solutions

#### 1. Background captures but panel doesn't receive

**Symptoms:**

- Background shows `✅ Captured X event(s)`
- Background shows `⚠️ No listeners for message`
- Panel doesn't update

**Solution:**

- Panel isn't registered to listen for messages
- Check if `useEventSync` hook is being used
- Check if panel console shows `👂 Message listener registered`

#### 2. Different tab IDs

**Symptoms:**

- Background shows events for tab ID `123`
- Panel shows it's listening for tab ID `456`

**Solution:**

- DevTools panel gets `Browser.devtools.inspectedWindow.tabId`
- Make sure you're inspecting the correct tab
- Check panel console: `Inspected tab ID: X`

#### 3. Storage mismatch

**Symptoms:**

- Background stores in `storage.local['events']`
- Panel stores in `storage.local['tab-123']`
- Events never sync

**Solution:**

- This is by design - two separate storage locations
- Background uses `events` for network capture persistence
- Panel uses `tab-X` for Zustand store persistence
- The `useEventSync` hook bridges them via messages

## Advanced Debugging

### Enable Only Specific Log Contexts

In any console:

```javascript
// Show only background logs
logger.configure({ enabledContexts: ['background'] });

// Show only panel and storage logs
logger.configure({ enabledContexts: ['panel', 'storage'] });

// Show all logs (default)
logger.configure({ enabledContexts: 'all' });
```

### Change Log Level

```javascript
// Only show warnings and errors
logger.configure({ minLevel: 'warn' });

// Show everything (default)
logger.configure({ minLevel: 'debug' });
```

### Inspect Store State

In panel console (inspect DevTools):

```javascript
// Get the tab store for current tab
const tabId = chrome.devtools.inspectedWindow.tabId;
const { getTabStore } = await import('/src/stores/tabStore.ts');
const useStore = getTabStore(tabId);

// Get current state
console.log(useStore.getState());

// Subscribe to changes
useStore.subscribe(console.log);
```

### Manually Trigger Event Fetch

In panel console:

```javascript
const tabId = chrome.devtools.inspectedWindow.tabId;
const events = await chrome.runtime.sendMessage({
  type: 'GET_EVENTS',
  tabId,
});
console.log('Events from background:', events);
```

## Testing the Fix

1. **Reload extension**:

   ```
   chrome://extensions/ → Reload button
   ```

2. **Open DevTools panel**:
   - Navigate to a test page
   - Open DevTools → Segment Analytics X-Ray tab

3. **Check both consoles**:
   - Background console: `chrome://extensions/` → service worker
   - Panel console: Right-click in panel → Inspect

4. **Trigger test events**:
   - Navigate to segment.com
   - Click around to trigger events
   - Watch logs in both consoles

5. **Expected flow**:
   ```
   [Background] 🎯 Request intercepted
   [Background] ✅ Captured 1 event(s)
   [Background] 💾 Stored events
   [Background] 📤 Sending message
   [Panel] 📬 Received message
   [Panel] ✅ Adding 1 event(s)
   [Panel] 📊 Event count changed: 1
   ```

## Log Examples

### Successful Event Capture

```
[segment-analytics-x-ray] [background] 🎯 Request intercepted (tabId: 123)
[segment-analytics-x-ray] [background]   URL: https://api.segment.io/v1/t
[segment-analytics-x-ray] [background]   Body decoded (1234 chars)
[segment-analytics-x-ray] [background]   Provider: segment
[segment-analytics-x-ray] [background] ✅ Captured 2 event(s) from segment: (2) ['Page View', 'Button Clicked']
[segment-analytics-x-ray] [background] 💾 Stored 2 event(s) in memory (total: 2 for tab 123)
[segment-analytics-x-ray] [background] 💾 Persisted 2 event(s) to storage.local['events'][123]
[segment-analytics-x-ray] [background] 📤 Sending EVENTS_CAPTURED message (tabId: 123, 2 event(s))
[segment-analytics-x-ray] [background] ✅ Message delivered successfully

[segment-analytics-x-ray] [panel] 📬 Received EVENTS_CAPTURED message (tabId: 123, events: 2)
[segment-analytics-x-ray] [panel] ✅ Adding 2 new event(s) to store: (2) ['Page View', 'Button Clicked']
[segment-analytics-x-ray] [storage] ➕ Adding event to store (tabId: 123): Page View track
[segment-analytics-x-ray] [storage]   Total events in store: 1
[segment-analytics-x-ray] [storage] ➕ Adding event to store (tabId: 123): Button Clicked track
[segment-analytics-x-ray] [storage]   Total events in store: 2
[segment-analytics-x-ray] [panel] 📊 Event count changed: 2
```

### Panel Opens With Existing Events

```
[segment-analytics-x-ray] [devtools] 🔧 DevTools script loading...
[segment-analytics-x-ray] [devtools] Inspected tab ID: 123
[segment-analytics-x-ray] [devtools] ✅ DevTools panel created successfully
[segment-analytics-x-ray] [devtools] ✅ React app rendered

[segment-analytics-x-ray] [storage] 🏗️ Creating new tab store for tab 123 (maxEvents: 500)
[segment-analytics-x-ray] [panel] 🎨 Panel mounted for tab 123
[segment-analytics-x-ray] [panel] Current event count in store: 0

[segment-analytics-x-ray] [panel] 🔄 Setting up event sync for tab 123
[segment-analytics-x-ray] [panel] 📥 Fetching initial events for tab 123...
[segment-analytics-x-ray] [panel] 👂 Message listener registered

[segment-analytics-x-ray] [background] 📬 Received message: GET_EVENTS Object { tabId: 123, sender: undefined }
[segment-analytics-x-ray] [background] 📤 Responding with events for tab 123
[segment-analytics-x-ray] [background] ✅ Sent 5 events for tab 123

[segment-analytics-x-ray] [panel] ✅ Received 5 initial events from background
[segment-analytics-x-ray] [panel] [Table with events]
[segment-analytics-x-ray] [storage] ➕ Adding event to store (tabId: 123): ...
[segment-analytics-x-ray] [panel] 📊 Event count changed: 5
```
