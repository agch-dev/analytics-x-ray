/**
 * Domain Utilities
 * 
 * Functions for extracting, matching, and checking domains against allowlists.
 */

import Browser from 'webextension-polyfill';
import type { AllowedDomain } from '@src/stores/configStore';

/**
 * Extract domain from a URL
 * Returns null for invalid URLs or special pages (chrome://, about:, etc.)
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Handle special pages
    if (urlObj.protocol === 'chrome:' || urlObj.protocol === 'chrome-extension:' || urlObj.protocol === 'about:') {
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
 */
export function isDomainAllowed(domain: string, allowedDomains: AllowedDomain[]): boolean {
  if (!domain || allowedDomains.length === 0) {
    return false;
  }
  
  return allowedDomains.some((allowed) =>
    matchesDomainWithSubdomains(domain, allowed.domain, allowed.allowSubdomains)
  );
}

/**
 * Get domain from a tab URL
 * Returns null if tab doesn't exist or URL is invalid
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

