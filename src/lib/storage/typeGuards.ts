/**
 * Storage Type Guards
 * 
 * Type guards for validating storage data structures
 */

import type { SegmentEvent } from '@src/types';

/**
 * Type guard to check if a value is a valid SegmentEvent array
 * 
 * @param value - Value to check
 * @returns true if value is an array of SegmentEvent objects
 */
export function isSegmentEventArray(value: unknown): value is SegmentEvent[] {
  if (!Array.isArray(value)) {
    return false;
  }

  // Check if all items are objects with required SegmentEvent fields
  return value.every((item) => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }

    const event = item as Record<string, unknown>;
    return (
      typeof event.id === 'string' &&
      typeof event.type === 'string' &&
      typeof event.name === 'string' &&
      typeof event.tabId === 'number' &&
      typeof event.capturedAt === 'number'
    );
  });
}

/**
 * Type guard to check if a value is a valid stored events object
 * Maps tabId (as string) to SegmentEvent arrays
 * 
 * @param value - Value to check
 * @returns true if value is a valid stored events object
 */
export function isStoredEvents(value: unknown): value is Record<string, SegmentEvent[]> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const obj = value as Record<string, unknown>;
  
  // Check all values are SegmentEvent arrays
  return Object.values(obj).every((val) => isSegmentEventArray(val));
}

/**
 * Type guard to check if a value is a valid number array (for reload timestamps)
 * 
 * @param value - Value to check
 * @returns true if value is an array of numbers
 */
export function isNumberArray(value: unknown): value is number[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((item) => typeof item === 'number');
}

/**
 * Type guard to check if a value is a valid storage adapter result
 * 
 * @param value - Value to check
 * @returns true if value is a valid storage result object
 */
export function isStorageResult(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
