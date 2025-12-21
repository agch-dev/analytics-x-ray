import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Browser from 'webextension-polyfill';
import { getTabStore } from '@src/stores/tabStore';
import { useConfigStore, selectPreferredEventDetailView } from '@src/stores/configStore';
import { Header, EventList, Footer, FilterPanel, ScrollToBottomButton, type EventListHandle } from './components';
import { useEventSync } from './hooks/useEventSync';
import { createContextLogger } from '@src/lib/logger';
import { normalizeEventNameForFilter } from '@src/lib/utils';
import { eventMatchesSearch, parseSearchQuery } from '@src/lib/search';
import { useDebounce } from '@src/hooks';

const log = createContextLogger('panel');

// Get the inspected tab ID from DevTools API
const tabId = Browser.devtools.inspectedWindow.tabId;

export default function Panel() {
  const eventListRef = useRef<EventListHandle>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Get preferred view mode from config store (used directly, not persisted per tab)
  const preferredViewMode = useConfigStore(selectPreferredEventDetailView);
  const setPreferredEventDetailView = useConfigStore((state) => state.setPreferredEventDetailView);
  
  // Initialize tab store
  const useTabStore = useMemo(() => getTabStore(tabId, 500), []);
  
  // Selectors - only subscribe to what we need
  const events = useTabStore((state) => state.events);
  const selectedEventId = useTabStore((state) => state.selectedEventId);
  const expandedEventIds = useTabStore((state) => state.expandedEventIds);
  const hiddenEventNames = useTabStore((state) => state.hiddenEventNames);
  const searchQuery = useTabStore((state) => state.searchQuery);
  const setSelectedEvent = useTabStore((state) => state.setSelectedEvent);
  const toggleEventExpanded = useTabStore((state) => state.toggleEventExpanded);
  const toggleEventNameVisibility = useTabStore((state) => state.toggleEventNameVisibility);
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
    setSearchInput(query); // Update immediately for display
  }, []);
  
  const handleViewModeChange = useCallback((mode: 'json' | 'structured') => {
    // Update the global preference when user toggles view mode
    setPreferredEventDetailView(mode);
  }, [setPreferredEventDetailView]);
  
  // Sync events with background script
  useEventSync({ tabId, addEvent });

  // Parse search query
  const searchMatch = useMemo(() => parseSearchQuery(searchQuery), [searchQuery]);

  // Filter events based on hidden event names and search query
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filter by hidden event names (using normalized names)
    if (hiddenEventNames.size > 0) {
      filtered = filtered.filter((event) => {
        const normalizedName = normalizeEventNameForFilter(event.name, event.type);
        return !hiddenEventNames.has(normalizedName);
      });
    }

    // Filter by search query
    if (searchMatch) {
      filtered = filtered.filter((event) => eventMatchesSearch(event, searchMatch));
    }

    return filtered;
  }, [events, hiddenEventNames, searchMatch]);

  // Get unique event names from current events for filter panel (normalized)
  const uniqueEventNames = useMemo(() => {
    const names = new Set<string>();
    events.forEach((event) => {
      const normalizedName = normalizeEventNameForFilter(event.name, event.type);
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
    <div className="h-screen bg-background text-foreground flex flex-col">
      <Header
        eventCount={filteredEvents.length}
        filteredEventNamesCount={filteredEventNamesCount}
        isFilterPanelOpen={isFilterPanelOpen}
        searchQuery={searchInput}
        onSearchChange={handleSearchChange}
        onClear={handleClearEvents}
        onToggleFilterPanel={handleToggleFilterPanel}
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
      
      <EventList
        ref={eventListRef}
        events={filteredEvents}
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
      
      <ScrollToBottomButton
        isVisible={!isAtBottom}
        onClick={handleScrollToBottom}
      />
      
      <Footer tabId={tabId} />
    </div>
  );
}
