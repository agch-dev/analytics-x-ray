/**
 * Storage Handler
 *
 * Handles event storage operations and notifications to listeners.
 */

import Browser from 'webextension-polyfill';

import { createContextLogger } from '@src/lib/logger';
import type { SegmentEvent } from '@src/lib/parsing/segment';
import type { EventsCapturedMessage } from '@src/types';

const log = createContextLogger('background');

/**
 * Notify DevTools panel and other listeners about new events
 */
export function notifyListeners(tabId: number, events: SegmentEvent[]): void {
  const message: EventsCapturedMessage = {
    type: 'EVENTS_CAPTURED',
    payload: { tabId, events },
  };

  log.debug(
    `📤 Sending EVENTS_CAPTURED message (tabId: ${tabId}, ${events.length} event(s))`
  );

  Browser.runtime
    .sendMessage(message)
    .then(() => {
      log.debug(`✅ Message delivered successfully`);
    })
    .catch((error) => {
      // No listeners - panel might not be open
      log.debug(
        `⚠️ No listeners for message (panel may not be open):`,
        error.message
      );
    });
}
