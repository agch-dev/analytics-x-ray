/**
 * Reload Handler
 *
 * Tracks page reloads by listening to tab updates and detecting URL changes.
 */

import Browser from 'webextension-polyfill';

import { createContextLogger } from '@src/lib';
import type { ReloadDetectedMessage } from '@src/types';

import { updateTabDomainInfo } from '../utils/domainTracking';

const log = createContextLogger('background');

/**
 * Track page reloads by listening to tab updates
 * Also tracks domain changes for allowlist checking
 */
export function setupReloadTracking(): void {
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
    if (
      changeInfo.url ||
      changeInfo.status === 'loading' ||
      changeInfo.status === 'complete'
    ) {
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

        log.debug(
          `✅ Recorded reload timestamp for tab ${tabId} (total: ${updatedReloads.length})`
        );

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
        log.error(
          `❌ Failed to record reload timestamp for tab ${tabId}:`,
          error
        );
      }
    }

    // Update the stored URL for this tab (in memory only)
    tabUrls.set(tabId, currentUrl);
  });

  log.info('🔄 Reload tracking initialized');
}
