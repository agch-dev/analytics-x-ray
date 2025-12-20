/**
 * Segment Analytics Types
 *
 * Shared type definitions for Segment events captured at the network level.
 * These types reflect the actual payload structure that Segment sends over the wire.
 */

// Segment event types
export type SegmentEventType =
  | 'track'
  | 'page'
  | 'screen'
  | 'identify'
  | 'group'
  | 'alias';

// Supported analytics providers
export type SegmentProvider =
  | 'segment'
  | 'rudderstack'
  | 'dreamdata'
  | 'unknown';

// Context added by Segment SDK (enriched data sent over network)
export interface SegmentContext {
  library: {
    name: string;
    version: string;
  };
  page?: {
    path: string;
    referrer: string;
    search: string;
    title: string;
    url: string;
  };
  userAgent?: string;
  locale?: string;
  timezone?: string;
  ip?: string;
  campaign?: Record<string, string>;
  device?: Record<string, unknown>;
  os?: Record<string, unknown>;
  app?: Record<string, unknown>;
}

// Individual event as it appears in a Segment batch (network payload)
export interface SegmentBatchEvent {
  type: SegmentEventType;
  event?: string; // For track events
  name?: string; // For page/screen events
  properties?: Record<string, unknown>;
  traits?: Record<string, unknown>; // For identify/group events
  anonymousId?: string;
  userId?: string;
  messageId?: string; // Optional - some implementations may not include it
  timestamp?: string; // Optional - will be generated if missing
  context?: SegmentContext; // Optional - will have defaults if missing
  integrations?: Record<string, boolean | Record<string, unknown>>;
}

// Full batch payload sent by Segment over the network
export interface SegmentBatchPayload {
  batch: SegmentBatchEvent[];
  sentAt: string;
  writeKey?: string;
}

// Normalized event for extension display and storage
// This is the primary type used throughout the extension UI
export interface SegmentEvent {
  // Core event data (from Segment)
  id: string;
  type: SegmentEventType;
  name: string;
  properties: Record<string, unknown>;
  traits?: Record<string, unknown>;
  anonymousId?: string;
  userId?: string;
  messageId: string;
  timestamp: string;
  sentAt: string;
  context: SegmentContext;
  integrations?: Record<string, boolean | Record<string, unknown>>;

  // Extension metadata
  tabId: number;
  capturedAt: number;
  url: string;
  provider: SegmentProvider;

  // Original payload for debugging
  rawPayload: SegmentBatchEvent;
}

// Badge colors for event types (Tailwind classes)
export const EVENT_TYPE_COLORS: Record<SegmentEventType, string> = {
  track: 'bg-blue-500',
  page: 'bg-green-500',
  screen: 'bg-teal-500',
  identify: 'bg-purple-500',
  group: 'bg-amber-500',
  alias: 'bg-gray-500',
};

// Human-readable labels for event types
export const EVENT_TYPE_LABELS: Record<SegmentEventType, string> = {
  track: 'Track',
  page: 'Page',
  screen: 'Screen',
  identify: 'Identify',
  group: 'Group',
  alias: 'Alias',
};

