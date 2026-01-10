/**
 * Extension Message Types
 *
 * Centralized type definitions for all messages used in extension communication
 * between background script, DevTools panel, popup, and content scripts.
 */

import type { SegmentEvent } from '@src/lib';

// All message types used in extension communication
export type MessageType =
  | 'GET_EVENTS'
  | 'CLEAR_EVENTS'
  | 'GET_EVENT_COUNT'
  | 'EVENTS_CAPTURED'
  | 'RELOAD_DETECTED'
  | 'GET_TAB_DOMAIN'
  | 'DOMAIN_CHANGED'
  | 'RE_EVALUATE_TAB_DOMAIN';

// Base message interface
export interface BaseMessage {
  type: MessageType;
  tabId?: number;
}

// Specific message types with typed payloads
export interface GetEventsMessage extends BaseMessage {
  type: 'GET_EVENTS';
  tabId: number;
}

export interface ClearEventsMessage extends BaseMessage {
  type: 'CLEAR_EVENTS';
  tabId: number;
}

export interface GetEventCountMessage extends BaseMessage {
  type: 'GET_EVENT_COUNT';
  tabId: number;
}

export interface EventsCapturedMessage extends BaseMessage {
  type: 'EVENTS_CAPTURED';
  payload: {
    tabId: number;
    events: SegmentEvent[];
  };
}

export interface ReloadDetectedMessage extends BaseMessage {
  type: 'RELOAD_DETECTED';
  tabId: number;
  timestamp: number;
}

export interface GetTabDomainMessage extends BaseMessage {
  type: 'GET_TAB_DOMAIN';
  tabId: number;
}

export interface DomainChangedMessage extends BaseMessage {
  type: 'DOMAIN_CHANGED';
  tabId: number;
  domain: string | null;
}

export interface ReEvaluateTabDomainMessage extends BaseMessage {
  type: 'RE_EVALUATE_TAB_DOMAIN';
  tabId: number;
}

// Union of all messages
export type ExtensionMessage =
  | GetEventsMessage
  | ClearEventsMessage
  | GetEventCountMessage
  | EventsCapturedMessage
  | ReloadDetectedMessage
  | GetTabDomainMessage
  | DomainChangedMessage
  | ReEvaluateTabDomainMessage;

// Type guards
export function isExtensionMessage(msg: unknown): msg is ExtensionMessage {
  if (typeof msg !== 'object' || msg === null) {
    return false;
  }

  const m = msg as Record<string, unknown>;
  if (typeof m.type !== 'string') {
    return false;
  }

  const validTypes: MessageType[] = [
    'GET_EVENTS',
    'CLEAR_EVENTS',
    'GET_EVENT_COUNT',
    'EVENTS_CAPTURED',
    'RELOAD_DETECTED',
    'GET_TAB_DOMAIN',
    'DOMAIN_CHANGED',
    'RE_EVALUATE_TAB_DOMAIN',
  ];

  return validTypes.includes(m.type as MessageType);
}

export function isGetEventsMessage(msg: unknown): msg is GetEventsMessage {
  return (
    isExtensionMessage(msg) &&
    msg.type === 'GET_EVENTS' &&
    typeof msg.tabId === 'number'
  );
}

export function isClearEventsMessage(msg: unknown): msg is ClearEventsMessage {
  return (
    isExtensionMessage(msg) &&
    msg.type === 'CLEAR_EVENTS' &&
    typeof msg.tabId === 'number'
  );
}

export function isGetEventCountMessage(
  msg: unknown
): msg is GetEventCountMessage {
  return (
    isExtensionMessage(msg) &&
    msg.type === 'GET_EVENT_COUNT' &&
    typeof msg.tabId === 'number'
  );
}

export function isEventsCapturedMessage(
  msg: unknown
): msg is EventsCapturedMessage {
  if (!isExtensionMessage(msg) || msg.type !== 'EVENTS_CAPTURED') {
    return false;
  }

  // Cast through unknown first to access payload property
  const m = msg as unknown as Record<string, unknown>;
  const payload = m.payload;

  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const p = payload as Record<string, unknown>;
  return typeof p.tabId === 'number' && Array.isArray(p.events);
}

export function isReloadDetectedMessage(
  msg: unknown
): msg is ReloadDetectedMessage {
  return (
    isExtensionMessage(msg) &&
    msg.type === 'RELOAD_DETECTED' &&
    typeof (msg as ReloadDetectedMessage).tabId === 'number' &&
    typeof (msg as ReloadDetectedMessage).timestamp === 'number'
  );
}

export function isGetTabDomainMessage(
  msg: unknown
): msg is GetTabDomainMessage {
  return (
    isExtensionMessage(msg) &&
    msg.type === 'GET_TAB_DOMAIN' &&
    typeof (msg as GetTabDomainMessage).tabId === 'number'
  );
}

export function isDomainChangedMessage(
  msg: unknown
): msg is DomainChangedMessage {
  return (
    isExtensionMessage(msg) &&
    msg.type === 'DOMAIN_CHANGED' &&
    typeof (msg as DomainChangedMessage).tabId === 'number'
  );
}

export function isReEvaluateTabDomainMessage(
  msg: unknown
): msg is ReEvaluateTabDomainMessage {
  return (
    isExtensionMessage(msg) &&
    msg.type === 'RE_EVALUATE_TAB_DOMAIN' &&
    typeof (msg as ReEvaluateTabDomainMessage).tabId === 'number'
  );
}
