/**
 * Event Synchronization Hook
 * 
 * Handles syncing events between background script and DevTools panel:
 * 1. Fetches initial events from background script on mount
 * 2. Listens for new events via runtime messages
 * 3. Adds events to the tab store
 */

import { useEffect } from 'react';
import Browser from 'webextension-polyfill';
import type { SegmentEvent } from '@src/types/segment';
import { createContextLogger } from '@src/lib/logger';

const log = createContextLogger('panel');

interface EventSyncOptions {
  tabId: number;
  addEvent: (event: SegmentEvent) => void;
}

interface EventsCapturedMessage {
  type: 'EVENTS_CAPTURED';
  payload: {
    tabId: number;
    events: SegmentEvent[];
  };
}

export function useEventSync({ tabId, addEvent }: EventSyncOptions) {
  useEffect(() => {
    log.info(`🔄 Setting up event sync for tab ${tabId}`);

    // 1. Fetch initial events from background script
    // Note: Deduplication in store prevents duplicates from persistence
    const fetchInitialEvents = async () => {
      try {
        log.debug(`📥 Fetching initial events for tab ${tabId}...`);
        const events = (await Browser.runtime.sendMessage({
          type: 'GET_EVENTS',
          tabId,
        })) as SegmentEvent[];

        if (events && Array.isArray(events)) {
          log.info(`✅ Received ${events.length} initial events from background`);
          if (events.length > 0) {
            log.table(events.map((e) => ({ name: e.name, type: e.type, timestamp: e.timestamp })));
          }
          
          // Add events in reverse order so they appear correctly
          // (background stores newest first, we need to add oldest first)
          events.reverse().forEach((event) => addEvent(event));
        } else {
          log.warn('⚠️ Received invalid events from background:', events);
        }
      } catch (error) {
        log.error('❌ Failed to fetch initial events:', error);
      }
    };

    fetchInitialEvents();

    // 2. Listen for new events from background script
    const handleMessage = (message: unknown) => {
      const msg = message as EventsCapturedMessage;

      if (msg.type === 'EVENTS_CAPTURED') {
        const { tabId: eventTabId, events } = msg.payload;

        log.debug(`📬 Received EVENTS_CAPTURED message (tabId: ${eventTabId}, events: ${events?.length})`);

        // Only process events for our tab
        if (eventTabId !== tabId) {
          log.debug(`⏭️ Ignoring events for different tab (our tab: ${tabId}, event tab: ${eventTabId})`);
          return;
        }

        if (events && Array.isArray(events)) {
          log.info(`✅ Adding ${events.length} new event(s) to store:`, events.map((e) => e.name));
          events.forEach((event) => addEvent(event));
        } else {
          log.warn('⚠️ Received invalid events in message:', events);
        }
      }
    };

    Browser.runtime.onMessage.addListener(handleMessage);
    log.debug(`👂 Message listener registered`);

    // Cleanup
    return () => {
      Browser.runtime.onMessage.removeListener(handleMessage);
      log.debug(`🧹 Message listener removed`);
    };
  }, [tabId, addEvent]);
}

