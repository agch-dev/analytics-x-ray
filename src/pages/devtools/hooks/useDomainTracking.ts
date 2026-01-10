/**
 * Domain Tracking Hook
 *
 * Handles domain checking and auto-allowing logic for the DevTools panel.
 * Automatically adds domains to the allowlist when first visited.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import Browser from 'webextension-polyfill';

import {
  getTabDomain,
  isDomainAllowed,
  normalizeDomain,
} from '@src/lib/domain';
import { createContextLogger } from '@src/lib/logger';
import { useDomainStore, selectAllowedDomains } from '@src/stores';
import { isDomainChangedMessage } from '@src/types';

const log = createContextLogger('panel');

interface UseDomainTrackingOptions {
  tabId: number;
}

interface UseDomainTrackingResult {
  domainAllowed: boolean | null;
  domainCheckComplete: boolean;
}

/**
 * Hook for tracking domain allowlist status and auto-allowing domains
 *
 * @param options - Configuration options
 * @param options.tabId - The tab ID to track
 * @returns Domain tracking state
 */
export function useDomainTracking({
  tabId,
}: UseDomainTrackingOptions): UseDomainTrackingResult {
  // Domain tracking state
  const [domainAllowed, setDomainAllowed] = useState<boolean | null>(null);
  const [domainCheckComplete, setDomainCheckComplete] = useState(false);

  // Get allowed domains from domain store
  const allowedDomains = useDomainStore(selectAllowedDomains);
  const autoAllowDomain = useDomainStore((state) => state.autoAllowDomain);

  // Track which domain we've already auto-allowed to avoid duplicate additions
  const autoAllowedDomainRef = useRef<string | null>(null);
  // Track previous normalized domain to detect domain changes
  const previousNormalizedDomainRef = useRef<string | null>(null);

  // Function to check domain
  const checkDomain = useCallback(async () => {
    try {
      // Try to get domain from background script first (it has the cached domain info)
      let domain: string | null = null;
      try {
        const response = await Browser.runtime.sendMessage({
          type: 'GET_TAB_DOMAIN',
          tabId,
        });
        if (response && typeof response === 'string') {
          domain = response;
        }
      } catch (error) {
        // Fallback to direct method
        domain = await getTabDomain(tabId);
      }

      if (!domain) {
        // Special page or invalid URL
        setDomainAllowed(false);
        setDomainCheckComplete(true);
        previousNormalizedDomainRef.current = null;
        return;
      }

      // Normalize domain
      const normalizedDomain = normalizeDomain(domain);

      // Reset auto-allowed ref if domain changed
      if (
        previousNormalizedDomainRef.current &&
        previousNormalizedDomainRef.current !== normalizedDomain
      ) {
        // Domain changed, reset auto-allowed tracking
        autoAllowedDomainRef.current = null;
      }
      previousNormalizedDomainRef.current = normalizedDomain;

      // Get latest allowed domains from store (always use fresh state)
      const latestAllowedDomains = useDomainStore.getState().allowedDomains;

      // Check if domain is allowed
      let allowed = isDomainAllowed(domain, latestAllowedDomains);

      // Auto-allow feature: automatically add domain to allowed list if not already there
      // Only do this once per domain (tracked by ref)
      if (!allowed && autoAllowedDomainRef.current !== normalizedDomain) {
        const result = autoAllowDomain(domain);

        // Log the result
        if (result.action === 'added') {
          log.info(
            `✨ Auto-allowing domain: ${result.domain} (subdomains: ${result.allowSubdomains})`
          );
        } else if (result.action === 'updated') {
          log.info(
            `✨ Updating ${result.domain} to allow subdomains (visited ${normalizedDomain})`
          );
        }

        // Mark this domain as auto-allowed
        autoAllowedDomainRef.current = normalizedDomain;

        // Get updated allowed domains for logging
        const updatedAllowedDomains = useDomainStore.getState().allowedDomains;
        log.info(
          `📋 Updated allowed domains:`,
          updatedAllowedDomains.map(
            (d: { domain: string; allowSubdomains: boolean }) =>
              `${d.domain} (subdomains: ${d.allowSubdomains})`
          )
        );
        log.info(`🔍 Domain ${domain} should be allowed: ${result.isAllowed}`);

        // Immediately trigger background script to re-evaluate this tab's domain
        // This ensures the background script picks up the new/updated allowed domain right away
        // Use requestAnimationFrame to ensure store update has propagated
        if (result.action === 'added' || result.action === 'updated') {
          requestAnimationFrame(() => {
            Browser.runtime
              .sendMessage({
                type: 'RE_EVALUATE_TAB_DOMAIN',
                tabId,
              })
              .then((result) => {
                log.info(
                  `✅ Domain re-evaluation triggered for tab ${tabId}, result:`,
                  result
                );
              })
              .catch((error) => {
                log.error('❌ Failed to trigger domain re-evaluation:', error);
              });
          });
        }

        // Use the result from auto-allow
        allowed = result.isAllowed;
      } else if (
        !allowed &&
        autoAllowedDomainRef.current === normalizedDomain
      ) {
        // Domain was already auto-allowed but still not allowed (edge case)
        // Re-check with latest state
        const latestState = useDomainStore.getState().allowedDomains;
        allowed = isDomainAllowed(domain, latestState);
      }

      // If domain was auto-allowed, ensure it's marked as allowed
      // (this handles the case where auto-allow happened but state hasn't updated yet)
      const finalAllowed =
        allowed || autoAllowedDomainRef.current === normalizedDomain;
      setDomainAllowed(finalAllowed);
      setDomainCheckComplete(true);
    } catch (error) {
      log.error('❌ [Panel] Failed to check domain:', error);
      setDomainAllowed(false);
      setDomainCheckComplete(true);
    }
  }, [tabId, allowedDomains, autoAllowDomain]);

  // Check domain on mount and when allowlist/denylist changes
  useEffect(() => {
    checkDomain();
  }, [checkDomain]);

  // Listen for domain change messages from background script
  useEffect(() => {
    const handleMessage = (message: unknown) => {
      if (isDomainChangedMessage(message) && message.tabId === tabId) {
        log.info(
          `🌐 Domain changed notification received for tab ${tabId}: ${message.domain}`
        );
        // Re-check domain when we get a change notification
        checkDomain();
      }
    };

    Browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      Browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, [tabId, checkDomain]);

  // Also periodically check domain (fallback in case messages don't arrive)
  // Only check if domain check is not complete or domain is not allowed yet
  // This reduces unnecessary requests when domain is already allowed
  useEffect(() => {
    // Skip periodic checks if domain is already allowed and check is complete
    if (domainCheckComplete && domainAllowed === true) {
      return;
    }

    const interval = setInterval(() => {
      // Only check if we haven't completed the check or domain is not allowed
      if (!domainCheckComplete || domainAllowed !== true) {
        checkDomain();
      }
    }, 5000); // Check every 5 seconds (reduced frequency)

    return () => clearInterval(interval);
  }, [checkDomain, domainCheckComplete, domainAllowed]);

  return {
    domainAllowed,
    domainCheckComplete,
  };
}
