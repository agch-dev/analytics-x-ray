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
import { logStorageSize, cleanupStaleTabs } from '@src/lib/storage';
import { extractDomain, isDomainAllowed, isSpecialPage, normalizeDomain } from '@src/lib/domain';
import type { EventsCapturedMessage, ReloadDetectedMessage, DomainChangedMessage } from '@src/types/messages';
import {
  isExtensionMessage,
  isGetEventsMessage,
  isClearEventsMessage,
  isGetEventCountMessage,
  isGetTabDomainMessage,
  isReEvaluateTabDomainMessage,
} from '@src/types/messages';
import { useConfigStore } from '@src/stores/configStore';

const log = createContextLogger('background');

// Type for events stored per tab
interface StoredEvents {
  [tabId: number]: SegmentEvent[];
}

log.info('🚀 Background service worker loaded');

// In-memory event storage (per tab)
// Note: Service workers can be terminated, so we also persist to storage
const tabEvents = new Map<number, SegmentEvent[]>();

  // In-memory domain tracking (per tab)
  // Maps tabId to { domain, isAllowed }
  // Updated via onUpdated listener for fast lookups
interface TabDomainInfo {
  domain: string;
  isAllowed: boolean;
}
const tabDomains = new Map<number, TabDomainInfo>();

// Track last known domain per tab to detect changes
const lastKnownDomains = new Map<number, string>();

/**
 * Get the current maxEvents limit from config store
 * Falls back to 500 if config store is not available
 */
function getMaxEvents(): number {
  try {
    return useConfigStore.getState().maxEvents;
  } catch (error) {
    log.debug('⚠️ Could not read maxEvents from config store, using default: 500');
    return 500;
  }
}

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

/**
 * Store events in memory and persist to storage
 * 
 * Note: This function does NOT perform deduplication. Deduplication is handled
 * by the tabStore when events are added via addEvent(). The background script
 * simply forwards events to storage, and the store ensures no duplicates
 * (by checking both id and messageId) before adding them to the state.
 */
async function storeEvents(
  tabId: number,
  newEvents: SegmentEvent[]
): Promise<void> {
  // Update in-memory store
  // Note: Deduplication happens in tabStore.addEvent(), not here
  const existing = tabEvents.get(tabId) || [];
  const maxEvents = getMaxEvents();
  const updated = [...newEvents, ...existing].slice(0, maxEvents);
  tabEvents.set(tabId, updated);

  log.debug(`💾 Stored ${newEvents.length} event(s) in memory (total: ${updated.length} for tab ${tabId})`);

  // Persist to storage for service worker restarts
  try {
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    events[tabId] = updated;
    await Browser.storage.local.set({ events });
    log.debug(`💾 Persisted ${updated.length} event(s) to storage.local['events'][${tabId}]`);
    
    // Log storage size periodically (every 10 events to avoid spam)
    if (updated.length % 10 === 0) {
      logStorageSize('background');
    }
  } catch (error) {
    log.error('❌ Failed to persist events:', error);
    // Check if storage quota exceeded
    if (error instanceof Error && error.message.includes('QUOTA')) {
      log.error('🚨 Storage quota exceeded! Logging current usage...');
      logStorageSize('background');
    }
  }
}

/**
 * Notify DevTools panel and other listeners about new events
 */
function notifyListeners(tabId: number, events: SegmentEvent[]): void {
  const message: EventsCapturedMessage = {
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
    
    // Also clear reload timestamps for this tab
    const reloadsKey = `tab_${tabId}_reloads`;
    await Browser.storage.local.remove(reloadsKey);
    log.debug(`🗑️ Cleared reload timestamps for tab ${tabId}`);
  } catch (error) {
    console.error('[analytics-x-ray] Failed to clear events:', error);
  }
}

/**
 * Check if a domain is allowed and update tab domain map
 */
