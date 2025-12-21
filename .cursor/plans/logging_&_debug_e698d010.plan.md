---
name: Logging & Debug
overview: Disable debug logging in production builds and optionally clean up emoji-heavy log formatting for better log parsing.
todos:
  - id: disable-prod-logging
    content: Update logger.ts default config to use __DEV_MODE__
    status: completed
  - id: gate-storage-logging
    content: Add __DEV_MODE__ check to logStorageSize function
    status: completed
  - id: verify-builds
    content: Test both dev and production builds for correct logging behavior
    status: completed
---

# Logging & Debug

## Problem

The logging system ships debug output to production users, cluttering their console and potentially exposing internal details.---

## 1. No Production Logging Control

### Current State

[`src/lib/logger.ts`](src/lib/logger.ts) initializes with debug enabled:

```typescript
class Logger {
  private config: LoggerConfig = {
    enabled: true,           // Always on
    minLevel: 'debug',       // All levels
    enabledContexts: 'all',  // All contexts
  };
  // ...
}
```

Every user sees logs like:

```javascript
[analytics-x-ray] [background] 🚀 Background service worker loaded
[analytics-x-ray] [panel] 🔄 Setting up event sync for tab 123
[analytics-x-ray] [storage] 📊 Storage Usage: 1.2 MB / 10 MB (12%)
```



### Solution

Tie logger config to build mode using `__DEV_MODE__`:

```typescript
// src/lib/logger.ts
class Logger {
  private config: LoggerConfig = {
    enabled: __DEV_MODE__,                    // Only in dev
    minLevel: __DEV_MODE__ ? 'debug' : 'error', // Only errors in prod
    enabledContexts: 'all',
  };
  // ...
}
```

Or for more granular control:

```typescript
class Logger {
  private config: LoggerConfig = {
    enabled: true,  // Keep enabled but filter by level
    minLevel: __DEV_MODE__ ? 'debug' : 'warn', // Warnings and errors in prod
    enabledContexts: 'all',
  };
  // ...
}
```

---

## 2. Emoji-Heavy Logging (Optional Cleanup)

### Current State

Logs throughout the codebase use emojis for visual distinction:

```typescript
// src/pages/background/index.ts
log.info('🚀 Background service worker loaded');
log.debug('📡 webRequest listener registered');
log.info('✅ Captured ${events.length} event(s)');
log.error('❌ Failed to persist events:', error);
```



### Considerations

**Pros of emojis:**

- Easy visual scanning in browser console
- Quick identification of log types

**Cons of emojis:**

- Harder to grep/parse logs programmatically
- Can cause encoding issues in some terminals
- Inconsistent appearance across platforms

### Options

**Option A: Keep emojis (dev only)**Since we're disabling logs in production anyway, emojis only affect developers.**Option B: Replace with prefixes**

```typescript
log.info('[INIT] Background service worker loaded');
log.debug('[NET] webRequest listener registered');
log.info('[OK] Captured ${events.length} event(s)');
log.error('[ERR] Failed to persist events:', error);
```

**Option C: Use log level indicators only**Let the logger prefix handle it, remove inline emojis:

```typescript
log.info('Background service worker loaded');
// Output: [analytics-x-ray] [background] INFO: Background service worker loaded
```



### Recommendation

**Keep emojis but disable in production (Option A)** - lowest effort, maintains dev experience.---

## 3. Storage Logging Cleanup

### Current State

[`src/lib/storage.ts`](src/lib/storage.ts) has detailed storage logging that always runs:

```typescript
export const logStorageSize = async (context: string = 'storage'): Promise<StorageSizeInfo> => {
  // Logs detailed breakdown with progress bars
  console.log(`  ${bar} ${item.formatted.padStart(10)} ...`);
};
```

This is called periodically from background and tabStore.

### Solution

Gate storage logging behind dev mode:

```typescript
export const logStorageSize = async (context: string = 'storage'): Promise<StorageSizeInfo> => {
  const info = await getStorageSizeInfo();
  
  // Only log in development
  if (!__DEV_MODE__) {
    return info;
  }
  
  // ... existing logging code
  return info;
};
```

---

## Files to Modify

| File | Changes ||------|---------|| `src/lib/logger.ts` | Add `__DEV_MODE__` check to default config || `src/lib/storage.ts` | Gate `logStorageSize` output behind dev mode |---

## Verification

After changes: