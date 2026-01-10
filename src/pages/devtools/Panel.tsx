import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Browser from 'webextension-polyfill';

import { ErrorBoundary, EventListErrorState } from '@src/components';
import { useDebounce } from '@src/hooks';
import {
  sanitizeSearchQuery,
  isValidSearchQuery,
} from '@src/lib/domain/validation';
import { createContextLogger } from '@src/lib/logger';
import { eventMatchesSearch, parseSearchQuery } from '@src/lib/search';
import { normalizeEventNameForFilter } from '@src/lib/utils';
import {
  getTabStore,
  useConfigStore,
  selectPreferredEventDetailView,
  selectMaxEvents,
} from '@src/stores';

import {
  Header,
  EventList,
  Footer,
  FilterPanel,
  ScrollToBottomButton,
  FeedbackModal,
  OnboardingSystem,
  WelcomeOnboardingModal,
  type EventListHandle,
} from './components';
import { useDomainTracking } from './hooks/useDomainTracking';
import { useEventSync } from './hooks/useEventSync';

const log = createContextLogger('panel');

// Get the inspected tab ID from DevTools API
const tabId = Browser.devtools.inspectedWindow.tabId;

export default function Panel() {
  const eventListRef = useRef<EventListHandle>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Domain tracking via hook
  const { domainAllowed } = useDomainTracking({ tabId });

  // Get preferred view mode from config store (used directly, not persisted per tab)
  const preferredViewMode = useConfigStore(selectPreferredEventDetailView);
  const setPreferredEventDetailView = useConfigStore(
    (state) => state.setPreferredEventDetailView
  );

  // Get maxEvents from config store to pass to tab store
  const maxEvents = useConfigStore(selectMaxEvents);

  // Initialize tab store with current maxEvents from config
  // Note: The store will read maxEvents dynamically from config store on each addEvent,
  // but we pass it here for initial setup and fallback
  const useTabStore = useMemo(() => getTabStore(tabId, maxEvents), [maxEvents]);

  // Trim events when maxEvents is reduced (apply instantly when user changes setting)
  useEffect(() => {
    const currentEvents = useTabStore.getState().events;
    if (currentEvents.length > maxEvents) {
      log.info(
        `✂️ Trimming events from ${currentEvents.length} to ${maxEvents} (maxEvents setting changed)`
      );
      useTabStore.setState({
        events: currentEvents.slice(0, maxEvents),
        lastUpdated: Date.now(),
      });
    }
  }, [maxEvents, useTabStore]);

  // Selectors - only subscribe to what we need
  const events = useTabStore((state) => state.events);
  const expandedEventIds = useTabStore((state) => state.expandedEventIds);
  const hiddenEventNames = useTabStore((state) => state.hiddenEventNames);
  const searchQuery = useTabStore((state) => state.searchQuery);
  const reloadTimestamps = useTabStore((state) => state.reloadTimestamps);
  const toggleEventExpanded = useTabStore((state) => state.toggleEventExpanded);
  const toggleEventNameVisibility = useTabStore(
    (state) => state.toggleEventNameVisibility
  );
  const showAllEventNames = useTabStore((state) => state.showAllEventNames);
  const hideAllEventNames = useTabStore((state) => state.hideAllEventNames);
  const setSearchQuery = useTabStore((state) => state.setSearchQuery);
  const clearEvents = useTabStore((state) => state.clearEvents);
  const addEvent = useTabStore((state) => state.addEvent);

  // Local state for immediate search input (for display)
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Ref to track the last debounced value we set to the store
  // This helps us distinguish between store changes from our debounce vs external changes
  const lastDebouncedValueRef = useRef<string>(searchQuery);

  // Debounce search input (250ms delay)
  const debouncedSearch = useDebounce(searchInput, 250);

  // Update store's searchQuery when debounced value changes
  useEffect(() => {
    if (debouncedSearch !== lastDebouncedValueRef.current) {
      lastDebouncedValueRef.current = debouncedSearch;
      setSearchQuery(debouncedSearch);
    }
  }, [debouncedSearch, setSearchQuery]);

  // Sync local searchInput with store's searchQuery when it changes externally
  // (e.g., when cleared from clearEvents, but not from our own debounced update)
  useEffect(() => {
    // Only sync if the store value differs from what we last set via debounce
    // This prevents feedback loops from our own debounced updates
    if (searchQuery !== lastDebouncedValueRef.current) {
      lastDebouncedValueRef.current = searchQuery;
      setSearchInput(searchQuery);
    }
  }, [searchQuery]);

  const handleSearchChange = useCallback((query: string) => {
    // Sanitize and validate search query
    const sanitized = sanitizeSearchQuery(query);
    if (isValidSearchQuery(sanitized)) {
      setSearchInput(sanitized); // Update immediately for display
    } else {
      // Query too long, truncate
      setSearchInput(sanitized.slice(0, 500));
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd+K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[type="text"][aria-label*="Search"]'
        ) as HTMLInputElement;
        searchInput?.focus();
      }

      // Escape to clear search (when search input is focused)
      if (e.key === 'Escape' && document.activeElement?.tagName === 'INPUT') {
        const activeInput = document.activeElement as HTMLInputElement;
        if (activeInput.getAttribute('aria-label')?.includes('Search')) {
          handleSearchChange('');
          activeInput.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSearchChange]);

  const handleViewModeChange = useCallback(
    (mode: 'json' | 'structured') => {
      // Update the global preference when user toggles view mode
      setPreferredEventDetailView(mode);
    },
    [setPreferredEventDetailView]
  );

  // Sync events with background script
  useEventSync({ tabId, addEvent });

  // Parse search query
  const searchMatch = useMemo(
    () => parseSearchQuery(searchQuery),
    [searchQuery]
  );

  // Filter events based on hidden event names and search query
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filter by hidden event names (using normalized names)
    if (hiddenEventNames.size > 0) {
      filtered = filtered.filter((event) => {
        const normalizedName = normalizeEventNameForFilter(
          event.name,
          event.type
        );
        return !hiddenEventNames.has(normalizedName);
      });
    }

    // Filter by search query
    if (searchMatch) {
      filtered = filtered.filter((event) =>
        eventMatchesSearch(event, searchMatch)
      );
    }

    return filtered;
  }, [events, hiddenEventNames, searchMatch]);

  // Get unique event names from current events for filter panel (normalized)
  const uniqueEventNames = useMemo(() => {
    const names = new Set<string>();
    events.forEach((event) => {
      const normalizedName = normalizeEventNameForFilter(
        event.name,
        event.type
      );
      names.add(normalizedName);
    });
    return Array.from(names).sort();
  }, [events]);

  // Count how many hidden event names are currently in the timeline
  const filteredEventNamesCount = useMemo(() => {
    return uniqueEventNames.filter((name) => hiddenEventNames.has(name)).length;
  }, [uniqueEventNames, hiddenEventNames]);

  useEffect(() => {
    log.info(`🎨 Panel mounted for tab ${tabId}`);
    log.debug(`Current event count in store: ${events.length}`);
  }, []);

  useEffect(() => {
    log.debug(`📊 Event count changed: ${events.length}`);
  }, [events.length]);

  const handleClearEvents = async () => {
    log.info(`🗑️ Clearing events via UI`);

    // Clear local store
    clearEvents();

    // Also clear in background script
    try {
      await Browser.runtime.sendMessage({
        type: 'CLEAR_EVENTS',
        tabId,
      });
      log.info(`✅ Events cleared in background script`);
    } catch (error) {
      log.error(`❌ Failed to clear events in background:`, error);
    }
  };

  const handleScrollToBottom = () => {
    eventListRef.current?.scrollToBottom();
  };

  const handleToggleFilterPanel = () => {
    setIsFilterPanelOpen((prev) => !prev);
  };

  const handleShowAll = () => {
    showAllEventNames();
  };

  const handleHideAll = () => {
    hideAllEventNames(uniqueEventNames);
  };

  const handleToggleEventName = (eventName: string) => {
    toggleEventNameVisibility(eventName);
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
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

      {isFilterPanelOpen && (
        <FilterPanel
          events={events}
          hiddenEventNames={hiddenEventNames}
          onToggleEventName={handleToggleEventName}
          onShowAll={handleShowAll}
          onHideAll={handleHideAll}
        />
      )}

      <ErrorBoundary
        fallback={<EventListErrorState />}
        resetKeys={[filteredEvents.length]}
      >
        <EventList
          ref={eventListRef}
          events={filteredEvents}
          reloadTimestamps={reloadTimestamps}
          expandedEventIds={expandedEventIds}
          hiddenEventNames={hiddenEventNames}
          searchMatch={searchMatch}
          viewMode={preferredViewMode}
          onToggleExpand={toggleEventExpanded}
          onToggleHide={toggleEventNameVisibility}
          onScrollStateChange={setIsAtBottom}
          onViewModeChange={handleViewModeChange}
        />
      </ErrorBoundary>

      <ScrollToBottomButton
        isVisible={!isAtBottom}
        onClick={handleScrollToBottom}
      />

      <Footer tabId={tabId} isListening={domainAllowed === true} />

      <FeedbackModal
        open={isFeedbackModalOpen}
        onOpenChange={setIsFeedbackModalOpen}
      />

      <OnboardingSystem
        modalId="welcome"
        ModalComponent={WelcomeOnboardingModal}
        delay={500}
      />
    </div>
  );
}
