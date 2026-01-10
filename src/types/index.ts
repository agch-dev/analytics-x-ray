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
} from '@src/lib/parsing/segment';

export { EVENT_TYPE_COLORS, EVENT_TYPE_LABELS } from '@src/lib/parsing/segment';

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

