/**
 * Segment Payload Parser
 *
 * Utility functions for parsing network-level Segment payloads captured
 * via the webRequest API. Segment batches events before sending them
 * over the network, so we need to parse the batch structure.
 *
 * Types are imported from @src/types/segment.ts
 */

// Re-export types for convenience
export type {
  SegmentEventType,
  SegmentProvider,
  SegmentContext,
  SegmentBatchEvent,
  SegmentBatchPayload,
  SegmentEvent,
} from '@src/types/segment';

export { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '@src/types/segment';

import { createContextLogger } from '@src/lib/logger';
import type {
  SegmentProvider,
  SegmentBatchEvent,
  SegmentBatchPayload,
  SegmentEvent,
} from '@src/types/segment';

const log = createContextLogger('background');

// Endpoint patterns for each provider
export const SEGMENT_ENDPOINTS = [
  '*://api.segment.io/*',
  '*://api.segment.com/*',
  '*://*.rudderstack.com/*',
  '*://tracking.dreamdata.cloud/*',
] as const;

/**
 * Detect which analytics provider a URL belongs to
 *
 * @param url - The URL to check
 * @returns The provider type: 'segment', 'rudderstack', 'dreamdata', or 'unknown'
 *
 * @example
 * ```ts
 * detectProvider('https://api.segment.io/v1/batch'); // 'segment'
 * detectProvider('https://hosted.rudderlabs.com/v1/batch'); // 'rudderstack'
 * ```
 */
export function detectProvider(url: string): SegmentProvider {
  if (url.includes('segment.io') || url.includes('segment.com')) {
    return 'segment';
  }
  if (url.includes('rudderstack.com')) {
    return 'rudderstack';
  }
  if (url.includes('dreamdata.cloud')) {
    return 'dreamdata';
  }
  return 'unknown';
}

/**
 * Decode the raw request body from webRequest API
 * The body comes as an array of UploadData objects where bytes can be unknown
 *
 * @param raw - Array of UploadData objects from webRequest API
 * @returns Decoded string or null if decoding fails
 *
 * @example
 * ```ts
 * const body = decodeRequestBody([{ bytes: new TextEncoder().encode('{"test": "data"}') }]);
 * // Returns: '{"test": "data"}'
 * ```
 */
export function decodeRequestBody(
  raw: Array<{ bytes?: unknown; file?: string }>
): string | null {
  if (!raw || raw.length === 0) return null;

  try {
    const decoder = new TextDecoder('utf-8');
    const parts = raw
      .filter((part) => part.bytes instanceof ArrayBuffer)
      .map((part) => decoder.decode(part.bytes as ArrayBuffer));

    // Return null if no valid ArrayBuffer parts were found
    if (parts.length === 0) return null;

    return parts.join('');
  } catch (error) {
    log.error('Failed to decode request body', error);
    return null;
  }
}

/**
 * Parse a JSON string into a Segment batch payload
 * Handles both batch format and single event format
 *
 * @param jsonString - JSON string to parse
 * @returns Parsed SegmentBatchPayload or null if parsing/validation fails
 *
 * @example
 * ```ts
 * const payload = parseSegmentPayload('{"batch": [{"type": "track", "event": "Click"}]}');
 * // Returns: { batch: [{ type: 'track', event: 'Click' }], sentAt: '...' }
 * ```
 */
export function parseSegmentPayload(
  jsonString: string
): SegmentBatchPayload | null {
  try {
    const payload = JSON.parse(jsonString);

    // Handle both batch format and single event format
    if (isSegmentPayload(payload)) {
      return payload;
    }

    // Check if it's a single event (not wrapped in batch)
    if (isSingleSegmentEvent(payload)) {
      log.debug('Converting single event to batch format');
      return {
        batch: [payload as SegmentBatchEvent],
        sentAt: new Date().toISOString(),
      };
    }

    log.error('Payload validation failed. Payload structure:', {
      hasPayload: !!payload,
      isObject: typeof payload === 'object' && payload !== null,
      hasBatch: payload && 'batch' in payload,
      batchIsArray: payload && Array.isArray(payload.batch),
      batchLength:
        payload && Array.isArray(payload.batch) ? payload.batch.length : 0,
      keys: payload ? Object.keys(payload) : [],
      firstFewChars: jsonString.substring(0, 200),
    });
    return null;
  } catch (error) {
    log.error(
      'Failed to parse Segment payload JSON:',
      error,
      'String preview:',
      jsonString.substring(0, 200)
    );
    return null;
  }
}

/**
 * Type guard to check if payload is a single Segment event (not batched)
 */
function isSingleSegmentEvent(payload: unknown): boolean {
  if (typeof payload !== 'object' || payload === null) return false;

  const p = payload as Record<string, unknown>;

  // Check if it has the structure of a single event
  return (
    typeof p.type === 'string' &&
    ['track', 'page', 'screen', 'identify', 'group', 'alias'].includes(
      p.type as string
    )
  );
}

/**
 * Type guard to validate a Segment payload structure
 */
function isSegmentPayload(payload: unknown): payload is SegmentBatchPayload {
  if (typeof payload !== 'object' || payload === null) {
    log.debug('Payload is not an object');
    return false;
  }

  const p = payload as Record<string, unknown>;

  // Check for batch array
  if (!Array.isArray(p.batch)) {
    log.debug('Payload does not have a batch array. Keys:', Object.keys(p));
    return false;
  }

  // Validate at least one event in batch
  if (p.batch.length === 0) {
    log.warn('Batch array is empty');
    return false;
  }

  // Validate first event has required fields
  const firstEvent = p.batch[0] as Record<string, unknown>;
  if (typeof firstEvent.type !== 'string') {
    log.error('First event missing type field. Event:', firstEvent);
    return false;
  }

  // Validate event type is a valid Segment event type
  const validTypes = ['track', 'page', 'screen', 'identify', 'group', 'alias'];
  if (!validTypes.includes(firstEvent.type as string)) {
    log.error('First event has invalid type. Event:', firstEvent);
    return false;
  }

  // messageId might be optional in some Segment implementations
  // Let's be more lenient here
  if (!firstEvent.messageId && !firstEvent.message_id) {
    log.debug(
      'First event missing messageId/message_id, but continuing anyway'
    );
  }

  return true;
}

/**
 * Type guard to validate individual batch events
 *
 * Note: messageId is optional here because normalizeEvent can generate
 * a fallback messageId if one is missing. Some Segment implementations
 * (especially custom ones) may not include messageId.
 */
export function isValidBatchEvent(event: unknown): event is SegmentBatchEvent {
  if (typeof event !== 'object' || event === null) return false;

  const e = event as Record<string, unknown>;
  return (
    typeof e.type === 'string' &&
    ['track', 'page', 'screen', 'identify', 'group', 'alias'].includes(e.type)
    // messageId is optional - normalizeEvent handles missing messageId
  );
}

/**
 * Extract the display name for an event
 * Formats the name based on event type
 *
 * @param event - The batch event to extract name from
 * @returns Formatted display name for the event
 *
 * @example
 * ```ts
 * getEventName({ type: 'track', event: 'Button Clicked' }); // 'Button Clicked'
 * getEventName({ type: 'page', name: 'Home' }); // 'Page: Home'
 * getEventName({ type: 'identify', userId: 'user-123' }); // 'Identify: user-123'
 * ```
 */
export function getEventName(event: SegmentBatchEvent): string {
  switch (event.type) {
    case 'track':
      return event.event || 'Unnamed Track';
    case 'page':
      return event.name ? `Page: ${event.name}` : 'Page View';
    case 'screen':
      return event.name ? `Screen: ${event.name}` : 'Screen View';
    case 'identify':
      return event.userId ? `Identify: ${event.userId}` : 'Identify';
    case 'group':
      return event.groupId ? `Group: ${event.groupId}` : 'Group';
    case 'alias':
      return 'Alias';
    default:
      return 'Unknown';
  }
}

/**
 * Convert a batch event to our normalized SegmentEvent format
 * Generates fallback messageId if missing
 *
 * @param batchEvent - The batch event to normalize
 * @param tabId - Tab ID where event was captured
 * @param url - URL where event was fired
 * @param sentAt - ISO timestamp when event was sent
 * @param provider - Analytics provider (segment, rudderstack, etc.)
 * @returns Normalized SegmentEvent object
 *
 * @example
 * ```ts
 * const event = normalizeEvent(
 *   { type: 'track', event: 'Click', messageId: 'msg-123' },
 *   1,
 *   'https://example.com',
 *   '2024-01-01T00:00:00Z',
 *   'segment'
 * );
 * ```
 */
export function normalizeEvent(
  batchEvent: SegmentBatchEvent,
  tabId: number,
  url: string,
  sentAt: string,
  provider: SegmentProvider
): SegmentEvent {
  // Use messageId directly as the unique identifier
  // Generate one if not present (though all Segment events should have messageId)
  const messageId =
    batchEvent.messageId ||
    `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: messageId,
    type: batchEvent.type,
    name: getEventName(batchEvent),
    properties: batchEvent.properties || {},
    traits: batchEvent.traits,
    anonymousId: batchEvent.anonymousId,
    userId: batchEvent.userId,
    groupId: batchEvent.groupId,
    messageId,
    timestamp: batchEvent.timestamp || new Date().toISOString(),
    sentAt,
    context: batchEvent.context || {
      library: { name: 'unknown', version: 'unknown' },
    },
    integrations: batchEvent.integrations,
    tabId,
    capturedAt: Date.now(),
    url,
    provider,
    rawPayload: batchEvent,
  };
}

/**
 * Process a complete Segment batch and return normalized events
 * Filters invalid events and normalizes each one
 *
 * @param payload - The Segment batch payload
 * @param tabId - Tab ID where events were captured
 * @param url - URL where events were fired
 * @param provider - Analytics provider
 * @returns Array of normalized SegmentEvent objects
 *
 * @example
 * ```ts
 * const events = processBatchPayload(
 *   { batch: [{ type: 'track', event: 'Click' }], sentAt: '2024-01-01T00:00:00Z' },
 *   1,
 *   'https://example.com',
 *   'segment'
 * );
 * ```
 */
export function processBatchPayload(
  payload: SegmentBatchPayload,
  tabId: number,
  url: string,
  provider: SegmentProvider
): SegmentEvent[] {
  return payload.batch
    .filter(isValidBatchEvent)
    .map((event) =>
      normalizeEvent(event, tabId, url, payload.sentAt, provider)
    );
}
