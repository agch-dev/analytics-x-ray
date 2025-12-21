---
name: Code Duplication Refactor
overview: "Extract duplicated code into reusable components: Header action buttons, search highlighting, and JsonView theming."
todos:
  - id: extract-action-buttons
    content: Create ActionButtons component and refactor Header.tsx
    status: completed
  - id: create-highlighted-text
    content: Create shared HighlightedText component in src/components/
    status: completed
  - id: create-themed-jsonview
    content: Create ThemedJsonView wrapper component with search highlighting support
    status: completed
  - id: update-consumers
    content: Update EventDetailView and PropertyRow to use new shared components
    status: completed
---

# Code Duplication Refactor

## Problem

Several patterns are duplicated across the codebase, making maintenance harder and increasing bundle size.---

## 1. Header Action Buttons Duplication

### Current State

[`src/pages/devtools/components/Header.tsx`](src/pages/devtools/components/Header.tsx) duplicates the same action buttons twice:

- Lines 61-110: Mobile view (`lg:hidden`)
- Lines 139-188: Desktop view (`hidden lg:flex`)

Both contain identical Filter, Clear, and Menu buttons with the same logic.

### Solution

Extract an `ActionButtons` component:

```tsx
// src/pages/devtools/components/ActionButtons.tsx
interface ActionButtonsProps {
  filteredEventNamesCount: number;
  isFilterPanelOpen: boolean;
  onClear: () => void;
  onToggleFilterPanel: () => void;
  onOpenSettings: () => void;
  className?: string;
}

export function ActionButtons({ ... }: ActionButtonsProps) {
  return (
    <div className={cn("flex items-center gap-1 sm:gap-2 shrink-0", className)}>
      {/* Filter, Clear, Menu buttons */}
    </div>
  );
}
```

Then use in Header:

```tsx
<ActionButtons className="lg:hidden" {...props} />
{/* ... search input ... */}
<ActionButtons className="hidden lg:flex" {...props} />
```

---

## 2. Search Highlighting Duplication

### Current State

Search match highlighting is implemented separately in:

- [`EventDetailView.tsx`](src/pages/devtools/components/detail/EventDetailView.tsx) - JsonView custom renderers (lines 89-186)
- [`PropertyRow.tsx`](src/pages/devtools/components/detail/PropertyRow.tsx) - `HighlightedText` component (lines 127-150)

### Solution

Create a shared highlighting component in `src/components/`:

```tsx
// src/components/HighlightedText.tsx
interface HighlightedTextProps {
  text: string;
  searchQuery?: string;
  className?: string;
}

export function HighlightedText({ text, searchQuery, className }: HighlightedTextProps) {
  if (!searchQuery) return <span className={className}>{text}</span>;
  
  const parts = highlightText(text, searchQuery);
  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.highlight ? (
          <mark key={i} className="bg-yellow-500/30 dark:bg-yellow-500/40 rounded px-0.5">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}
```

---

## 3. JsonView Theme Configuration Duplication

### Current State

The `getJsonViewTheme()` call with style overrides appears in:

- [`EventDetailView.tsx`](src/pages/devtools/components/detail/EventDetailView.tsx) lines 66-86
- [`PropertyRow.tsx`](src/pages/devtools/components/detail/PropertyRow.tsx) lines 351-362

### Solution

Create a wrapper component:

```tsx
// src/components/ThemedJsonView.tsx
interface ThemedJsonViewProps {
  value: unknown;
  searchQuery?: string;
  fontSize?: string;
  collapsed?: boolean;
}

export function ThemedJsonView({ 
  value, 
  searchQuery,
  fontSize = '12px',
  collapsed = false,
}: ThemedJsonViewProps) {
  // Encapsulate all the theme config, custom renderers, etc.
}
```

---

## Files to Create

| File | Purpose ||------|---------|| `src/pages/devtools/components/ActionButtons.tsx` | Extracted header buttons || `src/components/HighlightedText.tsx` | Shared search highlighting || `src/components/ThemedJsonView.tsx` | Configured JsonView wrapper |

## Files to Modify

| File | Changes ||------|---------|| `src/pages/devtools/components/Header.tsx` | Use ActionButtons component |