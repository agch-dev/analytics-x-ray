---
name: State of the Art Codebase Improvements
overview: Comprehensive plan to modernize the analytics-x-ray codebase focusing on file size reduction, dead code removal, testing infrastructure, documentation, and additional improvements in accessibility, security, code organization, error handling, and type safety.
todos:
  - id: refactor-background
    content: "Refactor background script (818 lines) into focused modules: handlers, utils, and main orchestration"
    status: completed
  - id: refactor-config-store
    content: Extract domain management from configStore (566 lines) into separate domainStore module
    status: completed
  - id: refactor-event-list
    content: Extract virtualization logic from EventList (490 lines) into custom hooks
    status: completed
  - id: refactor-panel
    content: Extract domain tracking logic from Panel (482 lines) into useDomainTracking hook
    status: completed
  - id: refactor-property-row
    content: Split PropertyRow (436 lines) into smaller focused components
    status: pending
  - id: refactor-storage
    content: Split storage.ts (401 lines) into focused modules by concern
    status: pending
  - id: remove-content-script
    content: Remove or repurpose content script placeholder
    status: pending
  - id: remove-throttle-setting
    content: Remove unused throttleMs setting or implement actual throttling
    status: pending
  - id: setup-vitest
    content: Set up Vitest testing framework with configuration and test scripts
    status: pending
  - id: test-segment-parsing
    content: Add unit tests for segment.ts parsing logic (90%+ coverage)
    status: pending
    dependencies:
      - setup-vitest
  - id: test-search-logic
    content: Add unit tests for search.ts functionality
    status: pending
    dependencies:
      - setup-vitest
  - id: test-event-buckets
    content: Add unit tests for eventBuckets.ts categorization
    status: pending
    dependencies:
      - setup-vitest
  - id: test-domain-utils
    content: Add unit tests for domain.ts utilities
    status: pending
    dependencies:
      - setup-vitest
  - id: test-stores
    content: Add unit tests for configStore and tabStore
    status: pending
    dependencies:
      - setup-vitest
  - id: test-components
    content: Add component tests for critical UI components
    status: pending
    dependencies:
      - setup-vitest
  - id: api-documentation
    content: Create API documentation for public interfaces and utilities
    status: pending
  - id: architecture-docs
    content: Create architecture documentation with data flow diagrams
    status: pending
  - id: component-docs
    content: Create component documentation with usage examples
    status: pending
  - id: jsdoc-comments
    content: Add JSDoc comments to all exported functions and complex logic
    status: pending
  - id: barrel-exports
    content: Create barrel exports (index.ts) for lib, hooks, components, stores
    status: pending
  - id: folder-structure
    content: Reorganize folder structure for better code organization
    status: pending
  - id: error-boundaries
    content: Add error boundaries around Panel, EventList, and EventDetailView
    status: pending
  - id: error-messages
    content: Improve error messages with user-friendly text and recovery suggestions
    status: pending
  - id: strict-typescript
    content: Enable strict TypeScript checks and remove all any types
    status: pending
  - id: type-guards
    content: Add comprehensive type guards for messages, events, and storage
    status: pending
  - id: aria-labels
    content: Add ARIA labels to all interactive elements
    status: pending
  - id: keyboard-navigation
    content: Improve keyboard navigation and focus management
    status: pending
  - id: input-validation
    content: Add input validation for domain inputs and search queries
    status: pending
  - id: xss-prevention
    content: Review and secure JSON viewer and event property rendering
    status: pending
  - id: eslint-config
    content: Create ESLint configuration with import ordering and React rules
    status: pending
  - id: production-logging
    content: Disable debug logging in production builds via __DEV_MODE__
    status: pending
  - id: code-duplication
    content: Remove code duplication (ActionButtons, shared types, utilities)
    status: pending
---

# State of the Art Codebase Improvements

## Overview

This plan addresses code quality, maintainability, and best practices across the analytics-x-ray codebase. The improvements are organized by priority and impact.

## 1. Large File Refactoring

### 1.1 Background Script (`src/pages/background/index.ts` - 818 lines)

**Problem**: The background script handles too many responsibilities in a single file.

**Solution**: Split into focused modules:

- **`src/pages/background/handlers/`**
- `webRequestHandler.ts` - Request interception logic
- `messageHandler.ts` - Runtime message handling
- `domainHandler.ts` - Domain tracking and allowlist logic
- `reloadHandler.ts` - Page reload detection
- `storageHandler.ts` - Event storage operations

- **`src/pages/background/utils/`**
- `eventStorage.ts` - Event storage utilities
- `domainTracking.ts` - Domain tracking utilities
- `cleanup.ts` - Storage cleanup utilities

- **`src/pages/background/index.ts`** - Main initialization and orchestration (~150 lines)

### 1.2 Config Store (`src/stores/configStore.ts` - 566 lines)

**Problem**: Single file contains all configuration logic with complex domain management.

**Solution**: Extract domain management into separate module:

- **`src/stores/domainStore.ts`** - Domain allowlist/denylist logic (~200 lines)
- **`src/stores/configStore.ts`** - Core config (theme, maxEvents, pinned properties) (~366 lines)