function updateTabDomainInfo(tabId: number, url: string): void {
  const domain = extractDomain(url);
  
  // Handle special pages and invalid URLs
  if (!domain || isSpecialPage(url)) {
    const previousDomain = lastKnownDomains.get(tabId);
    tabDomains.set(tabId, { domain: '', isAllowed: false });
    lastKnownDomains.set(tabId, '');
    
    // Notify if domain changed (from valid to invalid)
    if (previousDomain && previousDomain !== '') {
      notifyDomainChanged(tabId, null);
    }
    return;
  }
  
  // Check if domain actually changed
  const previousDomain = lastKnownDomains.get(tabId);
  const domainChanged = previousDomain !== domain;
  
  // Check against allowlist and denied list
  const config = useConfigStore.getState();
  
  // Normalize domain for denied list check (denied domains are stored normalized)
  const normalizedDomain = normalizeDomain(domain);
  const isDenied = config.deniedDomains.some((denied) => {
    const normalizedDenied = normalizeDomain(denied);
    return normalizedDenied === normalizedDomain || denied === domain;
  });
  
  const isAllowed = !isDenied && isDomainAllowed(domain, config.allowedDomains);
  
  tabDomains.set(tabId, { domain, isAllowed });
  lastKnownDomains.set(tabId, domain);
  
  log.debug(`🌐 Updated domain info for tab ${tabId}: ${domain} (normalized: ${normalizedDomain}, allowed: ${isAllowed}, denied: ${isDenied})`);
  
  // Log detailed matching info for debugging
  if (!isAllowed && !isDenied) {
    log.debug(`🔍 Domain ${domain} not in allowlist. Allowed domains:`, config.allowedDomains.map(d => `${d.domain} (subdomains: ${d.allowSubdomains})`));
  }
  
  // Notify panel if domain changed
  if (domainChanged) {
    notifyDomainChanged(tabId, domain);
  }
}

/**
 * Notify DevTools panel when domain changes
 */
function notifyDomainChanged(tabId: number, domain: string | null): void {
  try {
    const message: DomainChangedMessage = {
      type: 'DOMAIN_CHANGED',
      tabId,
      domain,
    };
    Browser.runtime.sendMessage(message).catch((error) => {
      // No listeners - panel might not be open, that's okay
      log.debug(`⚠️ No listeners for domain change notification:`, error);
    });
  } catch (error) {
    log.debug(`⚠️ Failed to notify domain change:`, error);
  }
}

/**
 * Re-evaluate all tabs when allowlist changes
 */
function reEvaluateAllTabs(): void {
  log.info('🔄 Re-evaluating all tabs due to allowlist change...');
  
  // Get all open tabs and re-check their domains
  Browser.tabs.query({}).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        updateTabDomainInfo(tab.id, tab.url);
      }
    }
    log.info(`✅ Re-evaluated ${tabs.length} tab(s)`);
  }).catch((error) => {
    log.error('❌ Failed to re-evaluate tabs:', error);
  });
}

/**
 * Track page reloads by listening to tab updates
 * Also tracks domain changes for allowlist checking
 */
