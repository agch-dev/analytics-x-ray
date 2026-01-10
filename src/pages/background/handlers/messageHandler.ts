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
 * Set up message listener for runtime messages
 */
export function setupMessageListener(): void {
  Browser.runtime.onMessage.addListener(
    (message: unknown, sender: Browser.Runtime.MessageSender) => {
      // Use type guard instead of type assertion
      if (!isExtensionMessage(message)) {
        log.debug('⚠️ Received invalid message format');
        return false;
      }

      log.debug(`📬 Received message: ${message.type}`, {
        tabId: message.tabId,
        sender: sender.tab?.id,
      });

      // Handle each message type with specific type guards
      if (isGetEventsMessage(message)) {
        const tabId = message.tabId ?? sender.tab?.id;
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

      if (isClearEventsMessage(message)) {
        const tabId = message.tabId ?? sender.tab?.id;
        if (typeof tabId === 'number') {
          log.info(`🗑️ Clearing events for tab ${tabId}`);
          return clearEventsForTab(tabId);
        }
        return Promise.resolve();
      }

      if (isGetEventCountMessage(message)) {
        const tabId = message.tabId ?? sender.tab?.id;
        if (typeof tabId === 'number') {
          const events = tabEvents.get(tabId) || [];
          log.debug(`📊 Event count for tab ${tabId}: ${events.length}`);
          return Promise.resolve(events.length);
        }
        return Promise.resolve(0);
      }

      if (isGetTabDomainMessage(message)) {
        const tabId = message.tabId ?? sender.tab?.id;
        if (typeof tabId === 'number') {
          return getTabDomain(tabId);
        }
        return Promise.resolve(null);
      }

      if (isReEvaluateTabDomainMessage(message)) {
        const tabId = message.tabId ?? sender.tab?.id;
        if (typeof tabId === 'number') {
          return handleReEvaluateTabDomain(tabId);
        }
        log.warn(`⚠️ RE_EVALUATE_TAB_DOMAIN: No valid tabId`);
        return Promise.resolve(false);
      }

      // Unknown message type
      return false;
    }
  );

  log.info('👂 Message listener registered');
}
