import { useState, useRef, useCallback } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';
import type { SegmentEvent } from '@src/types/segment';
import type { ListItem } from './types';
import { ROW_HEADER_HEIGHT, STICKY_SHOW_THRESHOLD, STICKY_HIDE_THRESHOLD } from './types';

interface UseStickyHeaderParams {
  listItems: ListItem[];
  expandedEventIds: Set<string>;
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  onToggleExpand: (id: string) => void;
}

interface UseStickyHeaderReturn {
  stickyEvent: SegmentEvent | null;
  stickyEventIndex: number | null;
  handleScroll: (scrollTop: number) => void;
  handleStickyHeaderClick: () => void;
  clearSticky: () => void;
}

/**
 * Hook for managing sticky header behavior when expanded events scroll out of view
 * Detects when an expanded event's header has scrolled out of view and shows a sticky header
 */
export function useStickyHeader({
  listItems,
  expandedEventIds,
  virtualizer,
  scrollContainerRef,
  onToggleExpand,
}: UseStickyHeaderParams): UseStickyHeaderReturn {
  const [stickyEvent, setStickyEvent] = useState<SegmentEvent | null>(null);
  const [stickyEventIndex, setStickyEventIndex] = useState<number | null>(null);
  // Track current sticky event ID to avoid unnecessary state updates
  const currentStickyIdRef = useRef<string | null>(null);

  /**
   * Handle scroll to detect if user has scrolled up and manage sticky header
   * This should be called from the main scroll handler
   */
  const handleScroll = useCallback(
    (scrollTop: number) => {
      // Check for expanded events whose headers have scrolled out of view
      const virtualItems = virtualizer.getVirtualItems();
      let foundStickyEvent: SegmentEvent | null = null;
      let foundStickyIndex: number | null = null;

      for (const virtualItem of virtualItems) {
        const item = listItems[virtualItem.index];
        if (!item || item.type !== 'event') continue;

        const event = item.event;
        if (!expandedEventIds.has(event.id)) continue;

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
    },
    [listItems, expandedEventIds, virtualizer]
  );

  /**
   * Clear sticky state (useful when collapsing or scrolling)
   */
  const clearSticky = useCallback(() => {
    currentStickyIdRef.current = null;
    setStickyEvent(null);
    setStickyEventIndex(null);
  }, []);

  /**
   * Handle click on sticky header: collapse and scroll to the event
   */
  const handleStickyHeaderClick = useCallback(() => {
    if (stickyEvent && stickyEventIndex !== null) {
      const eventId = stickyEvent.id;
      const indexToScrollTo = stickyEventIndex;

      // Clear sticky state first (including ref to prevent race conditions)
      clearSticky();

      // Collapse the event
      onToggleExpand(eventId);

      // Scroll to make the collapsed event visible (after collapse animation)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(indexToScrollTo, {
            align: 'start',
          });
        });
      });
    }
  }, [stickyEvent, stickyEventIndex, onToggleExpand, virtualizer, clearSticky]);

  return {
    stickyEvent,
    stickyEventIndex,
    handleScroll,
    handleStickyHeaderClick,
    clearSticky,
  };
}
