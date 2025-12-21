---
name: Performance Optimizations
overview: Add search debouncing, memoize components to prevent unnecessary re-renders, and consolidate component state.
todos:
  - id: create-debounce-hook
    content: Create useDebounce hook in src/hooks/
    status: completed
  - id: add-search-debounce
    content: Implement debounced search in Panel.tsx (200-300ms)
    status: completed
  - id: memo-event-row
    content: Add React.memo to EventRow component
    status: completed
  - id: memo-event-row-header
    content: Add React.memo to EventRowHeader component
    status: completed
  - id: memo-property-row
    content: Add React.memo with custom comparator to PropertyRow
    status: completed
  - id: consolidate-property-state
    content: Consolidate PropertyRow useState calls into single state object
    status: completed
---

# Performance Optimizations

## Problem

Several performance issues exist that become noticeable with large event lists:

1. Search triggers immediate full-object traversal on every keystroke
2. Components re-render unnecessarily due to missing memoization
3. PropertyRow has multiple useState calls that could be consolidated

---

## 1. Search Lacks Debouncing

### Current State

[`Panel.tsx`](src/pages/devtools/Panel.tsx) handles search immediately:

```typescript
const handleSearchChange = useCallback((query: string) => {
  setSearchQuery(query);  // Triggers immediately
}, [setSearchQuery]);
```

The search in [`search.ts`](src/lib/search.ts) recursively traverses entire event objects:

```typescript
function searchInObject(obj: unknown, searchValue: string): boolean {
  // Recursively searches all keys and values
}
```

With 500 events containing nested properties, this is expensive on every keystroke.

### Solution

Add debouncing to the search input:

```typescript
// src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

Usage in Panel:

```typescript
const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebounce(searchInput, 200);

// Use debouncedSearch for filtering, searchInput for display
const searchMatch = useMemo(
  () => parseSearchQuery(debouncedSearch), 
  [debouncedSearch]
);
```

---

## 2. Missing Component Memoization

### Current State

Event list components re-render on every parent update:

- `EventRow` - renders for each event, no memo
- `EventRowHeader` - renders inside EventRow, no memo
- `PropertyRow` - nested property rendering, no memo

### Solution

Add `React.memo` with proper comparison:

```typescript
// EventRow.tsx
export const EventRow = React.memo(function EventRow({ 
  event, 
  isSelected, 
  isExpanded,
  ...props
}: EventRowProps) {
  // ... component body
});

// EventRowHeader.tsx  
export const EventRowHeader = React.memo(function EventRowHeader({
  event,
  isExpanded,
  ...props
}: EventRowHeaderProps) {
  // ... component body
});
```

For PropertyRow, add custom comparison to avoid deep object comparison:

```typescript
export const PropertyRow = React.memo(
  function PropertyRow({ ... }: PropertyRowProps) {
    // ... component body
  },
  (prevProps, nextProps) => {
    return (
      prevProps.label === nextProps.label &&
      prevProps.searchQuery === nextProps.searchQuery &&
      prevProps.isPinned === nextProps.isPinned &&
      prevProps.isNested === nextProps.isNested &&
      prevProps.depth === nextProps.depth &&
      // For value, compare by reference (parent should memoize)
      prevProps.value === nextProps.value
    );
  }
);
```

---

## 3. PropertyRow State Consolidation

### Current State

[`PropertyRow.tsx`](src/pages/devtools/components/detail/PropertyRow.tsx) has 4 separate useState calls:

```typescript
const [isExpanded, setIsExpanded] = useState(false);
const [copied, setCopied] = useState(false);
const [useJsonView, setUseJsonView] = useState(false);
const [visibleChunks, setVisibleChunks] = useState<Set<number>>(new Set([0]));
```



### Solution

Consolidate into a single state object:

```typescript
interface PropertyRowState {
  isExpanded: boolean;
  copied: boolean;
  useJsonView: boolean;
  visibleChunks: Set<number>;
}

const [state, setState] = useState<PropertyRowState>({
  isExpanded: false,
  copied: false,
  useJsonView: false,
  visibleChunks: new Set([0]),
});

// Helper for partial updates
const updateState = useCallback((partial: Partial<PropertyRowState>) => {
  setState(prev => ({ ...prev, ...partial }));
}, []);
```

Or use `useReducer` for more complex state logic:

```typescript
type Action = 
  | { type: 'TOGGLE_EXPAND' }
  | { type: 'SET_COPIED'; value: boolean }
  | { type: 'TOGGLE_JSON_VIEW' }
  | { type: 'TOGGLE_CHUNK'; index: number }
  | { type: 'SHOW_ALL_CHUNKS'; count: number }
  | { type: 'RESET' };

const [state, dispatch] = useReducer(propertyRowReducer, initialState);
```

---

## 4. Callback Memoization in EventList

### Current State

[`EventList.tsx`](src/pages/devtools/components/EventList.tsx) has `handleToggleExpand` defined inside the component but depends on state that changes:

```typescript
const handleToggleExpand = (id: string) => {
  const wasExpanded = expandedEventIds.has(id);
  // ... complex logic
};
```



### Solution

This is already using `useCallback` patterns appropriately, but ensure all callbacks passed to child components are memoized and don't change reference unnecessarily.---

## Files to Create

| File | Purpose ||------|---------|| `src/hooks/useDebounce.ts` | Debounce hook for search |

## Files to Modify

| File | Changes ||------|---------|| `src/pages/devtools/Panel.tsx` | Use debounced search || `src/pages/devtools/components/EventRow.tsx` | Add React.memo || `src/pages/devtools/components/EventRowHeader.tsx` | Add React.memo || `src/pages/devtools/components/detail/PropertyRow.tsx` | Add React.memo, consolidate state |---

## Expected Impact