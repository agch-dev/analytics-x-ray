import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  type RefObject,
} from 'react';

import { urlsAreDifferent } from '@src/lib';
import type { SegmentEvent } from '@src/types';

import {
  ROW_HEADER_HEIGHT,
  ROW_GAP,
  DIVIDER_HEIGHT,
  type ListItem,
} from './types';

/**
 * Checks if a reload timestamp falls between two events
 */
function findReloadTimestamp(
  previousEvent: SegmentEvent,
  event: SegmentEvent,
  reloadTimestamps: number[]
): number | null {
  for (const reloadTs of reloadTimestamps) {
    if (reloadTs > previousEvent.capturedAt && reloadTs <= event.capturedAt) {
      return reloadTs;
    }
  }
  return null;
}

/**
 * Determines if a divider should be added before an event
 */
function shouldAddDivider(
  previousEvent: SegmentEvent | undefined,
  event: SegmentEvent,
  reloadTimestamps: number[]
): { needsDivider: boolean; isReload: boolean; timestamp: number } {
  if (!previousEvent) {
    return { needsDivider: false, isReload: false, timestamp: 0 };
  }

  const hasPathChange = urlsAreDifferent(previousEvent, event);
  if (hasPathChange) {
    return {
      needsDivider: true,
      isReload: false,
      timestamp: event.capturedAt,
    };
  }

  const reloadTimestamp = findReloadTimestamp(
    previousEvent,
    event,
    reloadTimestamps
  );
  if (reloadTimestamp !== null) {
    return {
      needsDivider: true,
      isReload: true,
      timestamp: reloadTimestamp,
    };
  }

  return { needsDivider: false, isReload: false, timestamp: 0 };
}

/**
 * Creates a divider list item
 */
function createDividerItem(
  event: SegmentEvent,
  previousEvent: SegmentEvent | undefined,
  isReload: boolean,
  timestamp: number,
  index: number
): ListItem {
  return {
    type: 'divider',
    event,
    previousEvent,
    isReload,
    timestamp,
    index,
  };
}

/**
 * Creates an event list item
 */
function createEventItem(event: SegmentEvent, index: number): ListItem {
  return {
    type: 'event',
    event,
    index,
  };
}

interface UseVirtualizationParams {
  events: SegmentEvent[];
  reloadTimestamps: number[];
  expandedEventIds: Set<string>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onScrollStateChange?: (isAtBottom: boolean) => void;
}

interface UseVirtualizationReturn {
  listItems: ListItem[];
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  itemRefs: { current: Map<number, HTMLDivElement> };
  shouldAutoScrollRef: { current: boolean };
  isAtBottom: boolean;
  handleScroll: () => void;
  scrollToBottom: () => void;
  remeasureItems: () => void;
}

/**
 * Hook for managing virtualization of the event list
 * Handles list item transformation, virtualizer setup, auto-scroll, and remeasurement
 */
