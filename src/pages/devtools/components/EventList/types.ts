import type { SegmentEvent } from '@src/types/segment';

/**
 * Union type for list items (events or dividers)
 */
export type ListItem =
  | { type: 'event'; event: SegmentEvent; index: number }
  | {
      type: 'divider';
      event: SegmentEvent;
      previousEvent?: SegmentEvent;
      isReload: boolean;
      timestamp: number;
      index: number;
    };

/**
 * Height constants for virtualization calculations
 */
export const ROW_HEADER_HEIGHT = 39;
export const ROW_GAP = 8; // 0.5rem / 8px
export const DIVIDER_HEIGHT = 36; // ~32-40px as specified

/**
 * Hysteresis thresholds for sticky header to prevent flickering
 */
export const STICKY_SHOW_THRESHOLD = 50; // Need this much visible to SHOW sticky
export const STICKY_HIDE_THRESHOLD = 10; // Need less than this to HIDE sticky
