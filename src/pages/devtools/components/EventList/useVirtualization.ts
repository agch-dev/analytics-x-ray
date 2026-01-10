import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
import {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
  type RefObject,
} from 'react';

import { urlsAreDifferent } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types';

import {
  ROW_HEADER_HEIGHT,
  ROW_GAP,
  DIVIDER_HEIGHT,
  type ListItem,
} from './types';

interface UseVirtualizationParams {
  events: SegmentEvent[];
  reloadTimestamps: number[];
  expandedEventIds: Set<string>;
  scrollContainerRef: RefObject<HTMLDivElement>;
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

      // Check if we need a divider before this event
      let needsDivider = false;
      let isReload = false;
      let reloadTimestamp = 0;
      let hasPathChange = false;

      // Check for path change first
      if (previousEvent && urlsAreDifferent(previousEvent, event)) {
        needsDivider = true;
        hasPathChange = true;
      }

      // Check for reload between events
      // Only mark as reload if there's NO path change (reload on same page)
      if (previousEvent && !hasPathChange) {
        // Check if any reload timestamp falls between these two events
        for (const reloadTs of reloadTimestamps) {
          if (
            reloadTs > previousEvent.capturedAt &&
            reloadTs <= event.capturedAt
          ) {
            needsDivider = true;
            isReload = true;
            reloadTimestamp = reloadTs;
            break;
          }
        }
      }

      // Insert divider if needed
      if (needsDivider) {
        items.push({
          type: 'divider',
          event,
          previousEvent,
          isReload,
          timestamp: reloadTimestamp || event.capturedAt,
          index: items.length,
        });
      }

      // Add the event
      items.push({
        type: 'event',
        event,
        index: items.length,
      });
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
    shouldAutoScrollRef.current = atBottom;
    setIsAtBottom(atBottom);
    onScrollStateChange?.(atBottom);
  }, [onScrollStateChange, scrollContainerRef]);

  // Scroll to bottom of the list
  const scrollToBottom = useCallback(() => {
    if (listItems.length > 0) {
      // Use setTimeout to ensure virtualizer is ready
      setTimeout(() => {
        virtualizer.scrollToIndex(listItems.length - 1, {
          align: 'end',
          behavior: 'auto',
        });
      }, 0);
      shouldAutoScrollRef.current = true;
    }
  }, [listItems.length, virtualizer]);

  // Remeasure all items (useful after expansion state changes)
  const remeasureItems = useCallback(() => {
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
  }, [virtualizer]);

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

    // Use a small timeout to ensure virtualizer has measured items
    const timeoutId = setTimeout(() => {
      virtualizer.scrollToIndex(listItems.length - 1, {
        align: 'end',
        behavior: 'auto', // Use 'auto' instead of 'smooth' for more reliable scrolling
      });
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [listItems.length, virtualizer]);

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
  }, [expandedEventIds.size, listItems.length, virtualizer]);

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