export function useVirtualization({
  events,
  reloadTimestamps,
  expandedEventIds,
  scrollContainerRef,
  onScrollStateChange,
}: UseVirtualizationParams): UseVirtualizationReturn {
  const shouldAutoScrollRef = useRef(true);
  // Track when we're programmatically scrolling to prevent scroll handler from disengaging auto-scroll
  const isProgrammaticScrollRef = useRef(false);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Reverse events so newest is at bottom
  const reversedEvents = useMemo(() => [...events].reverse(), [events]);

  // Transform events into list items (events + dividers)
  const listItems = useMemo(() => {
    const items: ListItem[] = [];

    for (let i = 0; i < reversedEvents.length; i++) {
      const event = reversedEvents[i];
      const previousEvent = i > 0 ? reversedEvents[i - 1] : undefined;

      const dividerInfo = shouldAddDivider(
        previousEvent,
        event,
        reloadTimestamps
      );

      if (dividerInfo.needsDivider) {
        items.push(
          createDividerItem(
            event,
            previousEvent,
            dividerInfo.isReload,
            dividerInfo.timestamp,
            items.length
          )
        );
      }

      items.push(createEventItem(event, items.length));
    }

    return items;
  }, [reversedEvents, reloadTimestamps]);

  // Dynamic size estimation based on item type and expansion state
  const getEstimatedSize = useCallback(
    (index: number) => {
      const item = listItems[index];
      if (!item) return ROW_HEADER_HEIGHT + ROW_GAP;

      if (item.type === 'divider') {
        return DIVIDER_HEIGHT + ROW_GAP;
      }

      // Base height + expanded height (rough estimate for JSON viewer) + gap
      const baseHeight = expandedEventIds.has(item.event.id)
        ? 400
        : ROW_HEADER_HEIGHT;
      return baseHeight + ROW_GAP;
    },
    [listItems, expandedEventIds]
  );

  // Set up virtualizer with dynamic measurement
  const virtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: getEstimatedSize,
    overscan: 5, // Render 5 extra items above and below viewport
    // Measure actual element height for accurate positioning
    measureElement: (element) => {
      return (
        element?.getBoundingClientRect().height ?? ROW_HEADER_HEIGHT + ROW_GAP
      );
    },
  });

  // Handle scroll to detect if user has scrolled up and track scroll state
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;

    // Only update auto-scroll state if this is a user-initiated scroll
    // During programmatic scrolls, we don't want to disengage auto-scroll
    if (!isProgrammaticScrollRef.current) {
      shouldAutoScrollRef.current = atBottom;
    }

    setIsAtBottom(atBottom);
    onScrollStateChange?.(atBottom);
  }, [onScrollStateChange, scrollContainerRef]);

  // Scroll to bottom of the list
  const scrollToBottom = useCallback(() => {
    if (listItems.length > 0) {
      isProgrammaticScrollRef.current = true;
      shouldAutoScrollRef.current = true;

      // Use requestAnimationFrame to ensure DOM is ready, then scroll
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(listItems.length - 1, {
          align: 'end',
          behavior: 'smooth',
        });

        // Clear programmatic scroll flag after scroll settles
        // Use a timeout to allow scroll to complete
        setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 100);
      });
    }
  }, [listItems.length, virtualizer]);

  // Helper function to measure all items after DOM updates
  const measureAllItems = useCallback(() => {
    itemRefs.current.forEach((element) => {
      if (element) {
        virtualizer.measureElement(element);
      }
    });
    virtualizer.measure();
  }, [virtualizer]);

  // Remeasure all items (useful after expansion state changes)
  const remeasureItems = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(measureAllItems);
    });
  }, [measureAllItems]);

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
  }, [onScrollStateChange, scrollContainerRef]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (!shouldAutoScrollRef.current || listItems.length === 0) return;

    isProgrammaticScrollRef.current = true;

    // Scroll to bottom with retry to ensure we actually reach the bottom
    // The virtualizer may not have measured new items immediately
    const scrollToEnd = () => {
      virtualizer.scrollToIndex(listItems.length - 1, {
        align: 'end',
        behavior: 'auto',
      });
    };

    // Initial scroll attempt
    scrollToEnd();

    // Retry after a short delay to handle cases where items weren't measured yet
    const retryTimeoutId = setTimeout(() => {
      scrollToEnd();

      // Final verification and cleanup
      setTimeout(() => {
        // One more scroll to ensure we're at the very bottom
        const container = scrollContainerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const atBottom = scrollHeight - scrollTop - clientHeight < 50;

          // If we're still not at the bottom, force scroll to the end
          if (!atBottom && shouldAutoScrollRef.current) {
            container.scrollTop = scrollHeight - clientHeight;
          }
        }

        isProgrammaticScrollRef.current = false;
      }, 50);
    }, 50);

    return () => {
      clearTimeout(retryTimeoutId);
      isProgrammaticScrollRef.current = false;
    };
  }, [listItems.length, virtualizer, scrollContainerRef]);

  // Recalculate virtualizer when expansion state changes
  useEffect(() => {
    // Use double requestAnimationFrame to ensure DOM has fully updated after React render
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(measureAllItems);
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [expandedEventIds.size, listItems.length, measureAllItems]);

  return {
    listItems,
    virtualizer,
    itemRefs,
    shouldAutoScrollRef,
    isAtBottom,
    handleScroll,
    scrollToBottom,
    remeasureItems,
  };
}