function setupReloadTracking() {
  // Track the last known URL for each tab to detect reloads
  // This is in-memory only - we don't need to persist across extension restarts
  const tabUrls = new Map<number, string>();
  
  Browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Need a valid tab ID and URL
    if (tabId < 0 || !tab.url) {
      return;
    }
    
    const currentUrl = tab.url;
    
    // Update domain tracking whenever URL changes (not just on loading)
    // This ensures we catch domain changes even if status doesn't change to 'loading'
    if (changeInfo.url || changeInfo.status === 'loading' || changeInfo.status === 'complete') {
      updateTabDomainInfo(tabId, currentUrl);
    }
    
    // Only process reload detection when status changes to 'loading'
    if (changeInfo.status !== 'loading') {
      return;
    }
    
    const previousUrl = tabUrls.get(tabId);
    
    // Normalize URLs for comparison (remove trailing slashes from path, but keep query/hash)
    const normalizeUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        // Normalize pathname (remove trailing slash except for root)
        let pathname = urlObj.pathname;
        if (pathname.length > 1 && pathname.endsWith('/')) {
          pathname = pathname.slice(0, -1);
        }
        // Reconstruct URL with normalized pathname
        return `${urlObj.protocol}//${urlObj.host}${pathname}${urlObj.search}${urlObj.hash}`;
      } catch {
        // If URL parsing fails, return as-is
        return url;
      }
    };
    
    const normalizedCurrent = normalizeUrl(currentUrl);
    const normalizedPrevious = previousUrl ? normalizeUrl(previousUrl) : null;
    
    // If the normalized URL is the same as before, it's a reload
    // Only detect reload if URLs match exactly (including query/hash) after normalization
    if (normalizedPrevious && normalizedCurrent === normalizedPrevious) {
      const timestamp = Date.now();
      log.debug(`🔄 Detected page reload for tab ${tabId} at ${timestamp}`);
      
      try {
        // Get existing reload timestamps
        const reloadsKey = `tab_${tabId}_reloads`;
        const result = await Browser.storage.local.get(reloadsKey);
        const existingReloads = (result[reloadsKey] as number[]) || [];
        
        // Append new timestamp
        const updatedReloads = [...existingReloads, timestamp];
        
        // Store back (limit to last 100 reloads to prevent storage bloat)
        await Browser.storage.local.set({
          [reloadsKey]: updatedReloads.slice(-100),
        });
        
        log.debug(`✅ Recorded reload timestamp for tab ${tabId} (total: ${updatedReloads.length})`);
        
        // Notify listeners about the reload so they can update
        try {
          const message: ReloadDetectedMessage = {
            type: 'RELOAD_DETECTED',
            tabId,
            timestamp,
          };
          await Browser.runtime.sendMessage(message);
          log.debug(`📤 Sent RELOAD_DETECTED message for tab ${tabId}`);
        } catch (error) {
          // No listeners - panel might not be open, that's okay
          log.debug(`⚠️ No listeners for reload notification:`, error);
        }
      } catch (error) {
        log.error(`❌ Failed to record reload timestamp for tab ${tabId}:`, error);
      }
    }
    
    // Update the stored URL for this tab (in memory only)
    tabUrls.set(tabId, currentUrl);
  });
  
  log.info('🔄 Reload tracking initialized');
}

/**
 * Handle messages from content scripts, popup, and DevTools panel
 */
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
        const tabDomainInfo = tabDomains.get(tabId);
        if (tabDomainInfo) {
          log.debug(`🌐 Returning domain for tab ${tabId}: ${tabDomainInfo.domain}`);
          return Promise.resolve(tabDomainInfo.domain);
        }
        // Try to get from tab if not in map
        return Browser.tabs.get(tabId)
          .then((tab) => {
            if (tab.url) {
              const domain = extractDomain(tab.url);
              return domain || null;
            }
            return null;
          })
          .catch(() => null);
      }
      return Promise.resolve(null);
    }

    if (isReEvaluateTabDomainMessage(message)) {
      const tabId = message.tabId ?? sender.tab?.id;
      if (typeof tabId === 'number') {
        log.info(`🔄 Re-evaluating domain for tab ${tabId} (requested by panel)`);
        return Browser.tabs.get(tabId)
          .then((tab) => {
            if (tab.url) {
              log.info(`📋 Current allowed domains before re-evaluation:`, useConfigStore.getState().allowedDomains.map(d => `${d.domain} (subdomains: ${d.allowSubdomains})`));
              updateTabDomainInfo(tabId, tab.url);
              const updatedInfo = tabDomains.get(tabId);
              log.info(`✅ Re-evaluation complete for tab ${tabId}: domain=${updatedInfo?.domain}, allowed=${updatedInfo?.isAllowed}`);
              return true;
            }
            log.warn(`⚠️ Tab ${tabId} has no URL`);
            return false;
          })
          .catch((error) => {
            log.error(`❌ Failed to re-evaluate tab ${tabId}:`, error);
            return false;
          });
      }
      log.warn(`⚠️ RE_EVALUATE_TAB_DOMAIN: No valid tabId`);
      return Promise.resolve(false);
    }

    // Unknown message type
    return false;
  }
);

/**
 * Clean up all storage for a specific tab
 * Removes events, reload timestamps, tab URLs, and Zustand persisted storage
 */
