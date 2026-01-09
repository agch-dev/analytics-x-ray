/**
 * Domain Handler
 * 
 * Handles domain allowlist changes and re-evaluation of tabs.
 */

import Browser from 'webextension-polyfill';
import { createContextLogger } from '@src/lib/logger';
import { extractDomain } from '@src/lib/domain';
import { useDomainStore } from '@src/stores/domainStore';
import { updateTabDomainInfo, reEvaluateAllTabs, tabDomains } from '../utils/domainTracking';

const log = createContextLogger('background');

/**
 * Set up domain allowlist change listener
 * Re-evaluates all tabs when allowlist is modified
 */
export function setupDomainAllowlistListener(): void {
  let previousAllowedDomains = useDomainStore.getState().allowedDomains;
  
  useDomainStore.subscribe((state) => {
    const currentAllowedDomains = state.allowedDomains;
    
    // Check if allowlist changed
    const allowlistChanged = 
      currentAllowedDomains.length !== previousAllowedDomains.length ||
      currentAllowedDomains.some((domain, index) => 
        domain.domain !== previousAllowedDomains[index]?.domain ||
        domain.allowSubdomains !== previousAllowedDomains[index]?.allowSubdomains
      );
    
    if (allowlistChanged) {
      log.info('📋 Domain allowlist changed, re-evaluating tabs...');
      reEvaluateAllTabs();
      previousAllowedDomains = currentAllowedDomains;
    }
  });
  
  log.info('👂 Domain allowlist change listener registered');
}

/**
 * Set up storage change listener to sync domain store updates from other contexts
 * This ensures the background script picks up changes made in Panel/Options pages
 */
export function setupStorageSyncListener(): void {
  const handleStorageChange = (
    changes: Browser.Storage.StorageAreaOnChangedChangesType,
    areaName: string
  ) => {
    // Only listen to local storage changes
    if (areaName !== 'local') return;
    
    // Check if the domain storage key changed
    const domainKey = 'analytics-xray-domain';
    if (changes[domainKey]) {
      log.info('📋 Domain storage changed, rehydrating store...');
      
      // Read the new domain config from storage and update the store
      Browser.storage.local.get(domainKey).then((result) => {
        const storedValue = result[domainKey];
        if (storedValue && typeof storedValue === 'string') {
          try {
            const parsed = JSON.parse(storedValue);
            const { state: newState } = parsed;
            if (newState) {
              // Update the store with the new state
              useDomainStore.setState(newState);
              log.info('✅ Domain store rehydrated from storage');
              log.debug('📋 Updated allowed domains:', newState.allowedDomains?.map((d: { domain: string; allowSubdomains: boolean }) => `${d.domain} (subdomains: ${d.allowSubdomains})`) || []);
              
              // Re-evaluate all tabs after store update
              reEvaluateAllTabs();
            }
          } catch (error) {
            log.error('❌ Failed to parse domain storage:', error);
          }
        }
      });
    }
  };
  
  Browser.storage.onChanged.addListener(handleStorageChange);
  log.info('👂 Storage sync listener registered');
}

/**
 * Handle re-evaluation of a specific tab's domain
 */
export async function handleReEvaluateTabDomain(tabId: number): Promise<boolean> {
  log.info(`🔄 Re-evaluating domain for tab ${tabId} (requested by panel)`);
  return Browser.tabs.get(tabId)
    .then((tab) => {
      if (tab.url) {
        log.info(`📋 Current allowed domains before re-evaluation:`, useDomainStore.getState().allowedDomains.map(d => `${d.domain} (subdomains: ${d.allowSubdomains})`));
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

/**
 * Get domain for a specific tab
 */
export async function getTabDomain(tabId: number): Promise<string | null> {
  const tabDomainInfo = tabDomains.get(tabId);
  if (tabDomainInfo) {
    log.debug(`🌐 Returning domain for tab ${tabId}: ${tabDomainInfo.domain}`);
    return tabDomainInfo.domain;
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