### 1.3 EventList Component (`src/pages/devtools/components/EventList.tsx` - 490 lines)

**Problem**: Complex virtualization logic mixed with rendering.

**Solution**: Extract virtualization logic:

- **`src/pages/devtools/components/EventList/`**
- `EventList.tsx` - Main component (~200 lines)
- `useVirtualization.ts` - Virtualization hook (~150 lines)
- `useStickyHeader.ts` - Sticky header logic (~100 lines)
- `types.ts` - Shared types

### 1.4 Panel Component (`src/pages/devtools/Panel.tsx` - 482 lines)

**Problem**: Complex domain checking and auto-allowing logic embedded in component.

**Solution**: Extract domain management logic:

- **`src/pages/devtools/hooks/useDomainTracking.ts`** - Domain checking and auto-allowing (~150 lines)
- **`src/pages/devtools/Panel.tsx`** - Simplified component (~332 lines)

### 1.5 PropertyRow Component (`src/pages/devtools/components/detail/primitives/PropertyRow.tsx` - 436 lines)

**Problem**: Complex rendering logic for property display.

**Solution**: Split into smaller components:

- **`src/pages/devtools/components/detail/primitives/PropertyRow/`**
- `PropertyRow.tsx` - Main component (~150 lines)
- `PropertyValue.tsx` - Value rendering (~100 lines)
- `PropertyActions.tsx` - Pin/copy actions (~100 lines)
- `types.ts` - Types

### 1.6 Storage Utilities (`src/lib/storage.ts` - 401 lines)

**Problem**: Multiple storage concerns in one file.

**Solution**: Split by concern:

- **`src/lib/storage/`**
- `index.ts` - Main exports
- `chromeStorage.ts` - Chrome storage adapter
- `tabStorage.ts` - Tab-specific storage
- `cleanup.ts` - Cleanup utilities
- `monitoring.ts` - Storage size monitoring

## 2. Dead Code Removal

### 2.1 Content Script Placeholder

**File**: `src/pages/content/index.tsx`

**Action**: Remove entirely or repurpose for future features:

- Remove from manifest if not needed
- If keeping for future, add clear TODO comment explaining intended use

### 2.2 Unused throttleMs Setting

**Files**:

- `src/stores/configStore.ts` (if exists)
- `src/pages/options/Options.tsx` (if UI exists)

**Action**: Remove from config store and options UI, or implement actual throttling in `useEventSync.ts`

### 2.3 Unused Imports and Variables

**Action**: Run automated analysis to find:

- Unused imports
- Unused variables
- Unused functions
- Dead code paths

## 3. Testing Infrastructure

### 3.1 Setup Vitest

**Files to create**:

- `vitest.config.ts` - Vitest configuration with path aliases
- Update `package.json` with test scripts

**Dependencies**:

- `vitest`
- `@vitest/coverage-v8`
- `@vitest/ui` (optional)
- `jsdom` (for DOM testing)
- `@testing-library/react` (for component tests)

### 3.2 Unit Tests (Priority Order)

1. **`src/lib/segment.test.ts`** - Event parsing logic

- `detectProvider()`
- `decodeRequestBody()`
- `parseSegmentPayload()`
- `isValidBatchEvent()`
- `getEventName()`
- `normalizeEvent()`
- `processBatchPayload()`

2. **`src/lib/search.test.ts`** - Search functionality

- `parseSearchQuery()`
- `eventMatchesSearch()`
- `highlightText()`

3. **`src/lib/eventBuckets.test.ts`** - Event categorization

- `categorizeEvent()`
- `getBucketConfig()`
- `getBucketColor()`

4. **`src/lib/domain.test.ts`** - Domain utilities

- `extractDomain()`
- `normalizeDomain()`
- `isDomainAllowed()`
- `getBaseDomain()`

5. **`src/stores/configStore.test.ts`** - Config store

- Domain management actions
- Pinned properties
- Section defaults

6. **`src/stores/tabStore.test.ts`** - Tab store

- Event deduplication
- Max events limiting
- State management

### 3.3 Component Tests

1. **`src/components/ThemedJsonView.test.tsx`** - JSON viewer
2. **`src/components/HighlightedText.test.tsx`** - Text highlighting
3. **`src/pages/devtools/components/EventRow.test.tsx`** - Event row rendering

### 3.4 Integration Tests

- Event capture flow (background → panel)
- Domain allowlist flow
- Storage persistence

### 3.5 Test Coverage Goals

- **Critical paths**: 90%+ coverage
- **Utilities**: 85%+ coverage
- **Components**: 70%+ coverage
- **Stores**: 80%+ coverage

## 4. Documentation

### 4.1 API Documentation

**Files to create**:

- **`docs/API.md`** - Public API documentation
- Store APIs (configStore, tabStore)
- Utility functions
- Type definitions

### 4.2 Component Documentation

**Files to create**:

- **`docs/COMPONENTS.md`** - Component architecture
- Component hierarchy
- Props interfaces
- Usage examples

### 4.3 Architecture Documentation

**Files to create/update**:

- **`docs/ARCHITECTURE.md`** - System architecture
- Data flow diagrams
- Extension context communication
- Storage strategy
- Event capture flow

