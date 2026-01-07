/**
 * Event Bucket Categorization System
 * 
 * Categorizes Segment events into visual buckets based on event name patterns.
 * Designed to be easily configurable in the future via user settings.
 */

import type { SegmentEvent, SegmentEventType } from '@src/types/segment';

/**
 * Event bucket categories for visual color coding
 */
export type EventBucket =
  | 'page'
  | 'view'
  | 'interaction'
  | 'identify'
  | 'navigation'
  | 'conversion'
  | 'error'
  | 'default';

/**
 * Bucket configuration with patterns and color
 */
export interface EventBucketConfig {
  id: EventBucket;
  label: string;
  color: string; // Tailwind color class for border-left
  patterns: string[]; // Case-insensitive patterns to match in event name
  eventTypes?: SegmentEventType[]; // Optional: also match by event type
}

/**
 * Default bucket configurations
 * These can later be moved to user-configurable settings
 */
export const DEFAULT_EVENT_BUCKETS: EventBucketConfig[] = [
  {
    id: 'page',
    label: 'Page Events',
    color: 'border-l-emerald-500',
    patterns: [],
    eventTypes: ['page'],
  },
  {
    id: 'identify',
    label: 'Identify Events',
    color: 'border-l-purple-500',
    patterns: ['identify'],
    eventTypes: ['identify', 'group', 'alias'],
  },
  {
    id: 'view',
    label: 'View Events',
    color: 'border-l-cyan-500',
    patterns: ['view', 'viewed'],
  },
  {
    id: 'interaction',
    label: 'User Interactions',
    color: 'border-l-orange-500',
    patterns: [
      'click',
      'toggled',
      'toggle',
      'select',
      'selected',
      'submit',
      'submit',
      'press',
      'pressed',
      'interact',
      'interaction',
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    color: 'border-l-indigo-500',
    patterns: ['navigate', 'navigation', 'route', 'routed'],
  },
  {
    id: 'conversion',
    label: 'Conversions',
    color: 'border-l-green-500',
    patterns: [
      'purchase',
      'checkout',
      'complete',
      'completed',
      'conversion',
      'convert',
      'order',
      'paid',
    ],
  },
  {
    id: 'error',
    label: 'Errors',
    color: 'border-l-red-500',
    patterns: ['error', 'fail', 'failed', 'exception', 'warning'],
  },
  {
    id: 'default',
    label: 'Default',
    color: 'border-l-gray-500',
    patterns: [],
  },
];

/**
 * Categorize an event into a bucket based on its name and type
 * Returns the first matching bucket, or 'default' if no match
 * 
 * @param event - The Segment event to categorize
 * @param buckets - Optional custom bucket configurations (defaults to DEFAULT_EVENT_BUCKETS)
 * @returns The bucket ID for the event
 */
export function categorizeEvent(
  event: SegmentEvent,
  buckets: EventBucketConfig[] = DEFAULT_EVENT_BUCKETS
): EventBucket {
  const eventNameLower = event.name.toLowerCase();
  
  // Check buckets in order (first match wins)
  for (const bucket of buckets) {
    // Check event type match first (if specified)
    if (bucket.eventTypes && bucket.eventTypes.includes(event.type)) {
      return bucket.id;
    }
    
    // Check pattern matches in event name
    for (const pattern of bucket.patterns) {
      const patternLower = pattern.toLowerCase();
      if (eventNameLower.includes(patternLower)) {
        return bucket.id;
      }
    }
  }
  
  return 'default';
}

/**
 * Get the bucket configuration for a given bucket ID
 * 
 * @param bucketId - The bucket ID to look up
 * @param buckets - Optional custom bucket configurations
 * @returns The bucket configuration, or undefined if not found
 */
export function getBucketConfig(
  bucketId: EventBucket,
  buckets: EventBucketConfig[] = DEFAULT_EVENT_BUCKETS
): EventBucketConfig | undefined {
  return buckets.find((b) => b.id === bucketId);
}

/**
 * Get the color class for a bucket
 * 
 * @param bucketId - The bucket ID
 * @param buckets - Optional custom bucket configurations
 * @returns The Tailwind color class for the border-left, or empty string for default
 */
export function getBucketColor(
  bucketId: EventBucket,
  buckets: EventBucketConfig[] = DEFAULT_EVENT_BUCKETS
): string {
  const config = getBucketConfig(bucketId, buckets);
  return config?.color ?? '';
}

