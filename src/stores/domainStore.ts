/**
 * Domain Store
 *
 * Manages domain allowlist configuration.
 * Persisted to Chrome storage.local for persistence across sessions.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { normalizeDomain, getBaseDomain, isDomainAllowed } from '@src/lib';
import { createChromeStorage } from '@src/lib/storage';

export interface AllowedDomain {
  domain: string; // e.g., "example.com"
  allowSubdomains: boolean;
}

interface AutoAllowResult {
  action: 'added' | 'updated' | 'already_allowed' | 'no_action';
  domain: string;
  allowSubdomains: boolean;
  wasAllowed: boolean;
  isAllowed: boolean;
}

interface DomainStore {
  // State
  allowedDomains: AllowedDomain[];

  // Actions
  addAllowedDomain: (domain: string, allowSubdomains: boolean) => void;
  removeAllowedDomain: (domain: string) => void;
  clearAllAllowedDomains: () => void;
  updateDomainSubdomainSetting: (
    domain: string,
    allowSubdomains: boolean
  ) => void;
  autoAllowDomain: (domain: string) => AutoAllowResult;
}

const defaultDomainState = {
  allowedDomains: [] as AllowedDomain[],
};

export const useDomainStore = create<DomainStore>()(
  persist(
    (set, get) => ({
      ...defaultDomainState,

      // Domain allowlist actions
      addAllowedDomain: (domain, allowSubdomains) => {
        set((state) => {
          // Normalize domain
          let normalizedDomain = domain.toLowerCase().trim();

          // Remove www. prefix if present
          if (normalizedDomain.startsWith('www.')) {
            normalizedDomain = normalizedDomain.slice(4);
          }

          // If allowing subdomains, get base domain (strip subdomains)
          if (allowSubdomains && normalizedDomain.split('.').length > 2) {
            const parts = normalizedDomain.split('.');
            normalizedDomain = parts.slice(-2).join('.');
          }

          // Check if domain already exists in allowed list (compare normalized)
          const existingIndex = state.allowedDomains.findIndex((d) => {
            const existingNormalized = d.domain.toLowerCase().startsWith('www.')
              ? d.domain.toLowerCase().slice(4)
              : d.domain.toLowerCase();
            return (
              existingNormalized === normalizedDomain ||
              d.domain === normalizedDomain
            );
          });

          if (existingIndex >= 0) {
            // Update existing entry
            const updated = [...state.allowedDomains];
            updated[existingIndex] = {
              domain: normalizedDomain,
              allowSubdomains,
            };
            return {
              allowedDomains: updated,
            };
          }
          // Add new domain
          return {
            allowedDomains: [
              ...state.allowedDomains,
              { domain: normalizedDomain, allowSubdomains },
            ],
          };
        });
      },

      removeAllowedDomain: (domain) => {
        set((state) => {
          // Normalize the domain to match how it's stored
          let normalizedDomain = domain.toLowerCase().trim();
          if (normalizedDomain.startsWith('www.')) {
            normalizedDomain = normalizedDomain.slice(4);
          }

          // Filter out matching domain (compare both original and normalized)
          // Keep domains that don't match the original domain or normalized versions
          const filtered = state.allowedDomains.filter((d) => {
            // Exact match check
            if (d.domain === domain) {
              return false;
            }

            // Normalized match check
            const storedNormalized = d.domain.toLowerCase().trim();
            const storedWithoutWww = storedNormalized.startsWith('www.')
              ? storedNormalized.slice(4)
              : storedNormalized;

            // Remove if normalized versions match
            return (
              storedNormalized !== normalizedDomain &&
              storedWithoutWww !== normalizedDomain
            );
          });

          return { allowedDomains: filtered };
        });
      },

      clearAllAllowedDomains: () => {
        set({ allowedDomains: [] });
      },

      updateDomainSubdomainSetting: (domain, allowSubdomains) => {
        set((state) => {
          const existingIndex = state.allowedDomains.findIndex(
            (d) => d.domain === domain
          );
          if (existingIndex >= 0) {
            const updated = [...state.allowedDomains];
            updated[existingIndex] = {
              ...updated[existingIndex],
              allowSubdomains,
            };
            return { allowedDomains: updated };
          }
          return state;
        });
      },

      /**
       * Auto-allow a domain: automatically add it to the allowlist if not already there.
       * Handles subdomain detection and updates existing entries to allow subdomains when needed.
       *
       * @param domain - The domain to auto-allow
       * @returns Result object with action taken and domain information
       */
      autoAllowDomain: (domain) => {
        const state = get();
        const normalizedDomain = normalizeDomain(domain);
        const wasAllowed = isDomainAllowed(domain, state.allowedDomains);

        // If already allowed, return early
        if (wasAllowed) {
          return {
            action: 'already_allowed',
            domain: normalizedDomain,
            allowSubdomains: false,
            wasAllowed: true,
            isAllowed: true,
          };
        }

        // Determine if this is a subdomain
        const baseDomain = getBaseDomain(normalizedDomain);
        const isSubdomain = normalizedDomain !== baseDomain;

        // Check if domain or base domain is already in the allowed list
        const existingEntry = state.allowedDomains.find((d) => {
          const existingNormalized = normalizeDomain(d.domain);
          if (d.allowSubdomains) {
            // If existing entry allows subdomains, check if current domain matches
            return getBaseDomain(existingNormalized) === baseDomain;
          }
          // Check for exact match or base domain match
          return (
            existingNormalized === normalizedDomain ||
            (isSubdomain && existingNormalized === baseDomain)
          );
        });

        if (!existingEntry) {
          // Domain is not in the list at all, add it
          const domainToAdd = isSubdomain ? baseDomain : normalizedDomain;
          const allowSubdomains = isSubdomain;

          // Use the existing addAllowedDomain action
          get().addAllowedDomain(domainToAdd, allowSubdomains);

          // Get updated state to check if it's now allowed
          const updatedState = get();
          const isAllowed = isDomainAllowed(
            domain,
            updatedState.allowedDomains
          );

          return {
            action: 'added',
            domain: domainToAdd,
            allowSubdomains,
            wasAllowed: false,
            isAllowed,
          };
        } else if (
          isSubdomain &&
          existingEntry.domain === baseDomain &&
          !existingEntry.allowSubdomains
        ) {
          // Special case: base domain exists but subdomains are not allowed
          // Update it to allow subdomains
          get().addAllowedDomain(baseDomain, true); // This will update the existing entry

          // Get updated state to check if it's now allowed
          const updatedState = get();
          const isAllowed = isDomainAllowed(
            domain,
            updatedState.allowedDomains
          );

          return {
            action: 'updated',
            domain: baseDomain,
            allowSubdomains: true,
            wasAllowed: false,
            isAllowed,
          };
        } else {
          // Domain is already in the list and properly configured
          // This shouldn't happen if wasAllowed check worked, but handle it anyway
          return {
            action: 'no_action',
            domain: normalizedDomain,
            allowSubdomains: existingEntry.allowSubdomains,
            wasAllowed: false,
            isAllowed: false,
          };
        }
      },
    }),
    {
      name: 'analytics-xray-domain',
      storage: createJSONStorage(() => createChromeStorage()),
      version: 1,
    }
  )
);

// Selectors for optimized re-renders
export const selectAllowedDomains = (state: DomainStore) =>
  state.allowedDomains;
