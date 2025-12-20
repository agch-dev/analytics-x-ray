# Quick Debug Reference Card

## 🚀 Quick Start

### 1. Build & Reload
```bash
yarn build:chrome
```
Then reload extension in `chrome://extensions/`

### 2. Open TWO Consoles

**Console 1: Background Script**
- Go to `chrome://extensions/`
- Click "service worker" under Analytics X-Ray

**Console 2: DevTools Panel**  
- Open DevTools → Analytics X-Ray tab
- Right-click in panel → Inspect

### 3. Navigate to Test Site
- segment.com (or any site with Segment)

### 4. Watch Logs Flow

## 📊 What You Should See

### Background Console (on page load)
```
🚀 Background service worker loaded
🔧 Initializing...
📡 webRequest listener registered
✅ Initialization complete

🎯 Request intercepted (tabId: 123)
✅ Captured 2 event(s): ["Page", "Click"]
💾 Stored events
📤 Sending message
✅ Message delivered
```

### Panel Console (when opened)
```
🔧 DevTools script loading...
Inspected tab ID: 123
🎨 Panel mounted

🔄 Setting up event sync
📥 Fetching initial events...
✅ Received 2 initial events
👂 Message listener registered

📬 Received EVENTS_CAPTURED message
✅ Adding 2 event(s)
📊 Event count changed: 2
```

## 🔍 Troubleshooting Flow Chart

```
No events in UI?
    ↓
    ├─→ Check Background Console
    │   ├─→ See "🎯 Request intercepted"?
    │   │   NO → webRequest not working (check permissions)
    │   │   YES ↓
    │   ├─→ See "✅ Captured X events"?
    │   │   NO → Parsing failed (check payload)
    │   │   YES ↓
    │   ├─→ See "📤 Sending message"?
    │   │   NO → Message sending failed
    │   │   YES ↓
    │   └─→ See "⚠️ No listeners"?
    │       YES → Panel not listening (go to Panel check)
    │       NO ↓
    │
    └─→ Check Panel Console
        ├─→ Panel open?
        │   NO → Open DevTools → Analytics X-Ray tab
        │   YES ↓
        ├─→ See "👂 Message listener registered"?
        │   NO → useEventSync not running
        │   YES ↓
        ├─→ See "📬 Received message"?
        │   NO → Message not delivered (check tab IDs)
        │   YES ↓
        └─→ See "✅ Adding X events"?
            NO → Store not updating (check Zustand)
            YES → Check UI render
```

## 🎯 Quick Checks

### Check if Background is Capturing
```javascript
// In background console
chrome.storage.local.get('events', console.log)
// Should show: { events: { "123": [...] } }
```

### Check Tab ID Match
```javascript
// Background console - look for logs with:
"tabId: 123"

// Panel console - look for:
"Inspected tab ID: 123"

// Must match!
```

### Check Panel Sync
```javascript
// Panel console
// Should see these in order:
"📥 Fetching initial events..."
"✅ Received X initial events"
"👂 Message listener registered"
```

### Manually Fetch Events
```javascript
// In panel console
const tabId = chrome.devtools.inspectedWindow.tabId;
const events = await chrome.runtime.sendMessage({
  type: 'GET_EVENTS',
  tabId
});
console.log('Events:', events);
```

## 🔧 Common Fixes

### Fix 1: Panel Shows "No listeners"
1. Make sure DevTools panel is actually open
2. Check panel console for errors
3. Verify `useEventSync` hook is running

### Fix 2: Tab IDs don't match
1. Close all DevTools windows
2. Reopen DevTools on the correct tab
3. Check logs again

### Fix 3: Events captured but not showing
1. Check both consoles side-by-side
2. Verify message flow:
   - Background: `📤 Sending message` + `✅ Message delivered`
   - Panel: `📬 Received message` + `✅ Adding events`
3. If message not received, reload extension

### Fix 4: Old events not loading
1. Panel should fetch on mount
2. Check for `📥 Fetching initial events`
3. If missing, `useEventSync` not running
4. Check Panel.tsx uses the hook

## 📝 Log Legend

| Icon | Meaning |
|------|---------|
| 🚀 | Startup/initialization |
| 🎯 | Event captured |
| ✅ | Success |
| ❌ | Error |
| ⚠️ | Warning |
| 📡 | Network listener |
| 💾 | Storage operation |
| 📤 | Sending message |
| 📬 | Received message |
| 📥 | Fetching data |
| 👂 | Listener registered |
| 🔄 | Sync/restore operation |
| 📊 | State change |
| 🎨 | UI operation |
| 🗑️ | Clear/delete |
| 🔧 | Configuration |
| ➕ | Add operation |

## 🎬 Expected Event Flow

```
1. User visits page with Segment
        ↓
2. [Background] 🎯 Request intercepted
        ↓
3. [Background] ✅ Captured events
        ↓
4. [Background] 💾 Stored in memory + storage.local['events']
        ↓
5. [Background] 📤 Sending EVENTS_CAPTURED message
        ↓
6. [Panel] 📬 Received EVENTS_CAPTURED message
        ↓
7. [Panel] ✅ Adding events to store
        ↓
8. [Store] ➕ Adding event to store
        ↓
9. [Panel] 📊 Event count changed
        ↓
10. 🎉 Events appear in UI!
```

## 🆘 Still Not Working?

1. **Reload everything:**
   - Reload extension in chrome://extensions/
   - Close and reopen DevTools
   - Reload the webpage

2. **Check manifest permissions:**
   ```json
   {
     "permissions": ["webRequest", "storage", "tabs"],
     "host_permissions": ["<all_urls>"]
   }
   ```

3. **Verify build output:**
   - Check `dist_chrome/` folder exists
   - Check `dist_chrome/manifest.json` is correct
   - Check source files were bundled

4. **Check for errors:**
   - Red errors in either console?
   - Failed to fetch/load resources?
   - Extension context invalidated?

5. **Fresh start:**
   ```bash
   # Clean build
   rm -rf dist_chrome/
   yarn build:chrome
   
   # Remove extension in Chrome
   # Re-add extension (Load unpacked → dist_chrome/)
   ```

## 💡 Pro Tips

- Keep both consoles visible side-by-side
- Use console filters: `-background` `-panel`
- Collapse log groups you don't need
- Check Network tab for Segment requests
- Use the table logs to see event details
- Tab IDs are the key - they must match!

---

**Read the full guide:** [DEBUGGING.md](./DEBUGGING.md)

