/**
 * Type exports
 *
 * Central export point for all shared types.
 */

// Segment analytics types
export type {
  SegmentEventType,
  SegmentProvider,
  SegmentContext,
  SegmentBatchEvent,
  SegmentBatchPayload,
  SegmentEvent,
} from './segment';

export { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from './segment';

// Extension message types
export type {
  MessageType,
  BaseMessage,
  GetEventsMessage,
  ClearEventsMessage,
  GetEventCountMessage,
  EventsCapturedMessage,
  ExtensionMessage,
} from './messages';

export {
  isExtensionMessage,
  isGetEventsMessage,
  isClearEventsMessage,
  isGetEventCountMessage,
  isEventsCapturedMessage,
} from './messages';

