/**
 * Max Events Handler
 *
 * Handles trimming events when maxEvents limit is reduced.
 */

import Browser from 'webextension-polyfill';

import { createContextLogger, isStoredEvents } from '@src/lib';
import { useConfigStore } from '@src/stores';

import { tabEvents } from '../utils/eventStorage';

const log = createContextLogger('background');

// Type for events stored per tab
interface StoredEvents {
  [tabId: number]: unknown[];
}

/**
 * Get the current maxEvents limit from config store
 * Falls back to 500 if config store is not available
 */
function getMaxEvents(): number {
  try {
    return useConfigStore.getState().maxEvents;
  } catch (error) {
    log.debug(
      '⚠️ Could not read maxEvents from config store, using default: 500',
      error
    );
    return 500;
  }
}

/**
 * Trim events for all tabs when maxEvents is reduced
 * This ensures that when a user reduces the limit, existing events are trimmed immediately
 */
export function setupMaxEventsListener(): void {
  let previousMaxEvents = getMaxEvents();

  // Subscribe to config store changes and check if maxEvents changed
  useConfigStore.subscribe((state) => {
    const currentMaxEvents = state.maxEvents;

    // Only trim if maxEvents was reduced
    if (currentMaxEvents < previousMaxEvents) {
      log.info(
        `📉 Max events reduced from ${previousMaxEvents} to ${currentMaxEvents}, trimming existing events...`
      );

      // Trim events for all active tabs
      for (const [tabId, events] of tabEvents.entries()) {
        if (events.length > currentMaxEvents) {
          const trimmed = events.slice(0, currentMaxEvents);
          tabEvents.set(tabId, trimmed);
          log.debug(
            `  ✂️ Trimmed tab ${tabId}: ${events.length} → ${trimmed.length} events`
          );

          // Also update persisted storage
          Browser.storage.local
            .get('events')
            .then((result) => {
              const rawEvents = result.events;
              const storedEvents: StoredEvents = isStoredEvents(rawEvents)
                ? rawEvents
                : {};
              storedEvents[tabId] = trimmed;
              Browser.storage.local
                .set({ events: storedEvents })
                .catch((error) => {
                  log.error(
                    `❌ Failed to persist trimmed events for tab ${tabId}:`,
                    error
                  );
                });
            })
            .catch((error) => {
              log.error(
                `❌ Failed to read events for trimming tab ${tabId}:`,
                error
              );
            });
        }
      }
    }

    previousMaxEvents = currentMaxEvents;
  });

  log.info('👂 Max events change listener registered');
}
