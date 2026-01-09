import { useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import type { SegmentEvent } from '@src/types/segment';
import { normalizeEventNameForFilter } from '@src/lib/utils';
import type { SearchMatch } from '@src/lib/search';
import { EventRow } from '../EventRow';
import { EventRowHeader } from '../EventRowHeader';
import { EmptyState } from '../EmptyState';
import { UrlDivider } from '../UrlDivider';
import { useVirtualization } from './useVirtualization';
import { useStickyHeader } from './useStickyHeader';
import { ROW_GAP } from './types';

export interface EventListHandle {
  scrollToBottom: () => void;
  isAtBottom: boolean;
}

export type ViewMode = 'json' | 'structured';

export interface EventListProps {
  events: SegmentEvent[];
  reloadTimestamps: number[];
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

export const EventList = forwardRef<EventListHandle, EventListProps>(
  function EventList({
    events,
    reloadTimestamps,
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

    // Track which event just collapsed to trigger ring animation
    const [collapsedEventId, setCollapsedEventId] = useState<string | null>(null);

    // Use virtualization hook
    const {
      listItems,
      virtualizer,
      itemRefs,
      isAtBottom,
      handleScroll: handleVirtualizationScroll,
      scrollToBottom,
      remeasureItems,
    } = useVirtualization({
      events,
      reloadTimestamps,
      expandedEventIds,
      scrollContainerRef,
      onScrollStateChange,
    });

    // Wrapper for toggle expand that also triggers remeasurement
    const handleToggleExpand = useCallback(
      (id: string) => {
        const wasExpanded = expandedEventIds.has(id);

        // Find the index of the event being toggled before state update
        const eventIndex = listItems.findIndex(
          (item) => item.type === 'event' && item.event.id === id
        );

        onToggleExpand(id);

        // If collapsing (was expanded, now collapsing), trigger ring animation
        if (wasExpanded) {
          setCollapsedEventId(id);

          setTimeout(() => {
            setCollapsedEventId(null);
          }, 600); // Match animation duration
        }

        if (eventIndex !== -1) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              virtualizer.scrollToIndex(eventIndex, {
                align: 'start',
              });
            });
          });
        }

        // Trigger remeasurement after state update
        remeasureItems();
      },
      [expandedEventIds, listItems, onToggleExpand, virtualizer, remeasureItems]
    );

    // Use sticky header hook
    const {
      stickyEvent,
      stickyEventIndex,
      handleScroll: handleStickyScroll,
      handleStickyHeaderClick,
      clearSticky,
    } = useStickyHeader({
      listItems,
      expandedEventIds,
      virtualizer,
      scrollContainerRef,
      onToggleExpand: handleToggleExpand,
    });

    // Expose scrollToBottom method and isAtBottom state via ref
    useImperativeHandle(
      ref,
      () => ({
        scrollToBottom,
        isAtBottom,
      }),
      [isAtBottom, scrollToBottom]
    );

    // Combined scroll handler that calls both virtualization and sticky header handlers
    const handleScroll = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      handleVirtualizationScroll();
      handleStickyScroll(scrollTop);
    }, [handleVirtualizationScroll, handleStickyScroll]);

    const virtualItems = virtualizer.getVirtualItems();

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
              isHidden={hiddenEventNames.has(
                normalizeEventNameForFilter(stickyEvent.name, stickyEvent.type)
              )}
              searchMatch={searchMatch}
              viewMode={viewMode}
              onToggleHide={onToggleHide}
              onViewModeChange={onViewModeChange}
            />
          </div>
        )}

        {listItems.length === 0 ? (
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
              const item = listItems[virtualItem.index];
              if (!item) return null;

              if (item.type === 'divider') {
                return (
                  <div
                    key={`divider-${item.index}`}
                    ref={(el) => {
                      if (el) {
                        itemRefs.current.set(virtualItem.index, el);
                        setTimeout(() => {
                          virtualizer.measureElement(el);
                        }, 0);
                      } else {
                        itemRefs.current.delete(virtualItem.index);
                      }
                    }}
                    data-index={virtualItem.index}
                    data-type="divider"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '1rem', // mx-4 = 1rem margin on each side
                      right: '1rem',
                      transform: `translateY(${virtualItem.start}px)`,
                      paddingBottom: `${ROW_GAP}px`,
                    }}
                  >
                    <UrlDivider
                      event={item.event}
                      previousEvent={item.previousEvent}
                      isReload={item.isReload}
                      timestamp={item.timestamp}
                    />
                  </div>
                );
              }

              // Render event row
              const event = item.event;
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
                    isHidden={hiddenEventNames.has(
                      normalizeEventNameForFilter(event.name, event.type)
                    )}
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
