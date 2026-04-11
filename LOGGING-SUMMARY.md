# Logging Implementation Summary

## What Was Done

### 1. Created Centralized Logger (`src/lib/logger.ts`)

A powerful, colorized logging system with:

- **Multiple log levels**: debug, info, warn, error
- **Context tagging**: background, panel, devtools, storage, etc.
- **Colorized output**: Different colors for different contexts
- **Filtering**: Can filter by level and context
- **Grouping**: Collapse related logs
- **Timing**: Performance measurement

### 2. Added Logging to Background Script (`src/pages/background/index.ts`)

**Key logs added:**

- ✅ Service worker lifecycle (load, init)
- ✅ webRequest listener registration with endpoints
- ✅ Request interception (detailed flow with collapsible groups)
- ✅ Request body decoding
- ✅ Payload parsing
- ✅ Provider detection
- ✅ Event extraction
- ✅ Storage operations (memory + chrome.storage)
- ✅ Message broadcasting to listeners
- ✅ Message handling (GET_EVENTS, CLEAR_EVENTS, etc.)
- ✅ Storage restoration on startup

### 3. Created Event Sync Hook (`src/pages/devtools/hooks/useEventSync.ts`)

**This was the missing piece!** The panel wasn't syncing with background script.

The hook:

- Fetches initial events from background on mount
- Listens for `EVENTS_CAPTURED` messages
- Filters events by tab ID
- Adds events to Zustand store
- Comprehensive logging of the sync process

### 4. Updated DevTools Panel (`src/pages/devtools/Panel.tsx`)

- Added logging for mount/unmount
- Added `useEventSync` hook to sync with background
- Added clear handler that syncs with background storage
- Logs event count changes

### 5. Updated Tab Store (`src/stores/tabStore.ts`)

- Logs store creation/reuse
- Logs event additions
- Logs event clearing
- Logs store initialization

### 6. Updated DevTools Registration (`src/pages/devtools/index.tsx`)

- Logs panel creation
- Logs inspected tab ID
- Logs React rendering

## The Core Issue That Was Fixed

### Before

```
Background Script         DevTools Panel
     ↓                         ↓
Captures events          Opens empty panel
     ↓                         ↓
Stores in:               Stores in:
storage.local['events']  storage.local['tab-123']
     ↓                         ↓
Sends message            ❌ NOT LISTENING
     ↓                         ↓
❌ Nobody receives       Shows 0 events
```

### After

```
Background Script         DevTools Panel
     ↓                         ↓
Captures events          Opens panel
     ↓                    useEventSync starts
Stores in:                    ↓
storage.local['events']  ✅ Fetches initial events
     ↓                   ✅ Registers message listener
Sends message                 ↓
     ↓                   ✅ Receives message
✅ Message delivered ────────→ ✅ Adds to store
                              ✅ Shows events
```

## How to Test

### Step 1: Rebuild the Extension

```bash
yarn build:chrome
```

### Step 2: Reload Extension in Chrome

1. Go to `chrome://extensions/`
2. Find "Segment Analytics X-Ray"
3. Click reload button

### Step 3: Open Background Console

1. In `chrome://extensions/`
2. Find "Segment Analytics X-Ray"
3. Click "service worker" link (blue text)
4. Console will open showing background logs

**You should see:**

```
[segment-analytics-x-ray] [background] 🚀 Background service worker loaded
[segment-analytics-x-ray] [background] 🔧 Initializing background script...
[segment-analytics-x-ray] [background] 🔄 Restoring events from storage...
[segment-analytics-x-ray] [background] ✅ Restored X total events across Y tab(s)
[segment-analytics-x-ray] [background] 📡 webRequest listener registered for endpoints: Array(4) [ ... ]
[segment-analytics-x-ray] [background] ✅ Background script initialization complete
```

### Step 4: Navigate to a Site with Segment

Good test sites:

- segment.com
- Any site using Segment analytics (check Network tab for api.segment.io requests)

**Background console should show:**

```
[segment-analytics-x-ray] [background] 🎯 Request intercepted (tabId: 123)
  URL: https://api.segment.io/v1/t
  Body decoded (1234 chars)
  Provider: segment
[segment-analytics-x-ray] [background] ✅ Captured 2 event(s) from segment: (2) ["Page View", "Click"]
[segment-analytics-x-ray] [background] 💾 Stored 2 event(s) in memory (total: 2 for tab 123)
[segment-analytics-x-ray] [background] 💾 Persisted 2 event(s) to storage.local['events'][123]
[segment-analytics-x-ray] [background] 📤 Sending EVENTS_CAPTURED message (tabId: 123, 2 event(s))
```

### Step 5: Open DevTools Panel

