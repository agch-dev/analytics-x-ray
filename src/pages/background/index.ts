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

console.log('[analytics-x-ray] Background service worker loaded');

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

  console.log(
    '[analytics-x-ray] webRequest listener registered for:',
    SEGMENT_ENDPOINTS
  );
}

/**
 * Handle intercepted requests
 */
function handleRequest(
  details: Browser.WebRequest.OnBeforeRequestDetailsType
): void {
  // Only process POST requests with a body
  if (details.method !== 'POST') return;
  if (!details.requestBody?.raw) return;
  if (details.tabId < 0) return; // Ignore non-tab requests

  // Decode the request body
  const bodyString = decodeRequestBody(details.requestBody.raw);
  if (!bodyString) return;

  // Parse the Segment payload
  const payload = parseSegmentPayload(bodyString);
  if (!payload) return;

  // Detect the provider
  const provider = detectProvider(details.url);

  // Process the batch into normalized events
  const events = processBatchPayload(
    payload,
    details.tabId,
    details.url,
    provider
  );

  if (events.length === 0) return;

  // Store events
  storeEvents(details.tabId, events);

  // Notify listeners (DevTools panel, popup, etc.)
  notifyListeners(details.tabId, events);

  console.log(
    `[analytics-x-ray] Captured ${events.length} event(s) from ${provider}`,
    events.map((e) => e.name)
  );
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

  // Persist to storage for service worker restarts
  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    events[tabId] = updated;
    await Browser.storage.local.set({ events });
  } catch (error) {
    console.error('[analytics-x-ray] Failed to persist events:', error);
  }
}

/**
 * Notify DevTools panel and other listeners about new events
 */
function notifyListeners(tabId: number, events: SegmentEvent[]): void {
  Browser.runtime
    .sendMessage({
      type: 'EVENTS_CAPTURED',
      payload: { tabId, events },
    })
    .catch(() => {
      // No listeners - panel might not be open
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

  switch (msg.type) {
    case 'GET_EVENTS': {
      const tabId = msg.tabId ?? sender.tab?.id;
      if (typeof tabId === 'number') {
        return getEventsForTab(tabId);
      }
      return Promise.resolve([]);
    }

    case 'CLEAR_EVENTS': {
      const tabId = msg.tabId ?? sender.tab?.id;
      if (typeof tabId === 'number') {
        return clearEventsForTab(tabId);
      }
      return Promise.resolve();
    }

    case 'GET_EVENT_COUNT': {
      const tabId = msg.tabId ?? sender.tab?.id;
      if (typeof tabId === 'number') {
        const events = tabEvents.get(tabId) || [];
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
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    for (const [tabIdStr, tabEventList] of Object.entries(events)) {
      const tabId = parseInt(tabIdStr, 10);
      if (!isNaN(tabId) && Array.isArray(tabEventList)) {
        tabEvents.set(tabId, tabEventList as SegmentEvent[]);
      }
    }
    console.log('[analytics-x-ray] Restored events from storage');
  } catch (error) {
    console.error('[analytics-x-ray] Failed to restore events:', error);
  }
}

// Initialize
restoreEventsFromStorage();
setupWebRequestListener();
