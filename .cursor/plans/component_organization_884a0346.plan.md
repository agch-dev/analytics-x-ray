---
name: Component Organization
overview: Add consistent barrel exports across the codebase and reorganize the detail components folder for better maintainability.
todos:
  - id: create-hooks-barrel
    content: Create src/hooks/index.ts with all hook exports
    status: pending
  - id: create-lib-barrel
    content: Create src/lib/index.ts with utility exports
    status: pending
  - id: create-components-barrel
    content: Create src/components/index.ts barrel export
    status: pending
  - id: create-ui-barrel
    content: Create src/components/ui/index.ts with all UI component exports
    status: pending
  - id: create-sections-folder
    content: Create detail/sections/ folder and move section components
    status: pending
  - id: create-primitives-folder
    content: Create detail/primitives/ folder and move primitive components
    status: pending
  - id: update-detail-barrel
    content: Update detail/index.ts for new folder structure
    status: pending
  - id: update-imports
    content: Update all imports across codebase to use new barrel exports
    status: pending
---

# Component Organization

## Problem

The codebase has inconsistent organization patterns that make imports verbose and navigation confusing.---

## 1. Inconsistent Barrel Exports

### Current State

Some folders have `index.ts` re-exports, others don't:| Folder | Has index.ts | Example Import ||--------|--------------|----------------|| `src/pages/devtools/components/` | Yes | `import { Header } from './components'` || `src/pages/devtools/components/detail/` | Yes | `import { EventDetailView } from './detail'` || `src/hooks/` | No | `import { usePinnedProperties } from '@src/hooks/usePinnedProperties'` || `src/lib/` | No | `import { cn } from '@src/lib/utils'` || `src/components/` | No | `import { Logo } from '@src/components/Logo'` || `src/stores/` | Yes | `import { useConfigStore } from '@src/stores'` |

### Solution

Add barrel exports to missing folders:

```typescript
// src/hooks/index.ts
export { usePinnedProperties, sortWithPinnedFirst } from './usePinnedProperties';
export { useTheme } from './useTheme';
// After performance plan: export { useDebounce } from './useDebounce';
```



```typescript
// src/lib/index.ts
export { cn, isDevMode, copyToClipboard, normalizeEventNameForFilter } from './utils';
export { createContextLogger, logger } from './logger';
export { parseSearchQuery, eventMatchesSearch, highlightText } from './search';
export { getJsonViewTheme, getValueTypeColor } from './jsonViewTheme';
// ... other exports
```



```typescript
// src/components/index.ts
export { Logo } from './Logo';
export { ChunkedArrayView } from './ChunkedArrayView';
export { JsonViewWithChunking } from './JsonViewWithChunking';
// Re-export UI components
export * from './ui';
```

---

## 2. Deep Detail Components Nesting

### Current State

The `detail/` folder has 12 files at the same level:

```javascript
src/pages/devtools/components/detail/
├── CollapsibleSubsection.tsx
├── ContextSection.tsx
├── EventDetailSection.tsx
├── EventDetailView.tsx
├── index.ts
├── MiscSection.tsx
├── PinnableSection.tsx
├── PropertiesSection.tsx
├── PropertyList.tsx
├── PropertyRow.tsx
├── SubsectionGroup.tsx
└── TraitsSection.tsx
```

It's not immediately clear which are "section" components vs primitives vs containers.

### Proposed Structure

```javascript
src/pages/devtools/components/detail/
├── sections/                    # Top-level event detail sections
│   ├── PropertiesSection.tsx
│   ├── TraitsSection.tsx
│   ├── ContextSection.tsx
│   ├── MiscSection.tsx
│   └── index.ts
├── primitives/                  # Reusable building blocks
│   ├── PropertyRow.tsx
│   ├── PropertyList.tsx
│   ├── CollapsibleSubsection.tsx
│   └── index.ts
├── EventDetailView.tsx          # Main container
├── EventDetailSection.tsx       # Section wrapper
├── PinnableSection.tsx          # Section with pinning
├── SubsectionGroup.tsx          # Groups subsections
└── index.ts                     # Barrel export
```



### Updated Barrel Exports

```typescript
// src/pages/devtools/components/detail/index.ts
export { EventDetailView } from './EventDetailView';
export { EventDetailSection } from './EventDetailSection';
export { PinnableSection } from './PinnableSection';
export { SubsectionGroup } from './SubsectionGroup';

// Re-export sections
export * from './sections';

// Re-export primitives for direct use if needed
export * from './primitives';
```



```typescript
// src/pages/devtools/components/detail/sections/index.ts
export { PropertiesSection } from './PropertiesSection';
export { TraitsSection } from './TraitsSection';
export { ContextSection } from './ContextSection';
export { MiscSection } from './MiscSection';
```



```typescript
// src/pages/devtools/components/detail/primitives/index.ts
export { PropertyRow } from './PropertyRow';
export { PropertyList, PinnedPropertyList } from './PropertyList';
export { CollapsibleSubsection } from './CollapsibleSubsection';
```

---

## 3. UI Components Organization

### Current State

```javascript
src/components/ui/
├── badge.tsx
├── button.tsx
├── card.tsx
├── dropdown-menu.tsx
├── input.tsx
├── label.tsx
├── select.tsx
└── switch.tsx
```

No barrel export - each must be imported individually.

### Solution

```typescript
// src/components/ui/index.ts
export { Badge } from './badge';
export { Button, buttonVariants } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './dropdown-menu';
export { Input } from './input';
export { Label } from './label';
export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
export { Switch } from './switch';
```

---

## Files to Create

| File | Purpose ||------|---------|| `src/hooks/index.ts` | Hooks barrel export || `src/lib/index.ts` | Library utilities barrel export || `src/components/index.ts` | Components barrel export || `src/components/ui/index.ts` | UI components barrel export || `src/pages/devtools/components/detail/sections/index.ts` | Sections barrel || `src/pages/devtools/components/detail/primitives/index.ts` | Primitives barrel |

## Files to Move

| From | To ||------|-----|| `detail/PropertiesSection.tsx` | `detail/sections/PropertiesSection.tsx` || `detail/TraitsSection.tsx` | `detail/sections/TraitsSection.tsx` || `detail/ContextSection.tsx` | `detail/sections/ContextSection.tsx` || `detail/MiscSection.tsx` | `detail/sections/MiscSection.tsx` || `detail/PropertyRow.tsx` | `detail/primitives/PropertyRow.tsx` || `detail/PropertyList.tsx` | `detail/primitives/PropertyList.tsx` || `detail/CollapsibleSubsection.tsx` | `detail/primitives/CollapsibleSubsection.tsx` |

## Files to Modify

| File | Changes ||------|---------|| `src/pages/devtools/components/detail/index.ts` | Update exports for new structure || All files importing from detail/ | Update import paths |---