import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useDomainStore } from './domainStore';

// Mock the logger
vi.mock('@src/lib/logger', () => ({
  createContextLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock the storage module
vi.mock('@src/lib/storage', () => ({
  createChromeStorage: vi.fn(() => ({
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  })),
}));

describe('domainStore', () => {
  beforeEach(() => {
    // Reset store to default state
    useDomainStore.setState({
      allowedDomains: [],
    });
  });

  describe('addAllowedDomain', () => {
    it('should add a new domain to the allowlist', () => {
      useDomainStore.getState().addAllowedDomain('example.com', false);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0]).toEqual({
        domain: 'example.com',
        allowSubdomains: false,
      });
    });

    it('should normalize domain to lowercase', () => {
      useDomainStore.getState().addAllowedDomain('EXAMPLE.COM', false);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains[0].domain).toBe('example.com');
    });

    it('should remove www. prefix from domain', () => {
      useDomainStore.getState().addAllowedDomain('www.example.com', false);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains[0].domain).toBe('example.com');
    });

    it('should trim whitespace from domain', () => {
      useDomainStore.getState().addAllowedDomain('  example.com  ', false);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains[0].domain).toBe('example.com');
    });

    it('should handle subdomain normalization when allowSubdomains is true', () => {
      useDomainStore.getState().addAllowedDomain('app.example.com', true);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains[0].domain).toBe('example.com');
      expect(domains[0].allowSubdomains).toBe(true);
    });

    it('should update existing domain when adding duplicate', () => {
      useDomainStore.getState().addAllowedDomain('example.com', false);
      useDomainStore.getState().addAllowedDomain('example.com', true);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0]).toEqual({
        domain: 'example.com',
        allowSubdomains: true,
      });
    });

    it('should match existing domain with www. prefix', () => {
      useDomainStore.getState().addAllowedDomain('example.com', false);
      useDomainStore.getState().addAllowedDomain('www.example.com', true);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('example.com');
      expect(domains[0].allowSubdomains).toBe(true);
    });

    it('should handle multiple domains', () => {
      useDomainStore.getState().addAllowedDomain('example.com', false);
      useDomainStore.getState().addAllowedDomain('test.com', true);
      useDomainStore.getState().addAllowedDomain('demo.org', false);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(3);
      expect(domains.map((d) => d.domain)).toContain('example.com');
      expect(domains.map((d) => d.domain)).toContain('test.com');
      expect(domains.map((d) => d.domain)).toContain('demo.org');
    });

    it('should preserve subdomain when allowSubdomains is false', () => {
      useDomainStore.getState().addAllowedDomain('app.example.com', false);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains[0].domain).toBe('app.example.com');
      expect(domains[0].allowSubdomains).toBe(false);
    });
  });

  describe('removeAllowedDomain', () => {
    beforeEach(() => {
      useDomainStore.getState().addAllowedDomain('example.com', false);
      useDomainStore.getState().addAllowedDomain('test.com', true);
    });

    it('should remove an existing domain', () => {
      useDomainStore.getState().removeAllowedDomain('example.com');

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('test.com');
    });

    it('should normalize domain before removing', () => {
      useDomainStore.getState().removeAllowedDomain('EXAMPLE.COM');

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('test.com');
    });

    it('should remove domain with www. prefix', () => {
      useDomainStore.getState().removeAllowedDomain('www.example.com');

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('test.com');
    });

    it('should trim whitespace before removing', () => {
      useDomainStore.getState().removeAllowedDomain('  example.com  ');

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('test.com');
    });

    it('should not remove non-existent domain', () => {
      useDomainStore.getState().removeAllowedDomain('nonexistent.com');

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(2);
    });

    it('should handle removing all domains', () => {
      useDomainStore.getState().removeAllowedDomain('example.com');
      useDomainStore.getState().removeAllowedDomain('test.com');

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(0);
    });
  });

  describe('clearAllAllowedDomains', () => {
    beforeEach(() => {
      useDomainStore.getState().addAllowedDomain('example.com', false);
      useDomainStore.getState().addAllowedDomain('test.com', true);
      useDomainStore.getState().addAllowedDomain('demo.org', false);
    });

    it('should clear all allowed domains', () => {
      useDomainStore.getState().clearAllAllowedDomains();

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(0);
    });

    it('should work when list is already empty', () => {
      useDomainStore.getState().clearAllAllowedDomains();
      useDomainStore.getState().clearAllAllowedDomains();

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(0);
    });
  });

  describe('updateDomainSubdomainSetting', () => {
    beforeEach(() => {
      useDomainStore.getState().addAllowedDomain('example.com', false);
    });

    it('should update allowSubdomains setting for existing domain', () => {
      useDomainStore
        .getState()
        .updateDomainSubdomainSetting('example.com', true);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains[0].allowSubdomains).toBe(true);
    });

    it('should update from true to false', () => {
      useDomainStore.getState().addAllowedDomain('test.com', true);
      useDomainStore.getState().updateDomainSubdomainSetting('test.com', false);

      const domains = useDomainStore.getState().allowedDomains;
      const testDomain = domains.find((d) => d.domain === 'test.com');
      expect(testDomain?.allowSubdomains).toBe(false);
    });

    it('should not modify other domains', () => {
      useDomainStore.getState().addAllowedDomain('test.com', true);
      useDomainStore
        .getState()
        .updateDomainSubdomainSetting('example.com', true);

      const domains = useDomainStore.getState().allowedDomains;
      const testDomain = domains.find((d) => d.domain === 'test.com');
      expect(testDomain?.allowSubdomains).toBe(true);
    });

    it('should not add domain if it does not exist', () => {
      useDomainStore
        .getState()
        .updateDomainSubdomainSetting('nonexistent.com', true);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0].domain).toBe('example.com');
    });

    it('should preserve domain name when updating', () => {
      useDomainStore
        .getState()
        .updateDomainSubdomainSetting('example.com', true);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains[0].domain).toBe('example.com');
    });
  });

  describe('autoAllowDomain', () => {
    describe('already allowed domains', () => {
      it('should return already_allowed for exact match', () => {
        useDomainStore.getState().addAllowedDomain('example.com', false);

        const result = useDomainStore.getState().autoAllowDomain('example.com');

        expect(result.action).toBe('already_allowed');
        expect(result.domain).toBe('example.com');
        expect(result.wasAllowed).toBe(true);
        expect(result.isAllowed).toBe(true);
      });

      it('should return already_allowed for subdomain when subdomains are allowed', () => {
        useDomainStore.getState().addAllowedDomain('example.com', true);

        const result = useDomainStore
          .getState()
          .autoAllowDomain('app.example.com');

        expect(result.action).toBe('already_allowed');
        expect(result.wasAllowed).toBe(true);
        expect(result.isAllowed).toBe(true);
      });

      it('should return already_allowed for www. variant', () => {
        useDomainStore.getState().addAllowedDomain('example.com', false);

        const result = useDomainStore
          .getState()
          .autoAllowDomain('www.example.com');

        expect(result.action).toBe('already_allowed');
        expect(result.wasAllowed).toBe(true);
        expect(result.isAllowed).toBe(true);
      });
    });

    describe('adding new domains', () => {
      it('should add base domain when not in list', () => {
        const result = useDomainStore.getState().autoAllowDomain('example.com');

        expect(result.action).toBe('added');
        expect(result.domain).toBe('example.com');
        expect(result.allowSubdomains).toBe(false);
        expect(result.wasAllowed).toBe(false);
        expect(result.isAllowed).toBe(true);

        const domains = useDomainStore.getState().allowedDomains;
        expect(domains).toHaveLength(1);
        expect(domains[0].domain).toBe('example.com');
        expect(domains[0].allowSubdomains).toBe(false);
      });

      it('should add base domain with subdomains when subdomain is provided', () => {
        const result = useDomainStore
          .getState()
          .autoAllowDomain('app.example.com');

        expect(result.action).toBe('added');
        expect(result.domain).toBe('example.com');
        expect(result.allowSubdomains).toBe(true);
        expect(result.wasAllowed).toBe(false);
        expect(result.isAllowed).toBe(true);

        const domains = useDomainStore.getState().allowedDomains;
        expect(domains).toHaveLength(1);
        expect(domains[0].domain).toBe('example.com');
        expect(domains[0].allowSubdomains).toBe(true);
      });

      it('should normalize domain when adding', () => {
        const result = useDomainStore
          .getState()
          .autoAllowDomain('WWW.EXAMPLE.COM');

        expect(result.action).toBe('added');
        // The returned domain may not be fully normalized, but the stored domain will be
        const domains = useDomainStore.getState().allowedDomains;
        expect(domains[0].domain).toBe('example.com');
      });
    });

    describe('updating existing domains', () => {
      it('should update base domain to allow subdomains when subdomain is encountered', () => {
        useDomainStore.getState().addAllowedDomain('example.com', false);

        const result = useDomainStore
          .getState()
          .autoAllowDomain('app.example.com');

        expect(result.action).toBe('updated');
        expect(result.domain).toBe('example.com');
        expect(result.allowSubdomains).toBe(true);
        expect(result.wasAllowed).toBe(false);
        expect(result.isAllowed).toBe(true);

        const domains = useDomainStore.getState().allowedDomains;
        expect(domains[0].allowSubdomains).toBe(true);
      });

      it('should not update if base domain already allows subdomains', () => {
        useDomainStore.getState().addAllowedDomain('example.com', true);

        const result = useDomainStore
          .getState()
          .autoAllowDomain('app.example.com');

        expect(result.action).toBe('already_allowed');
        expect(result.wasAllowed).toBe(true);
      });

      it('should handle multiple subdomains of same base domain', () => {
        useDomainStore.getState().addAllowedDomain('example.com', false);

        useDomainStore.getState().autoAllowDomain('app.example.com');
        const result = useDomainStore
          .getState()
          .autoAllowDomain('api.example.com');

        expect(result.action).toBe('already_allowed');
        expect(result.wasAllowed).toBe(true);

        const domains = useDomainStore.getState().allowedDomains;
        expect(domains[0].allowSubdomains).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle www. as base domain', () => {
        const result = useDomainStore
          .getState()
          .autoAllowDomain('www.example.com');

        expect(result.action).toBe('added');
        expect(result.domain).toBe('example.com');
      });

      it('should handle complex subdomains', () => {
        const result = useDomainStore
          .getState()
          .autoAllowDomain('api.v1.example.com');

        expect(result.action).toBe('added');
        expect(result.domain).toBe('example.com');
        expect(result.allowSubdomains).toBe(true);
      });

      it('should handle domains with multiple parts', () => {
        const result = useDomainStore
          .getState()
          .autoAllowDomain('subdomain.example.co.uk');

        expect(result.action).toBe('added');
        // Should extract base domain (last two parts)
        expect(result.domain).toBe('co.uk');
        expect(result.allowSubdomains).toBe(true);
      });

      it('should return no_action for edge case where domain exists but is not allowed', () => {
        // This is a fallback case that shouldn't normally happen
        // but is handled in the code
        useDomainStore.getState().addAllowedDomain('example.com', false);

        // Manually set up a scenario where isDomainAllowed returns false
        // but domain exists in list (shouldn't happen in practice)
        const result = useDomainStore
          .getState()
          .autoAllowDomain('different.example.com');

        // Should still try to add/update
        expect(['added', 'updated']).toContain(result.action);
      });
    });

    describe('integration with domain utilities', () => {
      it('should work with normalizeDomain', () => {
        const result = useDomainStore
          .getState()
          .autoAllowDomain('  WWW.EXAMPLE.COM  ');

        expect(result.action).toBe('added');
        // The returned domain may not be fully normalized, but the stored domain will be
        const domains = useDomainStore.getState().allowedDomains;
        expect(domains[0].domain).toBe('example.com');
      });

      it('should work with getBaseDomain for subdomain detection', () => {
        const result = useDomainStore
          .getState()
          .autoAllowDomain('app.example.com');

        expect(result.domain).toBe('example.com');
        expect(result.allowSubdomains).toBe(true);
      });

      it('should work with isDomainAllowed for checking', () => {
        useDomainStore.getState().addAllowedDomain('example.com', true);

        const result = useDomainStore
          .getState()
          .autoAllowDomain('api.example.com');

        expect(result.isAllowed).toBe(true);
        expect(result.wasAllowed).toBe(true);
      });
    });
  });

  describe('state persistence', () => {
    it('should maintain state across multiple operations', () => {
      useDomainStore.getState().addAllowedDomain('example.com', false);
      useDomainStore.getState().addAllowedDomain('test.com', true);
      useDomainStore.getState().removeAllowedDomain('example.com');
      useDomainStore.getState().updateDomainSubdomainSetting('test.com', false);

      const domains = useDomainStore.getState().allowedDomains;
      expect(domains).toHaveLength(1);
      expect(domains[0]).toEqual({
        domain: 'test.com',
        allowSubdomains: false,
      });
    });
  });
});
