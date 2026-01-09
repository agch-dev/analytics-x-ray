import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Browser from 'webextension-polyfill';
import {
  extractDomain,
  normalizeDomain,
  getBaseDomain,
  matchesDomainWithSubdomains,
  isDomainAllowed,
  isSubdomainOfAllowedDomain,
  getTabDomain,
  isSpecialPage,
} from './domain';
import type { AllowedDomain } from '@src/stores/domainStore';

// Mock the logger
vi.mock('@src/lib/logger', () => ({
  createContextLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  default: {
    tabs: {
      get: vi.fn(),
    },
  },
}));

describe('domain.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractDomain', () => {
    it('should extract domain from HTTP URL', () => {
      expect(extractDomain('http://example.com')).toBe('example.com');
    });

    it('should extract domain from HTTPS URL', () => {
      expect(extractDomain('https://example.com')).toBe('example.com');
    });

    it('should extract domain from URL with path', () => {
      expect(extractDomain('https://example.com/path/to/page')).toBe('example.com');
    });

    it('should extract domain from URL with query parameters', () => {
      expect(extractDomain('https://example.com/page?param=value')).toBe('example.com');
    });

    it('should extract domain from URL with port', () => {
      expect(extractDomain('https://example.com:8080')).toBe('example.com');
    });

    it('should extract domain from URL with subdomain', () => {
      expect(extractDomain('https://app.example.com')).toBe('app.example.com');
    });

    it('should extract domain from URL with www', () => {
      expect(extractDomain('https://www.example.com')).toBe('www.example.com');
    });

    it('should return null for chrome:// URLs', () => {
      expect(extractDomain('chrome://settings')).toBeNull();
    });

    it('should return null for chrome-extension:// URLs', () => {
      expect(extractDomain('chrome-extension://abcdefghijklmnop')).toBeNull();
    });

    it('should return null for about: URLs', () => {
      expect(extractDomain('about:blank')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBeNull();
      expect(extractDomain('')).toBeNull();
    });

    it('should handle URLs with hash', () => {
      expect(extractDomain('https://example.com/page#section')).toBe('example.com');
    });

    it('should handle localhost', () => {
      expect(extractDomain('http://localhost:3000')).toBe('localhost');
    });

    it('should handle IP addresses', () => {
      expect(extractDomain('http://192.168.1.1')).toBe('192.168.1.1');
    });
  });

  describe('normalizeDomain', () => {
    it('should remove www. prefix (lowercase)', () => {
      expect(normalizeDomain('www.example.com')).toBe('example.com');
    });

    it('should remove www. prefix (uppercase)', () => {
      expect(normalizeDomain('WWW.EXAMPLE.COM')).toBe('EXAMPLE.COM');
    });

    it('should remove www. prefix (mixed case)', () => {
      expect(normalizeDomain('Www.Example.Com')).toBe('Example.Com');
    });

    it('should return domain unchanged if no www. prefix', () => {
      expect(normalizeDomain('example.com')).toBe('example.com');
    });

    it('should return domain unchanged for subdomains', () => {
      expect(normalizeDomain('app.example.com')).toBe('app.example.com');
    });

    it('should handle www.www.example.com (only removes first www.)', () => {
      expect(normalizeDomain('www.www.example.com')).toBe('www.example.com');
    });

    it('should handle single www', () => {
      expect(normalizeDomain('www')).toBe('www');
    });

    it('should handle www. with no domain', () => {
      expect(normalizeDomain('www.')).toBe('');
    });
  });

  describe('getBaseDomain', () => {
    it('should return base domain for simple domain', () => {
      expect(getBaseDomain('example.com')).toBe('example.com');
    });

    it('should return base domain for www domain', () => {
      expect(getBaseDomain('www.example.com')).toBe('example.com');
    });

    it('should return base domain for subdomain', () => {
      expect(getBaseDomain('app.example.com')).toBe('example.com');
    });

    it('should return base domain for multiple subdomains', () => {
      expect(getBaseDomain('api.v1.app.example.com')).toBe('example.com');
    });

    it('should handle domains with country code TLD', () => {
      expect(getBaseDomain('example.co.uk')).toBe('co.uk');
    });

    it('should handle single-part domain', () => {
      expect(getBaseDomain('localhost')).toBe('localhost');
    });

    it('should normalize www before extracting base', () => {
      expect(getBaseDomain('www.app.example.com')).toBe('example.com');
    });

    it('should handle domain with port (should not happen in practice)', () => {
      // Note: getBaseDomain expects a clean domain, but handles it gracefully
      // When split by '.', 'example.com:8080' becomes ['example', 'com:8080']
      // Since there are 2 parts, it returns the normalized domain as-is
      expect(getBaseDomain('example.com:8080')).toBe('example.com:8080');
    });
  });

  describe('matchesDomainWithSubdomains', () => {
    it('should match exact domains', () => {
      expect(matchesDomainWithSubdomains('example.com', 'example.com', false)).toBe(true);
    });

    it('should match domains after normalization (www)', () => {
      expect(matchesDomainWithSubdomains('www.example.com', 'example.com', false)).toBe(true);
      expect(matchesDomainWithSubdomains('example.com', 'www.example.com', false)).toBe(true);
    });

    it('should not match different domains', () => {
      expect(matchesDomainWithSubdomains('example.com', 'other.com', false)).toBe(false);
    });

    it('should match subdomain when allowSubdomains is true', () => {
      expect(matchesDomainWithSubdomains('app.example.com', 'example.com', true)).toBe(true);
    });

    it('should not match subdomain when allowSubdomains is false', () => {
      expect(matchesDomainWithSubdomains('app.example.com', 'example.com', false)).toBe(false);
    });

    it('should match nested subdomain when allowSubdomains is true', () => {
      expect(matchesDomainWithSubdomains('api.v1.app.example.com', 'example.com', true)).toBe(true);
    });

    it('should match base domain even when allowSubdomains is true', () => {
      expect(matchesDomainWithSubdomains('example.com', 'example.com', true)).toBe(true);
    });

    it('should handle www normalization with subdomains', () => {
      expect(matchesDomainWithSubdomains('www.example.com', 'example.com', true)).toBe(true);
      // app.www.example.com doesn't start with www., so it's not normalized
      // It ends with .example.com, so it matches when subdomains are allowed
      expect(matchesDomainWithSubdomains('app.www.example.com', 'example.com', true)).toBe(true);
    });

    it('should not match parent domain as subdomain', () => {
      expect(matchesDomainWithSubdomains('example.com', 'app.example.com', true)).toBe(false);
    });

    it('should handle case sensitivity correctly', () => {
      expect(matchesDomainWithSubdomains('Example.Com', 'example.com', false)).toBe(false);
    });
  });

  describe('isDomainAllowed', () => {
    it('should return false for empty domain', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isDomainAllowed('', allowedDomains)).toBe(false);
    });

    it('should return false for empty allowlist', () => {
      expect(isDomainAllowed('example.com', [])).toBe(false);
    });

    it('should return true for exact match', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isDomainAllowed('example.com', allowedDomains)).toBe(true);
    });

    it('should return true for www match (normalized)', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isDomainAllowed('www.example.com', allowedDomains)).toBe(true);
    });

    it('should return true for subdomain when allowed', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: true },
      ];
      expect(isDomainAllowed('app.example.com', allowedDomains)).toBe(true);
    });

    it('should return false for subdomain when not allowed', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isDomainAllowed('app.example.com', allowedDomains)).toBe(false);
    });

    it('should check multiple allowed domains', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
        { domain: 'other.com', allowSubdomains: true },
      ];
      expect(isDomainAllowed('example.com', allowedDomains)).toBe(true);
      expect(isDomainAllowed('other.com', allowedDomains)).toBe(true);
      expect(isDomainAllowed('app.other.com', allowedDomains)).toBe(true);
      expect(isDomainAllowed('unknown.com', allowedDomains)).toBe(false);
    });

    it('should return true if any domain matches', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
        { domain: 'other.com', allowSubdomains: false },
      ];
      expect(isDomainAllowed('example.com', allowedDomains)).toBe(true);
    });

    it('should handle nested subdomains when allowed', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: true },
      ];
      expect(isDomainAllowed('api.v1.app.example.com', allowedDomains)).toBe(true);
    });
  });

  describe('isSubdomainOfAllowedDomain', () => {
    it('should return null for empty domain', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isSubdomainOfAllowedDomain('', allowedDomains)).toBeNull();
    });

    it('should return null for empty allowlist', () => {
      expect(isSubdomainOfAllowedDomain('app.example.com', [])).toBeNull();
    });

    it('should return null for base domain (not a subdomain)', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isSubdomainOfAllowedDomain('example.com', allowedDomains)).toBeNull();
    });

    it('should return null for www domain (treated as base)', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isSubdomainOfAllowedDomain('www.example.com', allowedDomains)).toBeNull();
    });

    it('should return match for subdomain of allowed domain', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      const result = isSubdomainOfAllowedDomain('app.example.com', allowedDomains);
      expect(result).not.toBeNull();
      expect(result?.allowedDomain.domain).toBe('example.com');
      expect(result?.baseDomain).toBe('example.com');
    });

    it('should return null if subdomains are already allowed', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: true },
      ];
      expect(isSubdomainOfAllowedDomain('app.example.com', allowedDomains)).toBeNull();
    });

    it('should return match for nested subdomain', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      const result = isSubdomainOfAllowedDomain('api.v1.app.example.com', allowedDomains);
      expect(result).not.toBeNull();
      expect(result?.allowedDomain.domain).toBe('example.com');
      expect(result?.baseDomain).toBe('example.com');
    });

    it('should return null for domain not in allowlist', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isSubdomainOfAllowedDomain('app.other.com', allowedDomains)).toBeNull();
    });

    it('should check multiple allowed domains', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
        { domain: 'other.com', allowSubdomains: false },
      ];
      const result1 = isSubdomainOfAllowedDomain('app.example.com', allowedDomains);
      const result2 = isSubdomainOfAllowedDomain('app.other.com', allowedDomains);
      expect(result1?.allowedDomain.domain).toBe('example.com');
      expect(result2?.allowedDomain.domain).toBe('other.com');
    });

    it('should return null for exact match of allowed domain', () => {
      const allowedDomains: AllowedDomain[] = [
        { domain: 'example.com', allowSubdomains: false },
      ];
      expect(isSubdomainOfAllowedDomain('example.com', allowedDomains)).toBeNull();
    });
  });

  describe('getTabDomain', () => {
    it('should extract domain from valid tab URL', async () => {
      const mockTab = {
        id: 1,
        url: 'https://example.com/page',
      };
      vi.mocked(Browser.tabs.get).mockResolvedValue(mockTab as Browser.Tabs.Tab);

      const result = await getTabDomain(1);
      expect(result).toBe('example.com');
      expect(Browser.tabs.get).toHaveBeenCalledWith(1);
    });

    it('should return null for tab without URL', async () => {
      const mockTab = {
        id: 1,
        url: undefined,
      };
      vi.mocked(Browser.tabs.get).mockResolvedValue(mockTab as Browser.Tabs.Tab);

      const result = await getTabDomain(1);
      expect(result).toBeNull();
    });

    it('should return null for special page URLs', async () => {
      const mockTab = {
        id: 1,
        url: 'chrome://settings',
      };
      vi.mocked(Browser.tabs.get).mockResolvedValue(mockTab as Browser.Tabs.Tab);

      const result = await getTabDomain(1);
      expect(result).toBeNull();
    });

    it('should return null when tab does not exist', async () => {
      vi.mocked(Browser.tabs.get).mockRejectedValue(new Error('Tab not found'));

      const result = await getTabDomain(999);
      expect(result).toBeNull();
    });

    it('should handle invalid URLs gracefully', async () => {
      const mockTab = {
        id: 1,
        url: 'not-a-valid-url',
      };
      vi.mocked(Browser.tabs.get).mockResolvedValue(mockTab as Browser.Tabs.Tab);

      const result = await getTabDomain(1);
      expect(result).toBeNull();
    });

    it('should extract domain from URL with subdomain', async () => {
      const mockTab = {
        id: 1,
        url: 'https://app.example.com',
      };
      vi.mocked(Browser.tabs.get).mockResolvedValue(mockTab as Browser.Tabs.Tab);

      const result = await getTabDomain(1);
      expect(result).toBe('app.example.com');
    });
  });

  describe('isSpecialPage', () => {
    it('should return true for chrome:// URLs', () => {
      expect(isSpecialPage('chrome://settings')).toBe(true);
      expect(isSpecialPage('chrome://extensions')).toBe(true);
    });

    it('should return true for chrome-extension:// URLs', () => {
      expect(isSpecialPage('chrome-extension://abcdefghijklmnop')).toBe(true);
    });

    it('should return true for about: URLs', () => {
      expect(isSpecialPage('about:blank')).toBe(true);
      expect(isSpecialPage('about:config')).toBe(true);
    });

    it('should return true for moz-extension:// URLs', () => {
      expect(isSpecialPage('moz-extension://abcdefghijklmnop')).toBe(true);
    });

    it('should return false for HTTP URLs', () => {
      expect(isSpecialPage('http://example.com')).toBe(false);
    });

    it('should return false for HTTPS URLs', () => {
      expect(isSpecialPage('https://example.com')).toBe(false);
    });

    it('should return false for file:// URLs', () => {
      expect(isSpecialPage('file:///path/to/file')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isSpecialPage('not-a-url')).toBe(false);
      expect(isSpecialPage('')).toBe(false);
    });

    it('should handle URLs with paths', () => {
      expect(isSpecialPage('chrome://settings/advanced')).toBe(true);
      expect(isSpecialPage('https://example.com/page')).toBe(false);
    });
  });
});
