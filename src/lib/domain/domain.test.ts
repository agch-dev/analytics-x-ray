import { describe, it, expect, vi, beforeEach } from 'vitest';
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
} from './index';
import type { AllowedDomain } from '@src/stores';

// Mock webextension-polyfill
vi.mock('webextension-polyfill', () => ({
  default: {
    tabs: {
      get: vi.fn(),
    },
  },
}));

describe('domain utilities', () => {
  describe('extractDomain', () => {
    it('should extract domain from https URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
    });

    it('should extract domain from http URL', () => {
      expect(extractDomain('http://example.com/path')).toBe('example.com');
    });

    it('should extract domain with subdomain', () => {
      expect(extractDomain('https://app.example.com/path')).toBe('app.example.com');
    });

    it('should extract domain with port', () => {
      expect(extractDomain('https://example.com:8080/path')).toBe('example.com');
    });

    it('should return null for chrome:// URLs', () => {
      expect(extractDomain('chrome://settings')).toBeNull();
    });

    it('should return null for chrome-extension:// URLs', () => {
      expect(extractDomain('chrome-extension://abc123/popup.html')).toBeNull();
    });

    it('should return null for about: URLs', () => {
      expect(extractDomain('about:blank')).toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBeNull();
    });
  });

  describe('normalizeDomain', () => {
    it('should remove www. prefix', () => {
      expect(normalizeDomain('www.example.com')).toBe('example.com');
    });

    it('should remove www. prefix case-insensitively', () => {
      expect(normalizeDomain('WWW.example.com')).toBe('example.com');
    });

    it('should return domain as-is if no www. prefix', () => {
      expect(normalizeDomain('example.com')).toBe('example.com');
    });

    it('should handle subdomains with www.', () => {
      expect(normalizeDomain('www.app.example.com')).toBe('app.example.com');
    });
  });

  describe('getBaseDomain', () => {
    it('should return base domain for subdomain', () => {
      expect(getBaseDomain('app.example.com')).toBe('example.com');
    });

    it('should return base domain after removing www.', () => {
      expect(getBaseDomain('www.example.com')).toBe('example.com');
    });

    it('should return domain as-is if already base domain', () => {
      expect(getBaseDomain('example.com')).toBe('example.com');
    });

    it('should handle multiple subdomains', () => {
      expect(getBaseDomain('sub1.sub2.example.com')).toBe('example.com');
    });
  });

  describe('matchesDomainWithSubdomains', () => {
    it('should match exact domain', () => {
      expect(matchesDomainWithSubdomains('example.com', 'example.com', false)).toBe(true);
    });

    it('should match after normalizing www.', () => {
      expect(matchesDomainWithSubdomains('www.example.com', 'example.com', false)).toBe(true);
    });

    it('should match subdomain when allowSubdomains is true', () => {
      expect(matchesDomainWithSubdomains('app.example.com', 'example.com', true)).toBe(true);
    });

    it('should not match subdomain when allowSubdomains is false', () => {
      expect(matchesDomainWithSubdomains('app.example.com', 'example.com', false)).toBe(false);
    });

    it('should not match different domain', () => {
      expect(matchesDomainWithSubdomains('other.com', 'example.com', true)).toBe(false);
    });
  });

  describe('isDomainAllowed', () => {
    const allowedDomains: AllowedDomain[] = [
      { domain: 'example.com', allowSubdomains: false },
      { domain: 'test.com', allowSubdomains: true },
    ];

    it('should return true if any domain matches', () => {
      expect(isDomainAllowed('example.com', allowedDomains)).toBe(true);
    });

    it('should return true for subdomain when allowSubdomains is true', () => {
      expect(isDomainAllowed('app.test.com', allowedDomains)).toBe(true);
    });

    it('should return false for subdomain when allowSubdomains is false', () => {
      expect(isDomainAllowed('app.example.com', allowedDomains)).toBe(false);
    });

    it('should return false for domain not in list', () => {
      expect(isDomainAllowed('other.com', allowedDomains)).toBe(false);
    });

    it('should return false for empty domain', () => {
      expect(isDomainAllowed('', allowedDomains)).toBe(false);
    });

    it('should return false for empty allowlist', () => {
      expect(isDomainAllowed('example.com', [])).toBe(false);
    });
  });

  describe('isSubdomainOfAllowedDomain', () => {
    const allowedDomains: AllowedDomain[] = [
      { domain: 'example.com', allowSubdomains: false },
      { domain: 'test.com', allowSubdomains: true },
    ];

    it('should return matching domain for subdomain', () => {
      const result = isSubdomainOfAllowedDomain('app.example.com', allowedDomains);
      expect(result).not.toBeNull();
      expect(result?.allowedDomain.domain).toBe('example.com');
      expect(result?.baseDomain).toBe('example.com');
    });

    it('should return null for base domain', () => {
      expect(isSubdomainOfAllowedDomain('example.com', allowedDomains)).toBeNull();
    });

    it('should return null when subdomains are already allowed', () => {
      expect(isSubdomainOfAllowedDomain('app.test.com', allowedDomains)).toBeNull();
    });

    it('should return null for domain not in list', () => {
      expect(isSubdomainOfAllowedDomain('other.com', allowedDomains)).toBeNull();
    });
  });

  describe('getTabDomain', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should extract domain from tab URL', async () => {
      (Browser.tabs.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        url: 'https://example.com/page',
      });

      const domain = await getTabDomain(123);
      expect(domain).toBe('example.com');
      expect(Browser.tabs.get).toHaveBeenCalledWith(123);
    });

    it('should return null if tab has no URL', async () => {
      (Browser.tabs.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        url: undefined,
      });

      const domain = await getTabDomain(123);
      expect(domain).toBeNull();
    });

    it('should return null if tab does not exist', async () => {
      (Browser.tabs.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Tab not found'));

      const domain = await getTabDomain(999);
      expect(domain).toBeNull();
    });
  });

  describe('isSpecialPage', () => {
    it('should return true for chrome:// URLs', () => {
      expect(isSpecialPage('chrome://settings')).toBe(true);
    });

    it('should return true for chrome-extension:// URLs', () => {
      expect(isSpecialPage('chrome-extension://abc123/popup.html')).toBe(true);
    });

    it('should return true for about: URLs', () => {
      expect(isSpecialPage('about:blank')).toBe(true);
    });

    it('should return true for moz-extension:// URLs', () => {
      expect(isSpecialPage('moz-extension://abc123/popup.html')).toBe(true);
    });

    it('should return false for regular https URLs', () => {
      expect(isSpecialPage('https://example.com')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(isSpecialPage('not-a-url')).toBe(false);
    });
  });
});
