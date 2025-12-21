---
name: Dead Code Cleanup
overview: Remove placeholder content script and unused throttleMs configuration setting that add complexity without providing value.
todos:
  - id: evaluate-content-script
    content: Decide whether to remove or repurpose content script
    status: pending
  - id: handle-throttle-setting
    content: Either implement throttling in useEventSync or remove the setting entirely
    status: pending
---

# Dead Code Cleanup

## Problem

The codebase contains unused code that adds complexity and potential confusion:

1. **Content Script Placeholder** - [`src/pages/content/index.tsx`](src/pages/content/index.tsx) renders a debug banner but serves no functional purpose since event interception uses webRequest in the background script.
2. **Unused throttleMs Setting** - [`src/stores/configStore.ts`](src/stores/configStore.ts) exposes a `throttleMs` setting in the Options page, but it's never actually used anywhere.

---

## Tasks

### 1. Evaluate Content Script

The content script currently renders:

```tsx
<div className='absolute bottom-0 left-0 text-lg text-black bg-amber-400 z-50'>
  content script <span className='your-class'>loaded</span>
</div>
```

**Options:**

- **Remove entirely**: Delete the file and remove from manifest if no future features need it
- **Repurpose**: Keep empty for future page overlay features (e.g., visual event indicators)

### 2. Handle throttleMs Setting

The setting exists in:

- [`src/stores/configStore.ts`](src/stores/configStore.ts) - State definition
- [`src/pages/options/Options.tsx`](src/pages/options/Options.tsx) - UI for the setting

**Options:**

- **Implement throttling**: Add actual throttle logic in [`useEventSync.ts`](src/pages/devtools/hooks/useEventSync.ts) when adding events
- **Remove the setting**: Delete from config store and Options page

---

## Files to Modify