async function cleanupTabData(tabId: number): Promise<void> {
  try {
    // Clean up in-memory events
    tabEvents.delete(tabId);

    // Clean up events from storage
    const result = await Browser.storage.local.get('events');
    const events: StoredEvents = (result.events as StoredEvents) || {};
    delete events[tabId];
    await Browser.storage.local.set({ events });
    
    // Clean up reload timestamps
    const reloadsKey = `tab_${tabId}_reloads`;
    await Browser.storage.local.remove(reloadsKey);
    
    // Clean up Zustand persisted storage (tab_${tabId}_store)
    const zustandKey = `tab_${tabId}_store`;
    await Browser.storage.local.remove(zustandKey);
    
    log.debug(`✅ Cleaned up all data for tab ${tabId}`);
  } catch (error) {
    log.error(`❌ Failed to cleanup tab ${tabId}:`, error);
  }
}

/**
 * Clean up when a tab is closed
 */
Browser.tabs.onRemoved.addListener(async (tabId) => {
  log.debug(`🗑️ Tab ${tabId} closed, cleaning up...`);
  // Remove from domain tracking map
  tabDomains.delete(tabId);
  await cleanupTabData(tabId);
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

/**
 * Trim events for all tabs when maxEvents is reduced
 * This ensures that when a user reduces the limit, existing events are trimmed immediately
 */
function setupMaxEventsListener() {
  let previousMaxEvents = getMaxEvents();
  
  // Subscribe to config store changes and check if maxEvents changed
  useConfigStore.subscribe((state) => {
    const currentMaxEvents = state.maxEvents;
    
    // Only trim if maxEvents was reduced
    if (currentMaxEvents < previousMaxEvents) {
      log.info(`📉 Max events reduced from ${previousMaxEvents} to ${currentMaxEvents}, trimming existing events...`);
      
      // Trim events for all active tabs
      for (const [tabId, events] of tabEvents.entries()) {
        if (events.length > currentMaxEvents) {
          const trimmed = events.slice(0, currentMaxEvents);
          tabEvents.set(tabId, trimmed);
          log.debug(`  ✂️ Trimmed tab ${tabId}: ${events.length} → ${trimmed.length} events`);
          
          // Also update persisted storage
          Browser.storage.local.get('events').then((result) => {
            const storedEvents: StoredEvents = (result.events as StoredEvents) || {};
            storedEvents[tabId] = trimmed;
            Browser.storage.local.set({ events: storedEvents }).catch((error) => {
              log.error(`❌ Failed to persist trimmed events for tab ${tabId}:`, error);
            });
          }).catch((error) => {
            log.error(`❌ Failed to read events for trimming tab ${tabId}:`, error);
          });
        }
      }
    }
    
    previousMaxEvents = currentMaxEvents;
  });
  
  log.info('👂 Max events change listener registered');
}

/**
 * Set up domain allowlist change listener
 * Re-evaluates all tabs when allowlist is modified
 */
function setupDomainAllowlistListener() {
  let previousAllowedDomains = useConfigStore.getState().allowedDomains;
  let previousDeniedDomains = useConfigStore.getState().deniedDomains;
  
  useConfigStore.subscribe((state) => {
    const currentAllowedDomains = state.allowedDomains;
    const currentDeniedDomains = state.deniedDomains;
    
    // Check if allowlist changed
    const allowlistChanged = 
      currentAllowedDomains.length !== previousAllowedDomains.length ||
      currentAllowedDomains.some((domain, index) => 
        domain.domain !== previousAllowedDomains[index]?.domain ||
        domain.allowSubdomains !== previousAllowedDomains[index]?.allowSubdomains
      );
    
    // Check if denied list changed
    const deniedListChanged = 
      currentDeniedDomains.length !== previousDeniedDomains.length ||
      currentDeniedDomains.some((domain, index) => 
        domain !== previousDeniedDomains[index]
      );
    
    if (allowlistChanged || deniedListChanged) {
      log.info('📋 Domain allowlist or denied list changed, re-evaluating tabs...');
      reEvaluateAllTabs();
      previousAllowedDomains = currentAllowedDomains;
      previousDeniedDomains = currentDeniedDomains;
    }
  });
  
  log.info('👂 Domain allowlist/denied list change listener registered');
}

/**
 * Initialize domain tracking for all open tabs on startup
 */
async function initializeDomainTracking(): Promise<void> {
  try {
    const tabs = await Browser.tabs.query({});
    log.info(`🌐 Initializing domain tracking for ${tabs.length} open tab(s)...`);
    
    for (const tab of tabs) {
      if (tab.id && tab.url) {
        updateTabDomainInfo(tab.id, tab.url);
      }
    }
    
    log.info('✅ Domain tracking initialized');
  } catch (error) {
    log.error('❌ Failed to initialize domain tracking:', error);
  }
}

/**
 * Set up storage change listener to sync config store updates from other contexts
 * This ensures the background script picks up changes made in Panel/Options pages
 */
function setupStorageSyncListener() {
  const handleStorageChange = (
    changes: Browser.Storage.StorageAreaOnChangedChangesType,
    areaName: string
  ) => {
    // Only listen to local storage changes
    if (areaName !== 'local') return;
    
    // Check if the config storage key changed
    const configKey = 'analytics-xray-config';
    if (changes[configKey]) {
      log.info('📋 Config storage changed, rehydrating store...');
      
      // Read the new config from storage and update the store
      Browser.storage.local.get(configKey).then((result) => {
        const storedValue = result[configKey];
        if (storedValue && typeof storedValue === 'string') {
          try {
            const parsed = JSON.parse(storedValue);
            const { state: newState } = parsed;
            if (newState) {
              // Update the store with the new state
              useConfigStore.setState(newState);
              log.info('✅ Config store rehydrated from storage');
              log.debug('📋 Updated allowed domains:', newState.allowedDomains?.map((d: { domain: string; allowSubdomains: boolean }) => `${d.domain} (subdomains: ${d.allowSubdomains})`) || []);
              
              // Re-evaluate all tabs after store update
              reEvaluateAllTabs();
            }
          } catch (error) {
            log.error('❌ Failed to parse config from storage:', error);
          }
        }
      });
    }
  };
  
  Browser.storage.onChanged.addListener(handleStorageChange);
  log.info('👂 Storage sync listener registered');
}

/**
 * Set up periodic cleanup of stale tabs
 * Runs cleanup every hour and on service worker startup
 * Cleans up tabs that haven't been updated in 24+ hours (if they're closed)
 */
function setupPeriodicCleanup() {
  const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  const STALE_TAB_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Run cleanup immediately on startup
  cleanupStaleTabs(STALE_TAB_AGE_MS)
    .then((count) => {
      if (count > 0) {
        log.info(`🧹 Startup cleanup: Removed ${count} stale tab(s)`);
      }
    })
    .catch((error) => {
      log.error('❌ Startup cleanup failed:', error);
    });

  // Set up periodic cleanup
  setInterval(() => {
    cleanupStaleTabs(STALE_TAB_AGE_MS)
      .then((count) => {
        if (count > 0) {
          log.info(`🧹 Periodic cleanup: Removed ${count} stale tab(s)`);
        }
      })
      .catch((error) => {
        log.error('❌ Periodic cleanup failed:', error);
      });
  }, CLEANUP_INTERVAL_MS);

  log.info(`🕐 Periodic cleanup scheduled (every ${CLEANUP_INTERVAL_MS / (60 * 1000)} minutes, cleaning tabs older than ${STALE_TAB_AGE_MS / (60 * 60 * 1000)} hours)`);
}

// Initialize
log.info('🔧 Initializing background script...');
restoreEventsFromStorage().then(() => {
  // Log storage size on startup
  logStorageSize('background');
});
setupWebRequestListener();
setupReloadTracking();
setupMaxEventsListener();
setupDomainAllowlistListener();
setupStorageSyncListener();
setupPeriodicCleanup();
initializeDomainTracking();
log.info('✅ Background script initialization complete');
