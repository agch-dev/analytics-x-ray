import { useRef } from 'react';
import Browser from 'webextension-polyfill';
import { getTabStore } from '@src/stores/tabStore';
import { Header, EventList, Footer, type EventListHandle } from './components';

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
  
  const handleScrollToBottom = () => {
    eventListRef.current?.scrollToBottom();
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      <Header
        eventCount={events.length}
        onScrollToBottom={handleScrollToBottom}
        onClear={clearEvents}
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
