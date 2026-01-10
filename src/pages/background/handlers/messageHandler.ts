/**
 * Message Handler
 *
 * Handles runtime messages from content scripts, popup, and DevTools panel.
 */

import Browser from 'webextension-polyfill';

import { createContextLogger } from '@src/lib/logger';
import {
  isExtensionMessage,
  isGetEventsMessage,
  isClearEventsMessage,
  isGetEventCountMessage,
  isGetTabDomainMessage,
  isReEvaluateTabDomainMessage,
} from '@src/types';

import {
  tabEvents,
  getEventsForTab,
  clearEventsForTab,
} from '../utils/eventStorage';

import { getTabDomain, handleReEvaluateTabDomain } from './domainHandler';

const log = createContextLogger('background');

/**
 * Extract tab ID from message or sender
 */
function getTabId(
  message: { tabId?: number },
  sender: Browser.Runtime.MessageSender
): number | undefined {
  return message.tabId ?? sender.tab?.id;
}

/**
 * Handle GET_EVENTS message
 */
function handleGetEvents(
  message: { tabId?: number },
  sender: Browser.Runtime.MessageSender
): Promise<unknown> {
  const tabId = getTabId(message, sender);
  if (typeof tabId === 'number') {
    log.debug(`📤 Responding with events for tab ${tabId}`);
    return getEventsForTab(tabId).then((events) => {
      log.debug(`✅ Sent ${events.length} events for tab ${tabId}`);
      return events;
    });
  }
  log.warn(`⚠️ GET_EVENTS: No valid tabId`);
  return Promise.resolve([]);
}

/**
 * Handle CLEAR_EVENTS message
 */
function handleClearEvents(
  message: { tabId?: number },
  sender: Browser.Runtime.MessageSender
): Promise<unknown> {
  const tabId = getTabId(message, sender);
  if (typeof tabId === 'number') {
    log.info(`🗑️ Clearing events for tab ${tabId}`);
    return clearEventsForTab(tabId);
  }
  return Promise.resolve();
}

/**
 * Handle GET_EVENT_COUNT message
 */
function handleGetEventCount(
  message: { tabId?: number },
  sender: Browser.Runtime.MessageSender
): Promise<unknown> {
  const tabId = getTabId(message, sender);
  if (typeof tabId === 'number') {
    const events = tabEvents.get(tabId) || [];
    log.debug(`📊 Event count for tab ${tabId}: ${events.length}`);
    return Promise.resolve(events.length);
  }
  return Promise.resolve(0);
}

/**
 * Handle GET_TAB_DOMAIN message
 */
function handleGetTabDomain(
  message: { tabId?: number },
  sender: Browser.Runtime.MessageSender
): Promise<unknown> {
  const tabId = getTabId(message, sender);
  if (typeof tabId === 'number') {
    return getTabDomain(tabId);
  }
  return Promise.resolve(null);
}

/**
 * Handle RE_EVALUATE_TAB_DOMAIN message
 */
function handleReEvaluateTabDomainMessage(
  message: { tabId?: number },
  sender: Browser.Runtime.MessageSender
): Promise<unknown> {
  const tabId = getTabId(message, sender);
  if (typeof tabId === 'number') {
    return handleReEvaluateTabDomain(tabId);
  }
  log.warn(`⚠️ RE_EVALUATE_TAB_DOMAIN: No valid tabId`);
  return Promise.resolve(false);
}

/**
 * Route message to appropriate handler
 */
function routeMessage(
  message: unknown,
  sender: Browser.Runtime.MessageSender
): Promise<unknown> {
  if (isGetEventsMessage(message)) {
    return handleGetEvents(message, sender);
  }
  if (isClearEventsMessage(message)) {
    return handleClearEvents(message, sender);
  }
  if (isGetEventCountMessage(message)) {
    return handleGetEventCount(message, sender);
  }
  if (isGetTabDomainMessage(message)) {
    return handleGetTabDomain(message, sender);
  }
  if (isReEvaluateTabDomainMessage(message)) {
    return handleReEvaluateTabDomainMessage(message, sender);
  }
  return Promise.resolve(false);
}

/**
 * Set up message listener for runtime messages
 */
export function setupMessageListener(): void {
  Browser.runtime.onMessage.addListener(
    (
      message: unknown,
      sender: Browser.Runtime.MessageSender
    ): Promise<unknown> => {
      // Use type guard instead of type assertion
      if (!isExtensionMessage(message)) {
        log.debug('⚠️ Received invalid message format');
        return Promise.resolve(false);
      }

      log.debug(`📬 Received message: ${message.type}`, {
        tabId: message.tabId,
        sender: sender.tab?.id,
      });

      return routeMessage(message, sender);
    }
  );

  log.info('👂 Message listener registered');
}
