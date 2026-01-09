/**
 * Background Service Worker
 *
 * Intercepts network requests to Segment and compatible analytics endpoints
 * using the webRequest API. Captures the fully-enriched payloads that are
 * actually sent over the wire.
 * 
 * This file orchestrates all background script functionality by initializing
 * handlers and utilities in the correct order.
 */

import Browser from 'webextension-polyfill';
import { createContextLogger } from '@src/lib/logger';
import { logStorageSize } from '@src/lib/storage';
import { setupWebRequestListener } from './handlers/webRequestHandler';
import { setupMessageListener } from './handlers/messageHandler';
import { setupReloadTracking } from './handlers/reloadHandler';
import { setupDomainAllowlistListener, setupStorageSyncListener } from './handlers/domainHandler';
import { setupMaxEventsListener } from './handlers/maxEventsHandler';
import { restoreEventsFromStorage } from './utils/eventStorage';
import { initializeDomainTracking } from './utils/domainTracking';
import { setupPeriodicCleanup, cleanupTabData } from './utils/cleanup';
import { tabDomains } from './utils/domainTracking';

const log = createContextLogger('background');

log.info('🚀 Background service worker loaded');

// Initialize
log.info('🔧 Initializing background script...');

// Restore events from storage on startup
restoreEventsFromStorage().then(() => {
  // Log storage size on startup
  logStorageSize('background');
});

// Set up all handlers
setupWebRequestListener();
setupReloadTracking();
setupMaxEventsListener();
setupDomainAllowlistListener();
setupStorageSyncListener();
setupMessageListener();
setupPeriodicCleanup();
initializeDomainTracking();

// Clean up when a tab is closed
Browser.tabs.onRemoved.addListener(async (tabId) => {
  log.debug(`🗑️ Tab ${tabId} closed, cleaning up...`);
  // Remove from domain tracking map
  tabDomains.delete(tabId);
  await cleanupTabData(tabId);
});

log.info('✅ Background script initialization complete');