1. Open Chrome DevTools (F12 or Cmd+Option+I)
2. Click "Segment Analytics X-Ray" tab
3. Panel should show events

### Step 6: Open Panel Console (DevTools within DevTools!)

1. With the Segment Analytics X-Ray panel open
2. Right-click anywhere in the panel
3. Click "Inspect"
4. OR: Press `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows) while panel is focused

**Panel console should show:**

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
[segment-analytics-x-ray] [panel] ✅ Received 2 initial events from background
[Table showing events]

[segment-analytics-x-ray] [storage] ➕ Adding event to store (tabId: 123): Page View track
[segment-analytics-x-ray] [storage]   Total events in store: 1
[segment-analytics-x-ray] [storage] ➕ Adding event to store (tabId: 123): Click track
[segment-analytics-x-ray] [storage]   Total events in store: 2
[segment-analytics-x-ray] [panel] 📊 Event count changed: 2
```

### Step 7: Trigger New Events

While watching BOTH consoles (background + panel):

1. Click around on the page
2. Navigate to different pages
3. Interact with the site

**Background should show:**

- `🎯 Request intercepted`
- `✅ Captured X event(s)`
- `📤 Sending message`

**Panel should show:**

- `📬 Received EVENTS_CAPTURED message`
- `✅ Adding X new event(s) to store`
- `📊 Event count changed`

## Debugging Checklist

If events don't show:

### ✅ Check 1: Background is Capturing

- [ ] Open background console
- [ ] Navigate to test page
- [ ] See `🎯 Request intercepted` logs?
- [ ] See `✅ Captured X event(s)` logs?

If NO → Check manifest permissions and webRequest setup

### ✅ Check 2: Background is Storing

- [ ] Background shows `💾 Stored X event(s)` ?
- [ ] Background shows `💾 Persisted X event(s)` ?

Run in background console:

```javascript
chrome.storage.local.get('events', console.log);
```

Should show events object.

### ✅ Check 3: Background is Sending Messages

- [ ] Background shows `📤 Sending EVENTS_CAPTURED message` ?
- [ ] Shows `✅ Message delivered` or `⚠️ No listeners` ?

If "No listeners" → Panel isn't open or didn't register listener

### ✅ Check 4: Panel is Listening

- [ ] Open panel console (inspect the panel)
- [ ] See `👂 Message listener registered` ?
- [ ] See `📬 Received EVENTS_CAPTURED message` ?

If NO → `useEventSync` hook may not be running

### ✅ Check 5: Panel is Fetching Initial Events

- [ ] Panel shows `📥 Fetching initial events` ?
- [ ] Shows `✅ Received X initial events` ?

If NO → Background message handler may not be responding

### ✅ Check 6: Tab IDs Match

- [ ] Background: `tabId: XXX` in logs
- [ ] Panel: `Inspected tab ID: XXX` matches?

If NO → Inspecting wrong tab or tab ID mismatch

### ✅ Check 7: Events Added to Store

- [ ] Storage shows `➕ Adding event to store` ?
- [ ] Shows `Total events in store: X` ?
- [ ] Panel shows `📊 Event count changed` ?

If NO → Store may not be connected to UI

## Common Issues

### Issue: Background shows "No listeners"

**Cause:** Panel isn't open or message listener not registered

**Fix:**

1. Make sure DevTools panel is open
2. Check panel console for `👂 Message listener registered`
3. If missing, `useEventSync` hook may not be running

### Issue: Tab IDs don't match

**Cause:** DevTools inspecting different tab than where events are captured

**Fix:**

1. Check background log: `tabId: XXX`
2. Check panel log: `Inspected tab ID: XXX`
3. Make sure you're inspecting the correct tab

### Issue: Events in background but not in panel

**Cause:** Message passing broken

**Fix:**

1. Check both consoles side-by-side
2. Verify message is sent (background)
3. Verify message is received (panel)
4. Check tab IDs match

## Files Changed

- ✅ `src/lib/logger.ts` - NEW (centralized logger)
- ✅ `src/pages/background/index.ts` - Enhanced logging
- ✅ `src/pages/devtools/hooks/useEventSync.ts` - NEW (sync hook)
- ✅ `src/pages/devtools/Panel.tsx` - Added useEventSync, logging
- ✅ `src/pages/devtools/index.tsx` - Added logging
- ✅ `src/stores/tabStore.ts` - Added logging
- ✅ `DEBUGGING.md` - NEW (debugging guide)

## Next Steps

1. **Build and reload** the extension
2. **Open both consoles** (background + panel)
3. **Navigate to a test site** with Segment
4. **Watch the logs** flow through both consoles
5. **Identify where the flow breaks** (if it does)
6. **Use the debugging guide** to troubleshoot

The logging will tell you exactly where the issue is! 🎯
