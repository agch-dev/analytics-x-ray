/**
 * Web Request Handler
 * 
 * Handles interception of Segment API requests using the webRequest API.
 */

import Browser from 'webextension-polyfill';
import {
  SEGMENT_ENDPOINTS,
  decodeRequestBody,
  detectProvider,
  parseSegmentPayload,
  processBatchPayload,
} from '@src/lib/parsing/segment';
import { createContextLogger } from '@src/lib/logger';
import { tabDomains } from '../utils/domainTracking';
import { storeEvents } from '../utils/eventStorage';
import { notifyListeners } from './storageHandler';

const log = createContextLogger('background');

/**
 * Set up the webRequest listener to intercept Segment API calls
 */
export function setupWebRequestListener(): void {
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
  
  // Early exit checks (before any expensive processing)
  if (details.tabId < 0) {
    log.debug('❌ Ignoring: Invalid tabId');
    log.groupEnd();
    return;
  }
  
  // Check if domain is allowed (fast map lookup)
  const tabDomainInfo = tabDomains.get(details.tabId);
  if (!tabDomainInfo || !tabDomainInfo.isAllowed) {
    log.debug(`❌ Ignoring: Domain not allowed (tabId: ${details.tabId}, domain: ${tabDomainInfo?.domain || 'unknown'})`);
    log.groupEnd();
    return;
  }
  
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
