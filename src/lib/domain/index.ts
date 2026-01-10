/**
 * Domain Utilities
 *
 * Functions for extracting, matching, and checking domains against allowlists.
 */

import Browser from 'webextension-polyfill';

import type { AllowedDomain } from '@src/stores';

/**
 * Extract domain from a URL
 * Returns null for invalid URLs or special pages (chrome://, about:, etc.)
 *
 * @param url - The URL to extract domain from
 * @returns The domain string or null if invalid/special page
 *
 * @example
 * ```ts
 * extractDomain('https://www.example.com/page'); // 'www.example.com'
 * extractDomain('chrome://settings'); // null
 * ```
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Handle special pages
    if (
      urlObj.protocol === 'chrome:' ||
      urlObj.protocol === 'chrome-extension:' ||
      urlObj.protocol === 'about:'
    ) {
      return null;
    }

    // Remove port if present
    return hostname.split(':')[0];
  } catch {
    // Invalid URL
    return null;
  }
}

/**
 * Normalize a domain by stripping www. prefix
 * www.example.com -> example.com
 *
 * @param domain - The domain to normalize
 * @returns Normalized domain without www. prefix
 *
 * @example
 * ```ts
 * normalizeDomain('www.example.com'); // 'example.com'
 * normalizeDomain('example.com'); // 'example.com'
 * ```
 */
export function normalizeDomain(domain: string): string {
  // Remove www. prefix if present (case-insensitive)
  if (domain.toLowerCase().startsWith('www.')) {
    return domain.slice(4);
  }
  return domain;
}

/**
 * Get the base domain (root domain) by removing subdomains
 * app.example.com -> example.com
 * www.example.com -> example.com
 * example.com -> example.com
 *
 * @param domain - The domain to get base domain from
 * @returns The base domain (last two parts)
 *
 * @example
 * ```ts
 * getBaseDomain('app.example.com'); // 'example.com'
 * getBaseDomain('www.example.com'); // 'example.com'
 * ```
 */
export function getBaseDomain(domain: string): string {
  const normalized = normalizeDomain(domain);
  const parts = normalized.split('.');

  // If it's already a base domain (2 parts like example.com), return as-is
  if (parts.length <= 2) {
    return normalized;
  }

  // Return the last two parts (base domain)
  return parts.slice(-2).join('.');
}

/**
 * Check if a domain matches an allowed domain, considering subdomain settings
 * Treats www. as the base domain (www.example.com matches example.com)
 *
 * @param domain - The domain to check
 * @param allowedDomain - The allowed domain to match against
 * @param allowSubdomains - Whether subdomains are allowed
 * @returns true if domain matches
 *
 * @example
 * ```ts
 * matchesDomainWithSubdomains('app.example.com', 'example.com', true); // true
 * matchesDomainWithSubdomains('app.example.com', 'example.com', false); // false
 * ```
 */
export function matchesDomainWithSubdomains(
  domain: string,
  allowedDomain: string,
  allowSubdomains: boolean
): boolean {
  // Normalize both domains (strip www.)
  const normalizedDomain = normalizeDomain(domain);
  const normalizedAllowed = normalizeDomain(allowedDomain);

  // Exact match (after normalization)
  if (normalizedDomain === normalizedAllowed) {
    return true;
  }

  // If subdomains are allowed, check if domain is a subdomain of allowedDomain
  if (allowSubdomains) {
    // Check if normalized domain ends with .normalizedAllowed
    // e.g., "app.example.com" matches "example.com" with subdomains
    return normalizedDomain.endsWith(`.${normalizedAllowed}`);
  }

  return false;
}

/**
 * Check if a domain is in the allowlist
 *
 * @param domain - The domain to check
 * @param allowedDomains - Array of allowed domains
 * @returns true if domain is allowed
 *
 * @example
 * ```ts
 * isDomainAllowed('example.com', [{ domain: 'example.com', allowSubdomains: false }]); // true
 * ```
 */
export function isDomainAllowed(
  domain: string,
  allowedDomains: AllowedDomain[]
): boolean {
  if (!domain || allowedDomains.length === 0) {
    return false;
  }

  for (const allowed of allowedDomains) {
    const matches = matchesDomainWithSubdomains(
      domain,
      allowed.domain,
      allowed.allowSubdomains
    );
    if (matches) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a domain is a subdomain of an allowed domain (excluding www.)
 * Returns the matching allowed domain if found, null otherwise
 *
 * @param domain - The domain to check
 * @param allowedDomains - Array of allowed domains
 * @returns Object with matching allowed domain and base domain, or null
 *
 * @example
 * ```ts
 * isSubdomainOfAllowedDomain('app.example.com', [{ domain: 'example.com', allowSubdomains: false }]);
 * // Returns: { allowedDomain: {...}, baseDomain: 'example.com' }
 * ```
 */
export function isSubdomainOfAllowedDomain(
  domain: string,
  allowedDomains: AllowedDomain[]
): { allowedDomain: AllowedDomain; baseDomain: string } | null {
  if (!domain || allowedDomains.length === 0) {
    return null;
  }

  const normalizedDomain = normalizeDomain(domain);
  const baseDomain = getBaseDomain(normalizedDomain);

  // Check if www. - in that case, it's not a subdomain, it's the base domain
  if (normalizedDomain === baseDomain) {
    return null;
  }

  // Check each allowed domain
  for (const allowed of allowedDomains) {
    const normalizedAllowed = normalizeDomain(allowed.domain);

    // If subdomains are already allowed, this case shouldn't happen
    // (the domain would already be allowed)
    if (allowed.allowSubdomains) {
      continue;
    }

    // Check if the base domain matches the allowed domain
    if (baseDomain === normalizedAllowed) {
      // Verify that the current domain is actually a subdomain
      // (not just the base domain with www.)
      if (
        normalizedDomain !== normalizedAllowed &&
        normalizedDomain.endsWith(`.${normalizedAllowed}`)
      ) {
        return { allowedDomain: allowed, baseDomain: normalizedAllowed };
      }
    }
  }

  return null;
}

/**
 * Get domain from a tab URL
 * Returns null if tab doesn't exist or URL is invalid
 *
 * @param tabId - The tab ID to get domain for
 * @returns The domain string or null
 *
 * @example
 * ```ts
 * const domain = await getTabDomain(123);
 * ```
 */
export async function getTabDomain(tabId: number): Promise<string | null> {
  try {
    const tab = await Browser.tabs.get(tabId);
    if (!tab.url) {
      return null;
    }
    return extractDomain(tab.url);
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a special page that shouldn't be tracked
 *
 * @param url - The URL to check
 * @returns true if URL is a special page
 *
 * @example
 * ```ts
 * isSpecialPage('chrome://settings'); // true
 * isSpecialPage('https://example.com'); // false
 * ```
 */
export function isSpecialPage(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.protocol === 'chrome:' ||
      urlObj.protocol === 'chrome-extension:' ||
      urlObj.protocol === 'about:' ||
      urlObj.protocol === 'moz-extension:'
    );
  } catch {
    return false;
  }
}
