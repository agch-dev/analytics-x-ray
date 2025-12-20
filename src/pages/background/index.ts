/**
 * Background Service Worker
 *
 * Intercepts network requests to Segment and compatible analytics endpoints
 * using the webRequest API. Captures the fully-enriched payloads that are
 * actually sent over the wire.
 */
import Browser from 'webextension-polyfill';
import {
  SEGMENT_ENDPOINTS,
  decodeRequestBody,
  detectProvider,
  parseSegmentPayload,
  processBatchPayload,
  type SegmentEvent,
} from '@src/lib/segment';
import { createContextLogger } from '@src/lib/logger';

const log = createContextLogger('background');

// Type for events stored per tab
interface StoredEvents {
  [tabId: number]: SegmentEvent[];
}

// Message types for communication
interface ExtensionMessage {
  type: 'GET_EVENTS' | 'CLEAR_EVENTS' | 'GET_EVENT_COUNT' | 'EVENTS_CAPTURED';
  tabId?: number;
  payload?: unknown;
}

log.info('🚀 Background service worker loaded');

// In-memory event storage (per tab)
// Note: Service workers can be terminated, so we also persist to storage
const tabEvents = new Map<number, SegmentEvent[]>();
const MAX_EVENTS_PER_TAB = 500;

/**
 * Set up the webRequest listener to intercept Segment API calls
 */
function setupWebRequestListener() {
  Browser.webRequest.onBeforeRequest.addListener(
    handleRequest,
    { urls: [...SEGMENT_ENDPOINTS] },
    ['requestBody']
  );

  log.info('📡 webRequest listener registered for endpoints:', SEGMENT_ENDPOINTS);
}

/**
 * Handle intercepted requests
 */
function handleRequest(
  details: Browser.WebRequest.OnBeforeRequestDetailsType
): void {
  log.group(`🎯 Request intercepted (tabId: ${details.tabId})`, true);
  
  // Only process POST requests with a body
  if (details.method !== 'POST') {
    log.debug('❌ Ignoring: Not a POST request');
    log.groupEnd();
    return;
  }
  if (!details.requestBody?.raw) {
    log.debug('❌ Ignoring: No request body');
    log.groupEnd();
    return;
  }
  if (details.tabId < 0) {
    log.debug('❌ Ignoring: Invalid tabId');
    log.groupEnd();
    return;
  }

  log.debug(`URL: ${details.url}`);

  // Decode the request body
  const bodyString = decodeRequestBody(details.requestBody.raw);
  if (!bodyString) {
    log.warn('⚠️ Failed to decode request body');
    log.groupEnd();
    return;
  }

  log.debug(`Body decoded (${bodyString.length} chars)`);

  // Parse the Segment payload
  const payload = parseSegmentPayload(bodyString);
  if (!payload) {
    log.warn('⚠️ Failed to parse Segment payload');
    log.groupEnd();
    return;
  }

  // Detect the provider
  const provider = detectProvider(details.url);
  log.debug(`Provider: ${provider}`);

  // Process the batch into normalized events
  const events = processBatchPayload(
    payload,
    details.tabId,
    details.url,
    provider
  );

  if (events.length === 0) {
    log.debug('❌ No events extracted from payload');
    log.groupEnd();
    return;
  }

  log.info(
    `✅ Captured ${events.length} event(s) from ${provider}:`,
    events.map((e) => e.name)
  );

  // Store events
  storeEvents(details.tabId, events);

  // Notify listeners (DevTools panel, popup, etc.)
  notifyListeners(details.tabId, events);
  
  log.groupEnd();
}

/**
 * Store events in memory and persist to storage
 */
async function storeEvents(
  tabId: number,
  newEvents: SegmentEvent[]
): Promise<void> {
  // Update in-memory store
  const existing = tabEvents.get(tabId) || [];
  const updated = [...newEvents, ...existing].slice(0, MAX_EVENTS_PER_TAB);
  tabEvents.set(tabId, updated);

  log.debug(`💾 Stored ${newEvents.length} event(s) in memory (total: ${updated.length} for tab ${tabId})`);

  // Persist to storage for service worker restarts
  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    events[tabId] = updated;
    await Browser.storage.local.set({ events });
    log.debug(`💾 Persisted ${updated.length} event(s) to storage.local['events'][${tabId}]`);
  } catch (error) {
    log.error('❌ Failed to persist events:', error);
  }
}

