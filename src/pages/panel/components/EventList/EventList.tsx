import {
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
} from 'react';

import type { SearchMatch } from '@src/lib';
import { normalizeEventNameForFilter } from '@src/lib';
import type { SegmentEvent } from '@src/types';

import { EmptyState } from '../EmptyState';
import { EventRow } from '../EventRow';
import { EventRowHeader } from '../EventRowHeader';
import { UrlDivider } from '../UrlDivider';

import { ROW_GAP } from './types';
import { useStickyHeader } from './useStickyHeader';
import { useVirtualization } from './useVirtualization';

export interface EventListHandle {
  scrollToBottom: () => void;
  isAtBottom: boolean;
}

type ViewMode = 'json' | 'structured';

interface EventListProps {
  events: SegmentEvent[];
  reloadTimestamps: number[];
  expandedEventIds: Set<string>;
  hiddenEventNames: Set<string>;
  searchMatch?: SearchMatch | null;
  viewMode: ViewMode;
  isExportMode?: boolean;
  selectedExportIds?: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleHide?: (eventName: string) => void;
  onScrollStateChange?: (isAtBottom: boolean) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleSelect?: (eventId: string, shiftKey: boolean) => void;
}

export const EventList = forwardRef<EventListHandle, EventListProps>(
  function EventList(
    {
      events,
      reloadTimestamps,
      expandedEventIds,
      hiddenEventNames,
      searchMatch,
      viewMode,
      isExportMode = false,
      selectedExportIds,
      onToggleExpand,
      onToggleHide,
      onScrollStateChange,
      onViewModeChange,
      onToggleSelect,
    },
    ref
  ) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Track which event just collapsed to trigger ring animation
    const [collapsedEventId, setCollapsedEventId] = useState<string | null>(
      null
    );
    const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

    // Clear timeout on unmount
    useEffect(() => {
      return () => {
        if (collapseTimeoutRef.current) {
          clearTimeout(collapseTimeoutRef.current);
        }
      };
    }, []);

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

    // Store virtualizer in ref to avoid including in dependency arrays
    // (complies with react-hooks/incompatible-library rule)
    const virtualizerRef = useRef(virtualizer);
    useEffect(() => {
      virtualizerRef.current = virtualizer;
    }, [virtualizer]);

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

          if (collapseTimeoutRef.current) {
            clearTimeout(collapseTimeoutRef.current);
          }
          collapseTimeoutRef.current = setTimeout(() => {
            setCollapsedEventId(null);
            collapseTimeoutRef.current = null;
          }, 600); // Match animation duration
        }

        if (eventIndex !== -1) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              virtualizerRef.current.scrollToIndex(eventIndex, {
                align: 'start',
              });
            });
          });
        }

        // Trigger remeasurement after state update
        remeasureItems();
      },
      [expandedEventIds, listItems, onToggleExpand, remeasureItems]
    );

    // Use sticky header hook
    const {
      stickyEvent,
      stickyEventIndex: _stickyEventIndex,
      handleScroll: handleStickyScroll,
      handleStickyHeaderClick,
      clearSticky: _clearSticky,
    } = useStickyHeader({
      listItems,
      expandedEventIds,
      virtualizer,
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
        className="relative mt-2 flex-1 overflow-y-auto px-4 pb-2"
      >
        {/* Sticky header overlay - clickable to collapse and scroll to event */}
        {stickyEvent && (
          <div
            className="sticky top-0 right-0 left-0 z-10"
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
              isExportMode={isExportMode}
              isSelected={selectedExportIds?.has(stickyEvent.id) ?? false}
              searchMatch={searchMatch}
              viewMode={viewMode}
              onToggleHide={onToggleHide}
              onViewModeChange={onViewModeChange}
              onToggleSelect={onToggleSelect}
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
                    isExpanded={isExpanded}
                    isAnimatingCollapse={collapsedEventId === event.id}
                    isHidden={hiddenEventNames.has(
                      normalizeEventNameForFilter(event.name, event.type)
                    )}
                    isExportMode={isExportMode}
                    isSelected={selectedExportIds?.has(event.id) ?? false}
                    searchMatch={searchMatch}
                    viewMode={viewMode}
                    onToggleExpand={handleToggleExpand}
                    onToggleHide={onToggleHide}
                    onViewModeChange={onViewModeChange}
                    onToggleSelect={onToggleSelect}
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
