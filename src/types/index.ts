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

// Extension message types
export type {
  MessageType,
  BaseMessage,
  GetEventsMessage,
  ClearEventsMessage,
  GetEventCountMessage,
  EventsCapturedMessage,
  ReloadDetectedMessage,
  GetTabDomainMessage,
  DomainChangedMessage,
  ReEvaluateTabDomainMessage,
  ExtensionMessage,
} from './messages';

// View mode type for event detail views
export type ViewMode = 'json' | 'structured';

export {
  isExtensionMessage,
  isGetEventsMessage,
  isClearEventsMessage,
  isGetEventCountMessage,
  isEventsCapturedMessage,
  isReloadDetectedMessage,
  isGetTabDomainMessage,
  isDomainChangedMessage,
  isReEvaluateTabDomainMessage,
} from './messages';
