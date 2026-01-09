/**
 * Domain Input Validation
 * 
 * Utilities for validating domain inputs before adding to allowlist
 */

import { extractDomain, normalizeDomain, isSpecialPage } from './domain';

/**
 * Validation result for domain input
 */
export interface DomainValidationResult {
  isValid: boolean;
  error?: string;
  normalizedDomain?: string;
}

/**
 * Validate a domain input string
 * 
 * @param input - The domain input (can be a URL or domain name)
 * @returns Validation result with error message if invalid
 * 
 * @example
 * ```ts
 * validateDomainInput('example.com'); // { isValid: true, normalizedDomain: 'example.com' }
 * validateDomainInput('https://example.com'); // { isValid: true, normalizedDomain: 'example.com' }
 * validateDomainInput('invalid..domain'); // { isValid: false, error: 'Invalid domain format' }
 * ```
 */
export function validateDomainInput(input: string): DomainValidationResult {
  const trimmed = input.trim();
  
  // Empty input
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Domain cannot be empty',
    };
  }

  // Try to extract domain from URL
  let domain: string | null = null;
  
  // If it looks like a URL, try to extract domain
  if (trimmed.includes('://') || trimmed.startsWith('//')) {
    try {
      // Add protocol if missing
      const url = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
      domain = extractDomain(url);
    } catch {
      // Invalid URL format
    }
  } else {
    // Try as domain directly
    try {
      // Test if it's a valid domain by creating a URL
      const testUrl = `https://${trimmed}`;
      domain = extractDomain(testUrl);
    } catch {
      // Invalid domain format
    }
  }

  // If extraction failed, validate as domain string directly
  if (!domain) {
    // Basic domain format validation
    const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    
    // Remove www. for validation
    const withoutWww = trimmed.toLowerCase().replace(/^www\./, '');
    
    if (!domainPattern.test(withoutWww)) {
      return {
        isValid: false,
        error: 'Invalid domain format. Please enter a valid domain (e.g., example.com) or URL',
      };
    }
    
    // Use the normalized input as domain
    domain = normalizeDomain(trimmed);
  }

  // Check for special pages
  if (domain && isSpecialPage(`https://${domain}`)) {
    return {
      isValid: false,
      error: 'Special browser pages cannot be added to the allowlist',
    };
  }

  // Validate domain length
  if (domain && domain.length > 253) {
    return {
      isValid: false,
      error: 'Domain name is too long (maximum 253 characters)',
    };
  }

  // Validate domain parts
  if (domain) {
    const parts = domain.split('.');
    
    // Each part must be <= 63 characters
    if (parts.some((part) => part.length > 63)) {
      return {
        isValid: false,
        error: 'Domain part is too long (maximum 63 characters per part)',
      };
    }

    // Must have at least 2 parts (e.g., example.com)
    if (parts.length < 2) {
      return {
        isValid: false,
        error: 'Domain must have at least a top-level domain (e.g., example.com)',
      };
    }
  }

  return {
    isValid: true,
    normalizedDomain: domain || normalizeDomain(trimmed),
  };
}

/**
 * Sanitize search query input
 * Removes potentially dangerous characters while preserving search functionality
 * 
 * @param query - The search query to sanitize
 * @returns Sanitized query string
 * 
 * @example
 * ```ts
 * sanitizeSearchQuery('<script>alert("xss")</script>'); // 'scriptalertxssscript'
 * sanitizeSearchQuery('normal search'); // 'normal search'
 * ```
 */
export function sanitizeSearchQuery(query: string): string {
  // Remove HTML tags and script content
  return query
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove remaining angle brackets
    .trim()
    .slice(0, 500); // Limit length to prevent abuse
}

/**
 * Validate search query length
 * 
 * @param query - The search query to validate
 * @returns true if query is valid, false if too long
 */
export function isValidSearchQuery(query: string): boolean {
  return query.length <= 500;
}
