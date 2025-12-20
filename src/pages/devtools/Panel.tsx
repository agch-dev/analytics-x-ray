import { useRef, useEffect } from 'react';
import Browser from 'webextension-polyfill';
import { getTabStore } from '@src/stores/tabStore';
import { Header, EventList, Footer, type EventListHandle } from './components';
import { useEventSync } from './hooks/useEventSync';
import { createContextLogger } from '@src/lib/logger';

const log = createContextLogger('panel');

// Get the inspected tab ID from DevTools API
const tabId = Browser.devtools.inspectedWindow.tabId;
const useTabStore = getTabStore(tabId);

export default function Panel() {
  const eventListRef = useRef<EventListHandle>(null);
  
  // Selectors - only subscribe to what we need
  const events = useTabStore((state) => state.events);
  const selectedEventId = useTabStore((state) => state.selectedEventId);
  const setSelectedEvent = useTabStore((state) => state.setSelectedEvent);
  const clearEvents = useTabStore((state) => state.clearEvents);
  const addEvent = useTabStore((state) => state.addEvent);
  
  // Sync events with background script
  useEventSync({ tabId, addEvent });

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

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <Header
        eventCount={events.length}
        onScrollToBottom={handleScrollToBottom}
        onClear={handleClearEvents}
      />
      
      <EventList
        ref={eventListRef}
        events={events}
        selectedEventId={selectedEventId}
        onSelectEvent={setSelectedEvent}
      />
      
      <Footer tabId={tabId} />
    </div>
  );
}
