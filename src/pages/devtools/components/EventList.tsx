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
  expandedEventIds: Set<string>;
  onSelectEvent: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export const EventList = forwardRef<EventListHandle, EventListProps>(
  function EventList({ 
    events, 
    selectedEventId, 
    expandedEventIds,
    onSelectEvent,
    onToggleExpand 
  }, ref) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    
    // Reverse events so newest is at bottom
    const displayEvents = useMemo(() => [...events].reverse(), [events]);
    
    // Dynamic size estimation based on expansion state
    const getEstimatedSize = (index: number) => {
      const event = displayEvents[index];
      if (!event) return 39;
      // Base height + expanded height (rough estimate for JSON viewer)
      return expandedEventIds.has(event.id) ? 400 : 39;
    };
    
    // Set up virtualizer with dynamic measurement
    const virtualizer = useVirtualizer({
      count: displayEvents.length,
      getScrollElement: () => scrollContainerRef.current,
      estimateSize: getEstimatedSize,
      overscan: 5, // Render 5 extra items above and below viewport
      // Measure actual element height for accurate positioning
      measureElement: (element) => {
        return element?.getBoundingClientRect().height ?? 39;
      },
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
    
    // Wrapper for toggle expand that also triggers remeasurement
    const handleToggleExpand = (id: string) => {
      onToggleExpand(id);
      // Trigger remeasurement after state update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          itemRefs.current.forEach((element) => {
            if (element) {
              virtualizer.measureElement(element);
            }
          });
          virtualizer.measure();
        });
      });
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
    }, [displayEvents.length, virtualizer]); // Include virtualizer
    
    // Recalculate virtualizer when expansion state changes
    useEffect(() => {
      // Use double requestAnimationFrame to ensure DOM has fully updated after React render
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Measure all rendered items after expansion state changes
            itemRefs.current.forEach((element) => {
              if (element) {
                virtualizer.measureElement(element);
              }
            });
            virtualizer.measure();
          });
        });
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }, [expandedEventIds.size, displayEvents.length, virtualizer]); // Use size for Set comparison

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
              const isExpanded = expandedEventIds.has(event.id);
              return (
                <div
                  key={virtualItem.key}
                  ref={(el) => {
                    if (el) {
                      itemRefs.current.set(virtualItem.index, el);
                      // Measure element after it's rendered, with a small delay to ensure content is rendered
                      setTimeout(() => {
                        virtualizer.measureElement(el);
                      }, 0);
                    } else {
                      itemRefs.current.delete(virtualItem.index);
                    }
                  }}
                  data-index={virtualItem.index}
                  data-expanded={isExpanded}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <EventRow
                    event={event}
                    isSelected={selectedEventId === event.id}
                    isExpanded={isExpanded}
                    onSelect={onSelectEvent}
                    onToggleExpand={handleToggleExpand}
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

