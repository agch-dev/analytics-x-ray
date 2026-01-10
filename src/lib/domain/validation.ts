/**
 * Domain Input Validation
 *
 * Utilities for validating domain inputs before adding to allowlist
 */

import { extractDomain, normalizeDomain, isSpecialPage } from './index';

/**
 * Validation result for domain input
 */
export interface DomainValidationResult {
  isValid: boolean;
  error?: string;
  normalizedDomain?: string;
}

/**
 * Extract domain from input string (URL or domain)
 */
function extractDomainFromInput(input: string): string | null {
  const trimmed = input.trim();

  // If it looks like a URL, try to extract domain
  if (trimmed.includes('://') || trimmed.startsWith('//')) {
    try {
      const url = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
      return extractDomain(url);
    } catch {
      return null;
    }
  }

  // Try as domain directly
  try {
    const testUrl = `https://${trimmed}`;
    return extractDomain(testUrl);
  } catch {
    return null;
  }
}

/**
 * Validate domain format using regex pattern
 */
function validateDomainFormat(input: string): boolean {
  const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  const withoutWww = input.toLowerCase().replace(/^www\./, '');
  return domainPattern.test(withoutWww);
}

/**
 * Validate domain structure (length, parts)
 */
function validateDomainStructure(
  domain: string
): DomainValidationResult | null {
  // Check for special pages
  if (isSpecialPage(`https://${domain}`)) {
    return {
      isValid: false,
      error: 'Special browser pages cannot be added to the allowlist',
    };
  }

  // Validate domain length
  if (domain.length > 253) {
    return {
      isValid: false,
      error: 'Domain name is too long (maximum 253 characters)',
    };
  }

  // Validate domain parts
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

  return null; // No errors
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
  let domain = extractDomainFromInput(trimmed);

  // If extraction failed, validate as domain string directly
  if (!domain) {
    if (!validateDomainFormat(trimmed)) {
      return {
        isValid: false,
        error:
          'Invalid domain format. Please enter a valid domain (e.g., example.com) or URL',
      };
    }
    domain = normalizeDomain(trimmed);
  }

  // Validate domain structure
  const structureError = validateDomainStructure(domain);
  if (structureError) {
    return structureError;
  }

  return {
    isValid: true,
    normalizedDomain: domain,
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
  // Use limited quantifier to prevent catastrophic backtracking
  return query
    .replace(/<[^>]{0,1000}>/g, '') // Remove HTML tags (limit to 1000 chars per tag)
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
