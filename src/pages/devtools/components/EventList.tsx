import { useEffect, useRef, useMemo, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SegmentEvent } from '@src/types/segment';
import { normalizeEventNameForFilter } from '@src/lib/utils';
import type { SearchMatch } from '@src/lib/search';
import { EventRow } from './EventRow';
import { EventRowHeader } from './EventRowHeader';
import { EmptyState } from './EmptyState';

export interface EventListHandle {
  scrollToBottom: () => void;
  isAtBottom: boolean;
}

type ViewMode = 'json' | 'structured';

interface EventListProps {
  events: SegmentEvent[];
  selectedEventId: string | null;
  expandedEventIds: Set<string>;
  hiddenEventNames: Set<string>;
  searchMatch?: SearchMatch | null;
  viewMode: ViewMode;
  onSelectEvent: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onToggleHide?: (eventName: string) => void;
  onScrollStateChange?: (isAtBottom: boolean) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

// Height of the row header (used for sticky header calculations)
const ROW_HEADER_HEIGHT = 39;
// Gap between event rows
const ROW_GAP = 8; // 0.5rem / 8px
// Hysteresis buffer to prevent flickering - once sticky, require more scroll to un-stick
const STICKY_SHOW_THRESHOLD = 50;  // Need this much visible to SHOW sticky
const STICKY_HIDE_THRESHOLD = 10;  // Need less than this to HIDE sticky

export const EventList = forwardRef<EventListHandle, EventListProps>(
  function EventList({ 
    events, 
    selectedEventId, 
    expandedEventIds,
    hiddenEventNames,
    searchMatch,
    viewMode,
    onSelectEvent,
    onToggleExpand,
    onToggleHide,
    onScrollStateChange,
    onViewModeChange,
  }, ref) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
    
    // Track the expanded event whose header has scrolled out of view
    const [stickyEvent, setStickyEvent] = useState<SegmentEvent | null>(null);
    const [stickyEventIndex, setStickyEventIndex] = useState<number | null>(null);
    
    // Track which event just collapsed to trigger ring animation
    const [collapsedEventId, setCollapsedEventId] = useState<string | null>(null);
    
    // Track if user is at bottom for floating button visibility
    const [isAtBottom, setIsAtBottom] = useState(true);
    
    // Reverse events so newest is at bottom
    const displayEvents = useMemo(() => [...events].reverse(), [events]);
    
    // Dynamic size estimation based on expansion state
    const getEstimatedSize = (index: number) => {
      const event = displayEvents[index];
      if (!event) return ROW_HEADER_HEIGHT + ROW_GAP;
      // Base height + expanded height (rough estimate for JSON viewer) + gap
      const baseHeight = expandedEventIds.has(event.id) ? 400 : ROW_HEADER_HEIGHT;
      return baseHeight + ROW_GAP;
    };
    
    // Set up virtualizer with dynamic measurement
    const virtualizer = useVirtualizer({
      count: displayEvents.length,
      getScrollElement: () => scrollContainerRef.current,
      estimateSize: getEstimatedSize,
      overscan: 5, // Render 5 extra items above and below viewport
      // Measure actual element height for accurate positioning
      measureElement: (element) => {
        return element?.getBoundingClientRect().height ?? ROW_HEADER_HEIGHT + ROW_GAP;
      },
    });
    
    // Expose scrollToBottom method and isAtBottom state via ref
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
      isAtBottom,
    }), [isAtBottom]);
    
    // Track current sticky event ID to avoid unnecessary state updates
    const currentStickyIdRef = useRef<string | null>(null);
    
    // Handle scroll to detect if user has scrolled up and manage sticky header
    const handleScroll = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      shouldAutoScrollRef.current = atBottom;
      setIsAtBottom(atBottom);
      onScrollStateChange?.(atBottom);
      
      // Check for expanded events whose headers have scrolled out of view
      const virtualItems = virtualizer.getVirtualItems();
      let foundStickyEvent: SegmentEvent | null = null;
      let foundStickyIndex: number | null = null;
      
      for (const virtualItem of virtualItems) {
        const event = displayEvents[virtualItem.index];
        if (!event || !expandedEventIds.has(event.id)) continue;
        
        // Check if the header is above the viewport but the item is still visible
        const itemTop = virtualItem.start;
        const itemBottom = virtualItem.start + virtualItem.size;
        
        // Header is scrolled out (item starts above viewport) but item still visible
        const visibleBelowHeader = itemBottom - (scrollTop + ROW_HEADER_HEIGHT);
        // Header is fully scrolled out when its bottom edge is above the viewport
        const headerFullyHidden = itemTop + ROW_HEADER_HEIGHT <= scrollTop;
        
        // Use hysteresis ONLY for the bottom boundary (prevents flicker when scrolling down)
        // For the top boundary, immediately hide when the actual header becomes visible
        const isCurrentlySticky = currentStickyIdRef.current === event.id;
        const bottomThreshold = isCurrentlySticky ? STICKY_HIDE_THRESHOLD : STICKY_SHOW_THRESHOLD;
        const enoughContentVisible = visibleBelowHeader > bottomThreshold;
        const shouldBeSticky = headerFullyHidden && enoughContentVisible;
        
        if (shouldBeSticky) {
          foundStickyEvent = event;
          foundStickyIndex = virtualItem.index;
          break; // Only show one sticky header at a time
        }
      }
      
      // Only update state if the sticky event actually changed (compare by ID)
      const newStickyId = foundStickyEvent?.id ?? null;
      if (newStickyId !== currentStickyIdRef.current) {
        currentStickyIdRef.current = newStickyId;
        setStickyEvent(foundStickyEvent);
        setStickyEventIndex(foundStickyIndex);
      }
    }, [displayEvents, expandedEventIds, virtualizer, onScrollStateChange]);
    
    // Wrapper for toggle expand that also triggers remeasurement
    const handleToggleExpand = (id: string) => {
      const wasExpanded = expandedEventIds.has(id);
      
      onToggleExpand(id);
      
      // If collapsing (was expanded, now collapsing), trigger ring animation
      if (wasExpanded) {
        setCollapsedEventId(id);
        setTimeout(() => {
          setCollapsedEventId(null);
        }, 600); // Match animation duration
      }
      
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
    
    // Check initial scroll state on mount
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      
      const checkScrollState = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        shouldAutoScrollRef.current = atBottom;
        setIsAtBottom(atBottom);
        onScrollStateChange?.(atBottom);
      };
      
      // Check after a short delay to ensure virtualizer has measured
      const timeoutId = setTimeout(checkScrollState, 100);
      return () => clearTimeout(timeoutId);
    }, [onScrollStateChange]);
    
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
    
    // Handle click on sticky header: collapse and scroll to the event
    const handleStickyHeaderClick = useCallback(() => {
      if (stickyEvent && stickyEventIndex !== null) {
        const eventId = stickyEvent.id;
        const indexToScrollTo = stickyEventIndex;
        
        // Clear sticky state first (including ref to prevent race conditions)
        currentStickyIdRef.current = null;
        setStickyEvent(null);
        setStickyEventIndex(null);
        
        // Collapse the event (handleToggleExpand will handle the animation)
        handleToggleExpand(eventId);
        
        // Scroll to make the collapsed event visible (after collapse animation)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            virtualizer.scrollToIndex(indexToScrollTo, {
              align: 'start',
            });
          });
        });
      }
    }, [stickyEvent, stickyEventIndex, handleToggleExpand, virtualizer]);

    return (
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto relative px-4 mt-2 pb-2"
      >
        {/* Sticky header overlay - clickable to collapse and scroll to event */}
        {stickyEvent && (
          <div 
            className="sticky top-0 left-0 right-0 z-10"
            style={{ position: 'sticky' }}
            onClick={handleStickyHeaderClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleStickyHeaderClick();
              }
            }}
          >
            <EventRowHeader
              event={stickyEvent}
              isExpanded={true}
              isSticky={true}
              isHidden={hiddenEventNames.has(normalizeEventNameForFilter(stickyEvent.name, stickyEvent.type))}
              searchMatch={searchMatch}
              viewMode={viewMode}
              onToggleHide={onToggleHide}
              onViewModeChange={onViewModeChange}
            />
          </div>
        )}
        
        {displayEvents.length === 0 ? (
          <EmptyState searchQuery={searchMatch?.query} />
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
                    paddingBottom: `${ROW_GAP}px`,
                  }}
                >
                  <EventRow
                    event={event}
                    isSelected={selectedEventId === event.id}
                    isExpanded={isExpanded}
                    isAnimatingCollapse={collapsedEventId === event.id}
                    isHidden={hiddenEventNames.has(normalizeEventNameForFilter(event.name, event.type))}
                    searchMatch={searchMatch}
                    viewMode={viewMode}
                    onToggleExpand={handleToggleExpand}
                    onToggleHide={onToggleHide}
                    onViewModeChange={onViewModeChange}
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

