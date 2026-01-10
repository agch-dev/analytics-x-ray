/**
 * Domain Tracking Utilities
 *
 * Handles domain extraction, allowlist checking, and domain change notifications.
 * This is so we don't track for tabs with domains that were the extension was never opened on.
 * Tracking on allowed domain when the extension is closed allows us to not miss events on first page load for those domains that a user usally uses the extension on.
 * Realistically, the extension is only opened on a few domains, so this is a small trade-off to make.
 */

import Browser from 'webextension-polyfill';

import {
  extractDomain,
  isDomainAllowed,
  isSpecialPage,
  normalizeDomain,
} from '@src/lib/domain';
import { createContextLogger } from '@src/lib/logger';
import { useDomainStore } from '@src/stores';
import type { DomainChangedMessage } from '@src/types';

const log = createContextLogger('background');

// In-memory domain tracking (per tab)
// Maps tabId to { domain, isAllowed }
// Updated via onUpdated listener for fast lookups
interface TabDomainInfo {
  domain: string;
  isAllowed: boolean;
}

export const tabDomains = new Map<number, TabDomainInfo>();

// Track last known domain per tab to detect changes
const lastKnownDomains = new Map<number, string>();

/**
 * Check if a domain is allowed and update tab domain map
 */
export function updateTabDomainInfo(tabId: number, url: string): void {
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

  // Check against allowlist
  const domainStore = useDomainStore.getState();

  // Normalize domain for comparison
  const normalizedDomain = normalizeDomain(domain);

  const isAllowed = isDomainAllowed(domain, domainStore.allowedDomains);

  tabDomains.set(tabId, { domain, isAllowed });
  lastKnownDomains.set(tabId, domain);

  log.debug(
    `🌐 Updated domain info for tab ${tabId}: ${domain} (normalized: ${normalizedDomain}, allowed: ${isAllowed})`
  );

  // Log detailed matching info for debugging
  if (!isAllowed) {
    log.debug(
      `🔍 Domain ${domain} not in allowlist. Allowed domains:`,
      domainStore.allowedDomains.map(
        (d) => `${d.domain} (subdomains: ${d.allowSubdomains})`
      )
    );
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
  const message: DomainChangedMessage = {
    type: 'DOMAIN_CHANGED',
    tabId,
    domain,
  };
  Browser.runtime.sendMessage(message).catch((error) => {
    // No listeners - panel might not be open, that's okay
    log.debug(`⚠️ No listeners for domain change notification:`, error);
  });
}

/**
 * Re-evaluate all tabs when allowlist changes
 */
export function reEvaluateAllTabs(): void {
  log.info('🔄 Re-evaluating all tabs due to allowlist change...');

  // Get all open tabs and re-check their domains
  Browser.tabs
    .query({})
    .then((tabs) => {
      for (const tab of tabs) {
        if (tab.id && tab.url) {
          updateTabDomainInfo(tab.id, tab.url);
        }
      }
      log.info(`✅ Re-evaluated ${tabs.length} tab(s)`);
    })
    .catch((error) => {
      log.error('❌ Failed to re-evaluate tabs:', error);
    });
}

/**
 * Initialize domain tracking for all open tabs on startup
 */
export async function initializeDomainTracking(): Promise<void> {
  try {
    const tabs = await Browser.tabs.query({});
    log.info(
      `🌐 Initializing domain tracking for ${tabs.length} open tab(s)...`
    );

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
