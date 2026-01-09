# Component Documentation

This document describes the React component architecture and usage patterns in the analytics-x-ray extension.

## Table of Contents

- [Component Hierarchy](#component-hierarchy)
- [Shared Components](#shared-components)
- [DevTools Panel Components](#devtools-panel-components)
- [Component Patterns](#component-patterns)
- [Usage Examples](#usage-examples)

## Component Hierarchy

```
Panel (Main Container)
├── Header
│   ├── Search Input
│   ├── Action Buttons
│   └── Filter Toggle
├── FilterPanel (Conditional)
│   ├── Event Name List
│   └── Show/Hide All Buttons
├── EventList (Virtualized)
│   ├── UrlDivider (Conditional)
│   └── EventRow (Multiple)
│       ├── EventRowHeader
│       └── EventDetailView (Conditional)
│           ├── PropertiesSection
│           ├── TraitsSection
│           ├── ContextSection
│           └── MiscSection
│               └── PinnableSection
│                   └── PropertyList
│                       └── PropertyRow
│                           ├── PropertyValue
│                           └── PropertyActions
├── ScrollToBottomButton (Conditional)
├── Footer
├── FeedbackModal (Conditional)
└── OnboardingSystem
    └── WelcomeOnboardingModal (Conditional)
```

## Shared Components

### ErrorBoundary

**Location:** `src/components/ErrorBoundary.tsx`

**Purpose:** Catches React errors and displays fallback UI

**Props:**
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  resetKeys?: unknown[];
}
```

**Usage:**
```tsx
<ErrorBoundary
  fallback={<EventListErrorState />}
  resetKeys={[filteredEvents.length]}
>
  <EventList {...props} />
</ErrorBoundary>
```

### ThemedJsonView

**Location:** `src/components/ThemedJsonView.tsx`

**Purpose:** Wrapper for JSON viewer with theme configuration and search highlighting

**Props:**
```typescript
interface ThemedJsonViewProps {
  value: unknown;
  searchQuery?: string;
  fontSize?: string;
  collapsed?: boolean;
  enableClipboard?: boolean;
  shouldExpandNodeInitially?: (isExpanded: boolean, context: {...}) => boolean;
}
```

**Usage:**
```tsx
<ThemedJsonView
  value={event}
  searchQuery={searchQuery}
  fontSize="12px"
  collapsed={false}
  enableClipboard={true}
/>
```

### HighlightedText

**Location:** `src/components/HighlightedText.tsx`

**Purpose:** Highlights matching text based on search query

**Props:**
```typescript
interface HighlightedTextProps {
  text: string;
  searchQuery?: string;
  className?: string;
}
```

**Usage:**
```tsx
<HighlightedText
  text={event.name}
  searchQuery={searchQuery}
  className="text-sm"
/>
```

### ErrorStates

**Location:** `src/components/ErrorStates.tsx`

**Purpose:** Predefined error state components

**Components:**
- `PanelErrorState` - Full panel error
- `EventListErrorState` - Event list error
- `EventDetailErrorState` - Event detail error

**Usage:**
```tsx
<ErrorBoundary fallback={<EventListErrorState />}>
  <EventList {...props} />
</ErrorBoundary>
```

## DevTools Panel Components

### Panel

**Location:** `src/pages/devtools/Panel.tsx`

**Purpose:** Main container component for DevTools panel

**Key Features:**
- Domain tracking and auto-allowing
- Event synchronization
- Search and filtering
- View mode management

**State Management:**
- Uses `getTabStore(tabId)` for tab-specific state
- Uses `useConfigStore` for global config
- Uses `useEventSync` hook for event synchronization

**Usage:**
```tsx
// Automatically rendered by DevTools
// No manual usage required
```

### Header

**Location:** `src/pages/devtools/components/Header.tsx`

**Purpose:** Panel header with search, actions, and filter toggle

**Props:**
```typescript
interface HeaderProps {
  eventCount: number;
  totalEventCount: number;
  maxEvents: number;
  filteredEventNamesCount: number;
  isFilterPanelOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  onToggleFilterPanel: () => void;
  onOpenFeedback: () => void;
}
```

**Usage:**
```tsx
<Header
  eventCount={filteredEvents.length}
  totalEventCount={events.length}
  maxEvents={maxEvents}
  filteredEventNamesCount={filteredEventNamesCount}
  isFilterPanelOpen={isFilterPanelOpen}
  searchQuery={searchInput}
  onSearchChange={handleSearchChange}
  onClear={handleClearEvents}
  onToggleFilterPanel={handleToggleFilterPanel}
  onOpenFeedback={() => setIsFeedbackModalOpen(true)}
/>
```

### EventList

**Location:** `src/pages/devtools/components/EventList/EventList.tsx`

**Purpose:** Virtualized list of events with sticky headers

**Props:**
```typescript
interface EventListProps {
  events: SegmentEvent[];
  reloadTimestamps: number[];
  selectedEventId: string | null;
  expandedEventIds: Set<string>;
  hiddenEventNames: Set<string>;
  searchMatch?: SearchMatch | null;
  viewMode: 'json' | 'structured';
  onSelectEvent: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onToggleHide?: (eventName: string) => void;
  onScrollStateChange?: (isAtBottom: boolean) => void;
  onViewModeChange: (mode: 'json' | 'structured') => void;
}
```

**Features:**
- Virtual scrolling with `@tanstack/react-virtual`
- Sticky headers for expanded events
- URL dividers for navigation/reloads
- Auto-scroll to bottom

**Usage:**
```tsx
<EventList
  ref={eventListRef}
  events={filteredEvents}
  reloadTimestamps={reloadTimestamps}
  selectedEventId={selectedEventId}
  expandedEventIds={expandedEventIds}
  hiddenEventNames={hiddenEventNames}
  searchMatch={searchMatch}
  viewMode={preferredViewMode}
  onSelectEvent={setSelectedEvent}
  onToggleExpand={toggleEventExpanded}
  onToggleHide={toggleEventNameVisibility}
  onScrollStateChange={setIsAtBottom}
  onViewModeChange={handleViewModeChange}
/>
```

### EventRow

**Location:** `src/pages/devtools/components/EventRow.tsx`

**Purpose:** Individual event row with expandable details

**Props:**
```typescript
interface EventRowProps {
  event: SegmentEvent;
  isSelected: boolean;
  isExpanded: boolean;
  isAnimatingCollapse?: boolean;
  isHidden?: boolean;
  searchMatch?: SearchMatch | null;
  viewMode: 'json' | 'structured';
  onToggleExpand: (id: string) => void;
  onToggleHide?: (eventName: string) => void;
  onViewModeChange: (mode: 'json' | 'structured') => void;
}
```

**Features:**
- Memoized for performance
- Error boundary for detail view
- Collapse animation

**Usage:**
```tsx
<EventRow
  event={event}
  isSelected={selectedEventId === event.id}
  isExpanded={expandedEventIds.has(event.id)}
  isHidden={hiddenEventNames.has(normalizedName)}
  searchMatch={searchMatch}
  viewMode={viewMode}
  onToggleExpand={toggleEventExpanded}
  onToggleHide={toggleEventNameVisibility}
  onViewModeChange={handleViewModeChange}
/>
```

### EventRowHeader

**Location:** `src/pages/devtools/components/EventRowHeader.tsx`

**Purpose:** Event row header with timestamp, name, and actions

**Props:**
```typescript
interface EventRowHeaderProps {
  event: SegmentEvent;
  isExpanded?: boolean;
  isSticky?: boolean;
  isHidden?: boolean;
  searchMatch?: SearchMatch | null;
  viewMode?: 'json' | 'structured';
  onToggleHide?: (eventName: string) => void;
  onViewModeChange?: (mode: 'json' | 'structured') => void;
}
```

**Features:**
- Event categorization with color coding
- Search highlighting
- View mode toggle (when expanded)
- Hide/show button

**Usage:**
```tsx
<EventRowHeader
  event={event}
  isExpanded={isExpanded}
  isSticky={isSticky}
  isHidden={isHidden}
  searchMatch={searchMatch}
  viewMode={viewMode}
  onToggleHide={onToggleHide}
  onViewModeChange={onViewModeChange}
/>
```

### EventDetailView

**Location:** `src/pages/devtools/components/detail/EventDetailView.tsx`

**Purpose:** Displays event details in JSON or structured view

**Props:**
```typescript
interface EventDetailViewProps {
  event: SegmentEvent;
  viewMode: 'json' | 'structured';
  searchQuery?: string;
}
```

**Features:**
- Two view modes: JSON and structured
- Search highlighting
- Section-based organization (structured view)

**Usage:**
```tsx
<EventDetailView
  event={event}
  viewMode={viewMode}
  searchQuery={searchQuery}
/>
```

### PropertiesSection

**Location:** `src/pages/devtools/components/detail/sections/PropertiesSection.tsx`

**Purpose:** Displays event properties in structured view

**Props:**
```typescript
interface PropertiesSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}
```

**Usage:**
```tsx
<PropertiesSection
  event={event}
  searchQuery={searchQuery}
/>
```

### ContextSection

**Location:** `src/pages/devtools/components/detail/sections/ContextSection.tsx`

**Purpose:** Displays event context in structured view

**Props:**
```typescript
interface ContextSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}
```

**Features:**
- Organized into subsections (page, library, browser, other)
- Collapsible subsections
- Pinnable properties

### FilterPanel

**Location:** `src/pages/devtools/components/FilterPanel.tsx`

**Purpose:** Side panel for filtering events by name

**Props:**
```typescript
interface FilterPanelProps {
  events: SegmentEvent[];
  hiddenEventNames: Set<string>;
  onToggleEventName: (eventName: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}
```

**Usage:**
```tsx
{isFilterPanelOpen && (
  <FilterPanel
    events={events}
    hiddenEventNames={hiddenEventNames}
    onToggleEventName={handleToggleEventName}
    onShowAll={handleShowAll}
    onHideAll={handleHideAll}
  />
)}
```

## Component Patterns

### Memoization

Components that receive frequently changing props are memoized:

```tsx
export const EventRow = React.memo(function EventRow({ ... }) {
  // Component implementation
});
```

### Error Boundaries

Critical components are wrapped in error boundaries:

```tsx
<ErrorBoundary
  fallback={<EventListErrorState />}
  resetKeys={[filteredEvents.length]}
>
  <EventList {...props} />
</ErrorBoundary>
```

### Virtualization

Large lists use virtualization for performance:

```tsx
const virtualizer = useVirtualizer({
  count: listItems.length,
  getScrollElement: () => scrollContainerRef.current,
  estimateSize: getEstimatedSize,
  overscan: 5,
});
```

### Custom Hooks

Complex logic is extracted into custom hooks:

```tsx
// Event synchronization
useEventSync({ tabId, addEvent });

// Domain tracking
const { domain, isAllowed } = useDomainTracking(tabId);

// Virtualization
const { virtualItems, scrollToBottom } = useVirtualization(...);
```

## Usage Examples

### Complete Panel Setup

```tsx
import { Panel } from '@pages/devtools/Panel';

// Panel is automatically rendered by DevTools
// No manual setup required
```

### Custom Event Display

```tsx
import { EventRow, EventRowHeader } from '@pages/devtools/components';
import type { SegmentEvent } from '@src/types/segment';

function CustomEventDisplay({ event }: { event: SegmentEvent }) {
  return (
    <div>
      <EventRowHeader event={event} />
      <EventDetailView
        event={event}
        viewMode="structured"
      />
    </div>
  );
}
```

### Using Error Boundaries

```tsx
import { ErrorBoundary, EventDetailErrorState } from '@src/components';

function SafeEventDetail({ event }: { event: SegmentEvent }) {
  return (
    <ErrorBoundary
      fallback={<EventDetailErrorState />}
      resetKeys={[event.id]}
    >
      <EventDetailView event={event} viewMode="json" />
    </ErrorBoundary>
  );
}
```

### Search Highlighting

```tsx
import { HighlightedText } from '@src/components';

function EventName({ name, searchQuery }: { name: string; searchQuery: string }) {
  return (
    <HighlightedText
      text={name}
      searchQuery={searchQuery}
      className="text-sm font-medium"
    />
  );
}
```

## Component Testing

Components are tested using Vitest and React Testing Library:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HighlightedText } from './HighlightedText';

describe('HighlightedText', () => {
  it('highlights matching text', () => {
    render(<HighlightedText text="Hello World" searchQuery="World" />);
    const mark = screen.getByText('World');
    expect(mark).toBeInTheDocument();
  });
});
```

## Best Practices

1. **Use memoization** for components that receive frequently changing props
2. **Wrap in error boundaries** for components that might fail
3. **Extract complex logic** into custom hooks
4. **Use virtualization** for large lists
5. **Follow prop naming conventions** (on* for callbacks, is* for booleans)
6. **Provide default props** where appropriate
7. **Use TypeScript** for all component props
8. **Document complex components** with JSDoc comments
