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

import type {
  SegmentProvider,
  SegmentBatchEvent,
  SegmentBatchPayload,
  SegmentEvent,
} from '@src/types/segment';

// Endpoint patterns for each provider
export const SEGMENT_ENDPOINTS = [
  '*://api.segment.io/*',
  '*://api.segment.com/*',
  '*://*.rudderstack.com/*',
  '*://tracking.dreamdata.cloud/*',
] as const;

/**
 * Detect which analytics provider a URL belongs to
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
    return parts.join('');
  } catch {
    console.error('[analytics-x-ray] Failed to decode request body');
    return null;
  }
}

/**
 * Parse a JSON string into a Segment batch payload
 */
export function parseSegmentPayload(
  jsonString: string
): SegmentBatchPayload | null {
  try {
    const payload = JSON.parse(jsonString);

    // Validate it looks like a Segment payload
    if (!isSegmentPayload(payload)) {
      return null;
    }

    return payload;
  } catch {
    console.error('[analytics-x-ray] Failed to parse Segment payload');
    return null;
  }
}

/**
 * Type guard to validate a Segment payload structure
 */
function isSegmentPayload(payload: unknown): payload is SegmentBatchPayload {
  if (typeof payload !== 'object' || payload === null) return false;

  const p = payload as Record<string, unknown>;

  // Check for batch array
  if (!Array.isArray(p.batch)) return false;

  // Validate at least one event in batch
  if (p.batch.length === 0) return false;

  // Validate first event has required fields
  const firstEvent = p.batch[0] as Record<string, unknown>;
  if (typeof firstEvent.type !== 'string') return false;
  if (typeof firstEvent.messageId !== 'string') return false;

  return true;
}

/**
 * Type guard to validate individual batch events
 */
export function isValidBatchEvent(event: unknown): event is SegmentBatchEvent {
  if (typeof event !== 'object' || event === null) return false;

  const e = event as Record<string, unknown>;
  return (
    typeof e.type === 'string' &&
    ['track', 'page', 'screen', 'identify', 'group', 'alias'].includes(
      e.type
    ) &&
    typeof e.messageId === 'string'
  );
}

/**
 * Extract the display name for an event
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
      return 'Group';
    case 'alias':
      return 'Alias';
    default:
      return 'Unknown';
  }
}

/**
 * Convert a batch event to our normalized SegmentEvent format
 */
export function normalizeEvent(
  batchEvent: SegmentBatchEvent,
  tabId: number,
  url: string,
  sentAt: string,
  provider: SegmentProvider
): SegmentEvent {
  return {
    id: `${batchEvent.messageId}_${Date.now()}`,
    type: batchEvent.type,
    name: getEventName(batchEvent),
    properties: batchEvent.properties || {},
    traits: batchEvent.traits,
    anonymousId: batchEvent.anonymousId,
    userId: batchEvent.userId,
    messageId: batchEvent.messageId,
    timestamp: batchEvent.timestamp,
    sentAt,
    context: batchEvent.context,
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
 */
export function processBatchPayload(
  payload: SegmentBatchPayload,
  tabId: number,
  url: string,
  provider: SegmentProvider
): SegmentEvent[] {
  return payload.batch
    .filter(isValidBatchEvent)
    .map((event) => normalizeEvent(event, tabId, url, payload.sentAt, provider));
}