### 4.4 Code Comments

**Action**: Add JSDoc comments to:

- All exported functions
- Complex algorithms
- Type definitions
- Store actions

### 4.5 README Updates

**Update**: `README.md` with:

- Testing instructions
- Contributing guidelines
- Architecture overview
- Development workflow

## 5. Code Organization

### 5.1 Barrel Exports

**Create index files**:

- `src/lib/index.ts` - Export all utilities
- `src/hooks/index.ts` - Export all hooks (already exists, verify completeness)
- `src/components/index.ts` - Export all components (already exists, verify)
- `src/stores/index.ts` - Export all stores

### 5.2 Folder Structure Improvements

**Reorganize**:

- Move domain utilities to `src/lib/domain/` folder
- Group related utilities together
- Create `src/lib/parsing/` for segment parsing utilities

### 5.3 Import Organization

**Action**: Enforce consistent import order:

1. External dependencies
2. Internal modules (using path aliases)
3. Types
4. Relative imports

**Tool**: ESLint rule `import/order`

## 6. Error Handling

### 6.1 Error Boundaries

**Add error boundaries**:

- `src/pages/devtools/components/ErrorBoundary.tsx` (exists, verify coverage)
- Wrap Panel component
- Wrap EventList component
- Wrap EventDetailView component

### 6.2 Error Messages

**Improve error messages**:

- User-friendly error messages
- Error codes for debugging
- Error recovery suggestions

### 6.3 Error Logging

**Enhance error logging**:

- Structured error logging
- Error context capture
- Error reporting to console with stack traces

### 6.4 Async Error Handling

**Review and improve**:

- Promise error handling in background script
- Error handling in event capture
- Storage operation error handling

## 7. Type Safety

### 7.1 Strict TypeScript

**Enable strict checks**:

- `strict: true` in `tsconfig.json`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `strictFunctionTypes: true`

### 7.2 Type Guards

**Add type guards**:

- Message type guards (already exist, verify completeness)
- Event type guards
- Storage type guards

### 7.3 Remove `any` Types

**Action**: Audit and replace all `any` types:

- Use `unknown` where appropriate
- Create proper types
- Use type assertions only when necessary

### 7.4 Type Documentation

**Action**: Document complex types:

- Union types
- Generic types
- Utility types

## 8. Accessibility

### 8.1 ARIA Labels

**Add ARIA labels to**:

- Interactive buttons
- Form inputs
- Modal dialogs
- Collapsible sections

### 8.2 Keyboard Navigation

**Improve keyboard support**:

- Tab order
- Keyboard shortcuts
- Focus management
- Escape key handling in modals

### 8.3 Screen Reader Support

**Enhance screen reader support**:

- Descriptive labels
- Live regions for dynamic content
- Status announcements

### 8.4 Color Contrast

**Verify color contrast**:

- Text colors meet WCAG AA standards
- Interactive elements have sufficient contrast
- Focus indicators are visible

## 9. Security

### 9.1 Input Validation

**Add validation**:

- Domain input validation
- Search query sanitization
- Event payload validation

### 9.2 XSS Prevention

**Review and secure**:

- JSON viewer rendering
- Event property display
- User input rendering

### 9.3 Storage Security

**Review storage**:

- Sensitive data handling
- Storage quota management
- Data sanitization before storage

### 9.4 Content Security Policy

**Verify CSP compliance**:

- Extension manifest CSP
- Inline script prevention
- External resource loading

## 10. Additional Improvements

### 10.1 Performance Optimizations

**Add memoization**:

- `React.memo` for EventRow, EventRowHeader
- `useMemo` for expensive computations
- `useCallback` for event handlers

**Code splitting**:

- Lazy load Options page
- Lazy load heavy components

### 10.2 ESLint Configuration

**Create ESLint config**:

- `eslint.config.js` or `.eslintrc`
- Import ordering rules
- React hooks rules
- TypeScript rules

### 10.3 Production Logging

**Disable debug logging in production**:

- Update `src/lib/logger.ts` to respect `__DEV_MODE__`
- Remove emoji-heavy logging in production
- Structured logging format

### 10.4 Code Duplication

**Remove duplication**:

- Extract ActionButtons component from Header
- Shared message type definitions
- Common utility functions

## Implementation Priority

### Phase 1: Foundation (High Priority)

1. Testing infrastructure setup
2. Large file refactoring (background script, config store)
3. Dead code removal
4. Error boundaries

### Phase 2: Quality (Medium Priority)

5. Unit tests for critical paths
6. Documentation (API, architecture)
7. Type safety improvements
8. Code organization

### Phase 3: Polish (Lower Priority)

9. Accessibility improvements
10. Security enhancements
11. Performance optimizations
12. Remaining tests

## Success Metrics

- **File size**: No file over 400 lines
- **Test coverage**: 80%+ overall, 90%+ for critical paths
- **Type safety**: Zero `any` types, strict TypeScript enabled
- **Documentation**: All public APIs documented
- **Accessibility**: WCAG AA compliance
- **Code quality**: Zero ESLint errors, consistent code style