/**
 * Notify DevTools panel and other listeners about new events
 */
function notifyListeners(tabId: number, events: SegmentEvent[]): void {
  const message = {
    type: 'EVENTS_CAPTURED',
    payload: { tabId, events },
  };

  log.debug(`📤 Sending EVENTS_CAPTURED message (tabId: ${tabId}, ${events.length} event(s))`);

  Browser.runtime
    .sendMessage(message)
    .then(() => {
      log.debug(`✅ Message delivered successfully`);
    })
    .catch((error) => {
      // No listeners - panel might not be open
      log.debug(`⚠️ No listeners for message (panel may not be open):`, error.message);
    });
}

/**
 * Get events for a specific tab
 */
async function getEventsForTab(tabId: number): Promise<SegmentEvent[]> {
  // Try memory first
  if (tabEvents.has(tabId)) {
    return tabEvents.get(tabId) || [];
  }

  // Fall back to storage
  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    return events[tabId] || [];
  } catch {
    return [];
  }
}

/**
 * Clear events for a specific tab
 */
async function clearEventsForTab(tabId: number): Promise<void> {
  tabEvents.delete(tabId);

  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    delete events[tabId];
    await Browser.storage.local.set({ events });
  } catch (error) {
    console.error('[analytics-x-ray] Failed to clear events:', error);
  }
}

/**
 * Handle messages from content scripts, popup, and DevTools panel
 */
Browser.runtime.onMessage.addListener(
  (message: unknown, sender: Browser.Runtime.MessageSender) => {
    const msg = message as ExtensionMessage;

    log.debug(`📬 Received message: ${msg.type}`, { tabId: msg.tabId, sender: sender.tab?.id });

  switch (msg.type) {
    case 'GET_EVENTS': {
      const tabId = msg.tabId ?? sender.tab?.id;
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

    case 'CLEAR_EVENTS': {
      const tabId = msg.tabId ?? sender.tab?.id;
      if (typeof tabId === 'number') {
        log.info(`🗑️ Clearing events for tab ${tabId}`);
        return clearEventsForTab(tabId);
      }
      return Promise.resolve();
    }

    case 'GET_EVENT_COUNT': {
      const tabId = msg.tabId ?? sender.tab?.id;
      if (typeof tabId === 'number') {
        const events = tabEvents.get(tabId) || [];
        log.debug(`📊 Event count for tab ${tabId}: ${events.length}`);
        return Promise.resolve(events.length);
      }
      return Promise.resolve(0);
    }

    default:
      return false;
    }
  }
);

/**
 * Clean up when a tab is closed
 */
Browser.tabs.onRemoved.addListener(async (tabId) => {
  tabEvents.delete(tabId);

  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    delete events[tabId];
    await Browser.storage.local.set({ events });
  } catch {
    // Ignore cleanup errors
  }
});

/**
 * Restore events from storage on service worker startup
 */
async function restoreEventsFromStorage(): Promise<void> {
  try {
    log.info('🔄 Restoring events from storage...');
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    
    let totalEvents = 0;
    for (const [tabIdStr, tabEventList] of Object.entries(events)) {
      const tabId = parseInt(tabIdStr, 10);
      if (!isNaN(tabId) && Array.isArray(tabEventList)) {
        tabEvents.set(tabId, tabEventList as SegmentEvent[]);
        totalEvents += tabEventList.length;
        log.debug(`  ✅ Restored ${tabEventList.length} events for tab ${tabId}`);
      }
    }
    log.info(`✅ Restored ${totalEvents} total events across ${Object.keys(events).length} tab(s)`);
  } catch (error) {
    log.error('❌ Failed to restore events:', error);
  }
}

// Initialize
log.info('🔧 Initializing background script...');
restoreEventsFromStorage();
setupWebRequestListener();
log.info('✅ Background script initialization complete');
