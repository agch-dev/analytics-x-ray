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
import { useDomainStore } from '@src/stores';
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

  // Get auto-allow function from domain store
  // Note: allowedDomains is accessed via useDomainStore.getState() inside callbacks
  // to ensure we always get the latest state
  const autoAllowDomain = useDomainStore((state) => state.autoAllowDomain);

  // Track which domain we've already auto-allowed to avoid duplicate additions
  const autoAllowedDomainRef = useRef<string | null>(null);
  // Track previous normalized domain to detect domain changes
  const previousNormalizedDomainRef = useRef<string | null>(null);

  // Helper function to fetch domain from background script or fallback
  const fetchDomain = useCallback(async (): Promise<string | null> => {
    try {
      const response = await Browser.runtime.sendMessage({
        type: 'GET_TAB_DOMAIN',
        tabId,
      });
      if (response && typeof response === 'string') {
        return response;
      }
    } catch (error) {
      // Fallback to direct method if background script is unavailable
      log.debug(
        'Background script unavailable, using direct domain fetch:',
        error
      );
      return await getTabDomain(tabId);
    }
    return await getTabDomain(tabId);
  }, [tabId]);

  // Helper function to handle domain change detection
  const handleDomainChange = useCallback((normalizedDomain: string) => {
    if (
      previousNormalizedDomainRef.current &&
      previousNormalizedDomainRef.current !== normalizedDomain
    ) {
      // Domain changed, reset auto-allowed tracking
      autoAllowedDomainRef.current = null;
    }
    previousNormalizedDomainRef.current = normalizedDomain;
  }, []);

  // Helper function to log auto-allow result
  const logAutoAllowResult = useCallback(
    (
      result: { action: string; domain: string; allowSubdomains: boolean },
      normalizedDomain: string,
      domain: string
    ) => {
      if (result.action === 'added') {
        log.info(
          `✨ Auto-allowing domain: ${result.domain} (subdomains: ${result.allowSubdomains})`
        );
      } else if (result.action === 'updated') {
        log.info(
          `✨ Updating ${result.domain} to allow subdomains (visited ${normalizedDomain})`
        );
      }

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
    },
    []
  );

  // Helper function to trigger domain re-evaluation
  const triggerDomainReEvaluation = useCallback(() => {
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
  }, [tabId]);

  // Helper function to handle auto-allow logic
  const handleAutoAllow = useCallback(
    (domain: string, normalizedDomain: string, allowed: boolean): boolean => {
      if (!allowed && autoAllowedDomainRef.current !== normalizedDomain) {
        const result = autoAllowDomain(domain);

        logAutoAllowResult(result, normalizedDomain, domain);

        // Mark this domain as auto-allowed
        autoAllowedDomainRef.current = normalizedDomain;

        // Trigger re-evaluation if domain was added or updated
        if (result.action === 'added' || result.action === 'updated') {
          triggerDomainReEvaluation();
        }

        return result.isAllowed;
      }

      if (!allowed && autoAllowedDomainRef.current === normalizedDomain) {
        // Domain was already auto-allowed but still not allowed (edge case)
        // Re-check with latest state
        const latestState = useDomainStore.getState().allowedDomains;
        return isDomainAllowed(domain, latestState);
      }

      return allowed;
    },
    [autoAllowDomain, logAutoAllowResult, triggerDomainReEvaluation]
  );

  // Function to check domain
  const checkDomain = useCallback(async () => {
    try {
      const domain = await fetchDomain();

      if (!domain) {
        // Special page or invalid URL
        setDomainAllowed(false);
        setDomainCheckComplete(true);
        previousNormalizedDomainRef.current = null;
        return;
      }

      // Normalize domain
      const normalizedDomain = normalizeDomain(domain);
      handleDomainChange(normalizedDomain);

      // Get latest allowed domains from store (always use fresh state)
      const latestAllowedDomains = useDomainStore.getState().allowedDomains;

      // Check if domain is allowed
      let allowed = isDomainAllowed(domain, latestAllowedDomains);

      // Auto-allow feature: automatically add domain to allowed list if not already there
      allowed = handleAutoAllow(domain, normalizedDomain, allowed);

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
    // allowedDomains is accessed via useDomainStore.getState() inside the callback,
    // so we don't need it in the dependency array
  }, [fetchDomain, handleDomainChange, handleAutoAllow]);

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
