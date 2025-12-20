import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import type { SegmentEvent } from '@src/types/segment';
import { EventRow } from './EventRow';
import { EmptyState } from './EmptyState';

export interface EventListHandle {
  scrollToBottom: () => void;
}

interface EventListProps {
  events: SegmentEvent[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
}

export const EventList = forwardRef<EventListHandle, EventListProps>(
  function EventList({ events, selectedEventId, onSelectEvent }, ref) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    
    // Reverse events so newest is at bottom
    const displayEvents = useMemo(() => [...events].reverse(), [events]);
    
    // Expose scrollToBottom method via ref
    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        const container = scrollContainerRef.current;
        if (!container) return;
        
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        });
        shouldAutoScrollRef.current = true;
      },
    }));
    
    // Handle scroll to detect if user has scrolled up
    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldAutoScrollRef.current = isAtBottom;
    };
    
    // Auto-scroll to bottom when new events arrive
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container || !shouldAutoScrollRef.current) return;
      
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }, [events.length]);

    return (
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {displayEvents.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-white/5">
            {displayEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                isSelected={selectedEventId === event.id}
                onSelect={onSelectEvent}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);

