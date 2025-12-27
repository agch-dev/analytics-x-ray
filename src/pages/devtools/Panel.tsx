import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Browser from 'webextension-polyfill';
import { getTabStore } from '@src/stores/tabStore';
import { useConfigStore, selectPreferredEventDetailView, selectMaxEvents, selectAllowedDomains, selectDeniedDomains } from '@src/stores/configStore';
import { Header, EventList, Footer, FilterPanel, ScrollToBottomButton, FeedbackModal, OnboardingSystem, WelcomeOnboardingModal, type EventListHandle } from './components';
import { useEventSync } from './hooks/useEventSync';
import { createContextLogger } from '@src/lib/logger';
import { normalizeEventNameForFilter } from '@src/lib/utils';
import { eventMatchesSearch, parseSearchQuery } from '@src/lib/search';
import { useDebounce } from '@src/hooks';
import { ErrorBoundary, EventListErrorState } from '@src/components';
import { getTabDomain, isDomainAllowed, normalizeDomain, getBaseDomain } from '@src/lib/domain';
import { isDomainChangedMessage } from '@src/types/messages';


const log = createContextLogger('panel');

// Get the inspected tab ID from DevTools API
const tabId = Browser.devtools.inspectedWindow.tabId;

export default function Panel() {
  const eventListRef = useRef<EventListHandle>(null);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  
  // Domain tracking state
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [domainAllowed, setDomainAllowed] = useState<boolean | null>(null);
  const [domainCheckComplete, setDomainCheckComplete] = useState(false);
  
  // Get preferred view mode from config store (used directly, not persisted per tab)
  const preferredViewMode = useConfigStore(selectPreferredEventDetailView);
  const setPreferredEventDetailView = useConfigStore((state) => state.setPreferredEventDetailView);
  
  // Get maxEvents from config store to pass to tab store
  const maxEvents = useConfigStore(selectMaxEvents);
  
  // Get allowed and denied domains from config store
  const allowedDomains = useConfigStore(selectAllowedDomains);
  const deniedDomains = useConfigStore(selectDeniedDomains);
  const addDeniedDomain = useConfigStore((state) => state.addDeniedDomain);
  const addAllowedDomain = useConfigStore((state) => state.addAllowedDomain);
  
  // Track which domain we've already auto-allowed to avoid duplicate additions
  const autoAllowedDomainRef = useRef<string | null>(null);
  // Track previous normalized domain to detect domain changes
  const previousNormalizedDomainRef = useRef<string | null>(null);
  
  // Initialize tab store with current maxEvents from config
  // Note: The store will read maxEvents dynamically from config store on each addEvent,
  // but we pass it here for initial setup and fallback
  const useTabStore = useMemo(() => getTabStore(tabId, maxEvents), [maxEvents]);
  
  // Trim events when maxEvents is reduced (apply instantly when user changes setting)
  useEffect(() => {
    const currentEvents = useTabStore.getState().events;
    if (currentEvents.length > maxEvents) {
      log.info(`✂️ Trimming events from ${currentEvents.length} to ${maxEvents} (maxEvents setting changed)`);
      useTabStore.setState({
        events: currentEvents.slice(0, maxEvents),
        lastUpdated: Date.now(),
      });
    }
  }, [maxEvents, useTabStore]);
  
  // Selectors - only subscribe to what we need
  const events = useTabStore((state) => state.events);
  const selectedEventId = useTabStore((state) => state.selectedEventId);
  const expandedEventIds = useTabStore((state) => state.expandedEventIds);
  const hiddenEventNames = useTabStore((state) => state.hiddenEventNames);
  const searchQuery = useTabStore((state) => state.searchQuery);
  const reloadTimestamps = useTabStore((state) => state.reloadTimestamps);
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
  
  // Function to check domain
  const checkDomain = useCallback(async () => {
    try {
      // Try to get domain from background script first (it has the cached domain info)
      let domain: string | null = null;
      try {
        const response = await Browser.runtime.sendMessage({
          type: 'GET_TAB_DOMAIN',
          tabId,
        });
        if (response && typeof response === 'string') {
          domain = response;
        }
      } catch (error) {
        // Fallback to direct method
        domain = await getTabDomain(tabId);
      }
      
      setCurrentDomain(domain);
      
      if (!domain) {
        // Special page or invalid URL
        setDomainAllowed(false);
        setDomainCheckComplete(true);
        previousNormalizedDomainRef.current = null;
        return;
      }
      
      // Normalize domain for denied check
      const normalizedDomain = normalizeDomain(domain);
      
      // Reset auto-allowed ref if domain changed
      if (previousNormalizedDomainRef.current && previousNormalizedDomainRef.current !== normalizedDomain) {
        // Domain changed, reset auto-allowed tracking
        autoAllowedDomainRef.current = null;
      }
      previousNormalizedDomainRef.current = normalizedDomain;
      const isDenied = deniedDomains.some((denied) => {
        const normalizedDenied = normalizeDomain(denied);
        return normalizedDenied === normalizedDomain || denied === domain;
      });
      
      // Get latest allowed domains from store (always use fresh state)
      const latestAllowedDomains = useConfigStore.getState().allowedDomains;
      
      // Check if domain is allowed
      let allowed = isDomainAllowed(domain, latestAllowedDomains);
      
      // Auto-allow feature: automatically add domain to allowed list if not already there
      // Only do this once per domain (tracked by ref)
      if (!allowed && !isDenied && autoAllowedDomainRef.current !== normalizedDomain) {
        // Determine if this is a subdomain (has more than 2 parts)
        const baseDomain = getBaseDomain(normalizedDomain);
        const isSubdomain = normalizedDomain !== baseDomain;
        
        // Check if domain or base domain is already in the allowed list
        const existingEntry = latestAllowedDomains.find((d) => {
          const existingNormalized = normalizeDomain(d.domain);
          if (d.allowSubdomains) {
            // If existing entry allows subdomains, check if current domain matches
            return getBaseDomain(existingNormalized) === baseDomain;
          }
          // Check for exact match or base domain match
          return existingNormalized === normalizedDomain || 
                 (isSubdomain && existingNormalized === baseDomain);
        });
        
        if (!existingEntry) {
          // Domain is not in the list at all, add it
          const domainToAdd = isSubdomain ? baseDomain : normalizedDomain;
          const allowSubdomains = isSubdomain;
          
          log.info(`✨ Auto-allowing domain: ${domainToAdd} (subdomains: ${allowSubdomains})`);
          addAllowedDomain(domainToAdd, allowSubdomains);
          
          // Mark this domain as auto-allowed
          autoAllowedDomainRef.current = normalizedDomain;
          
          // Get the updated allowed domains after adding
          const updatedAllowedDomains = useConfigStore.getState().allowedDomains;
          log.info(`📋 Updated allowed domains:`, updatedAllowedDomains.map(d => `${d.domain} (subdomains: ${d.allowSubdomains})`));
          
          // Verify the domain should now be allowed
          const shouldBeAllowed = isDomainAllowed(domain, updatedAllowedDomains);
          log.info(`🔍 Domain ${domain} should be allowed: ${shouldBeAllowed}`);
          
          // Immediately trigger background script to re-evaluate this tab's domain
          // This ensures the background script picks up the new allowed domain right away
          // Use requestAnimationFrame to ensure store update has propagated
          requestAnimationFrame(() => {
            Browser.runtime.sendMessage({
              type: 'RE_EVALUATE_TAB_DOMAIN',
              tabId,
            })
            .then((result) => {
              log.info(`✅ Domain re-evaluation triggered for tab ${tabId}, result:`, result);
            })
            .catch((error) => {
              log.error('❌ Failed to trigger domain re-evaluation:', error);
            });
          });
          
          // Re-check if domain is now allowed using latest store state
          allowed = isDomainAllowed(domain, updatedAllowedDomains);
        } else if (isSubdomain && existingEntry.domain === baseDomain && !existingEntry.allowSubdomains) {
          // Special case: base domain exists but subdomains are not allowed
          // Update it to allow subdomains
          log.info(`✨ Updating ${baseDomain} to allow subdomains (visited ${normalizedDomain})`);
          addAllowedDomain(baseDomain, true); // This will update the existing entry
          
          // Mark this domain as auto-allowed
          autoAllowedDomainRef.current = normalizedDomain;
          
          // Get the updated allowed domains after updating
          const updatedAllowedDomains = useConfigStore.getState().allowedDomains;
          log.info(`📋 Updated allowed domains:`, updatedAllowedDomains.map(d => `${d.domain} (subdomains: ${d.allowSubdomains})`));
          
          // Verify the domain should now be allowed
          const shouldBeAllowed = isDomainAllowed(domain, updatedAllowedDomains);
          log.info(`🔍 Domain ${domain} should be allowed: ${shouldBeAllowed}`);
          
          // Immediately trigger background script to re-evaluate this tab's domain
          // This ensures the background script picks up the updated domain setting right away
          // Use requestAnimationFrame to ensure store update has propagated
          requestAnimationFrame(() => {
            Browser.runtime.sendMessage({
              type: 'RE_EVALUATE_TAB_DOMAIN',
              tabId,
            })
            .then((result) => {
              log.info(`✅ Domain re-evaluation triggered for tab ${tabId}, result:`, result);
            })
            .catch((error) => {
              log.error('❌ Failed to trigger domain re-evaluation:', error);
            });
          });
          
          // Re-check if domain is now allowed using latest store state
          allowed = isDomainAllowed(domain, updatedAllowedDomains);
        } else {
          // Domain is already in the list and properly configured, mark as auto-allowed to prevent future checks
          autoAllowedDomainRef.current = normalizedDomain;
          // Re-check with latest state
          allowed = isDomainAllowed(domain, latestAllowedDomains);
        }
      }
      
      // If domain was auto-allowed, ensure it's marked as allowed
      // (this handles the case where auto-allow happened but state hasn't updated yet)
      const finalAllowed = allowed || (autoAllowedDomainRef.current === normalizedDomain && !isDenied);
      setDomainAllowed(finalAllowed && !isDenied);
      setDomainCheckComplete(true);
    } catch (error) {
      log.error('❌ [Panel] Failed to check domain:', error);
      setDomainAllowed(false);
      setDomainCheckComplete(true);
    }
  }, [tabId, allowedDomains, deniedDomains]);

  // Check domain on mount and when allowlist/denylist changes
  useEffect(() => {
    checkDomain();
  }, [checkDomain]);

  // Listen for domain change messages from background script
  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (isDomainChangedMessage(message) && message.tabId === tabId) {
        log.info(`🌐 Domain changed notification received for tab ${tabId}: ${message.domain}`);
        // Re-check domain when we get a change notification
        checkDomain();
      }
    };

    Browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      Browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [tabId, checkDomain]);

  // Also periodically check domain (fallback in case messages don't arrive)
  // Only check if domain check is not complete or domain is not allowed yet
  // This reduces unnecessary requests when domain is already allowed
  useEffect(() => {
    // Skip periodic checks if domain is already allowed and check is complete
    if (domainCheckComplete && domainAllowed === true) {
      return;
    }
    
    const interval = setInterval(() => {
      // Only check if we haven't completed the check or domain is not allowed
      if (!domainCheckComplete || domainAllowed !== true) {
        checkDomain();
      }
    }, 5000); // Check every 5 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [checkDomain, domainCheckComplete, domainAllowed]);
  
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

  // Check if domain is denied
  const isDenied = currentDomain ? deniedDomains.some((denied) => {
    const normalizedDenied = normalizeDomain(denied);
    const normalizedCurrent = normalizeDomain(currentDomain);
    return normalizedDenied === normalizedCurrent || denied === currentDomain;
  }) : false;


  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
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
