import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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
    
    // Set up virtualizer
    const virtualizer = useVirtualizer({
      count: displayEvents.length,
      getScrollElement: () => scrollContainerRef.current,
      estimateSize: () => 72, // Estimated height of each EventRow
      overscan: 5, // Render 5 extra items above and below viewport
    });
    
    // Expose scrollToBottom method via ref
    useImperativeHandle(ref, () => ({
      scrollToBottom: () => {
        if (displayEvents.length > 0) {
          // Use setTimeout to ensure virtualizer is ready
          setTimeout(() => {
            virtualizer.scrollToIndex(displayEvents.length - 1, {
              align: 'end',
              behavior: 'auto',
            });
          }, 0);
          shouldAutoScrollRef.current = true;
        }
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
      if (!shouldAutoScrollRef.current || displayEvents.length === 0) return;
      
      // Use a small timeout to ensure virtualizer has measured items
      const timeoutId = setTimeout(() => {
        virtualizer.scrollToIndex(displayEvents.length - 1, {
          align: 'end',
          behavior: 'auto', // Use 'auto' instead of 'smooth' for more reliable scrolling
        });
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }, [displayEvents.length]); // Remove virtualizer from dependencies

    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {displayEvents.length === 0 ? (
          <EmptyState />
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualItems.map((virtualItem) => {
              const event = displayEvents[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <EventRow
                    event={event}
                    isSelected={selectedEventId === event.id}
                    onSelect={onSelectEvent}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

