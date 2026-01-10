import { useEffect, useRef } from 'react';
import Browser from 'webextension-polyfill';

import { createContextLogger } from '@src/lib/logger';
import { isDevMode } from '@src/lib/utils';
import { useConfigStore, useDomainStore } from '@src/stores';

import {
  OptionsHeader,
  AppearanceSection,
  EventCaptureSection,
  DevDomainSection,
  ResetButton,
} from './components';

const log = createContextLogger('ui');

export default function Options() {
  // Track the last local update timestamp to skip rehydration from our own changes
  const lastLocalUpdateRef = useRef<number>(0);

  // Listen for storage changes to sync config updates from other extension contexts
  useEffect(() => {
    const handleStorageChange = (
      changes: Browser.Storage.StorageAreaOnChangedChangesType,
      areaName: string
    ) => {
      // Only listen to local storage changes
      if (areaName !== 'local') return;

      // Check if the config storage key changed
      const configKey = 'analytics-xray-config';
      const change = changes[configKey];
      if (change) {
        // Skip if this change happened very recently (within 500ms of our local update)
        // This prevents rehydration from our own changes
        const now = Date.now();
        if (now - lastLocalUpdateRef.current < 500) {
          log.debug(
            'Skipping storage change rehydration (recent local update)'
          );
          return;
        }

        // Use the newValue from the change event to avoid timing issues
        const storedValue = change.newValue;
        if (storedValue && typeof storedValue === 'string') {
          try {
            const parsed = JSON.parse(storedValue);
            const { state: newState } = parsed;
            if (newState) {
              // Update the store with the new state
              useConfigStore.setState(newState);
              log.debug('Config store rehydrated from storage');
            }
          } catch (error) {
            log.error('Failed to parse config from storage:', error);
          }
        }
      }
    };

    Browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      Browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Wrapper to mark local updates before clearing domains
  const handleClearDomains = () => {
    // Mark the timestamp of our local update BEFORE clearing
    // This ensures the flag is set before Zustand persist writes to storage
    const timestamp = Date.now();
    lastLocalUpdateRef.current = timestamp;

    // Clear the domains synchronously (using domainStore)
    useDomainStore.getState().clearAllAllowedDomains();

    // Also set a timeout to reset the flag after the storage write completes
    // This ensures we don't block legitimate updates from other contexts
    setTimeout(() => {
      // Only reset if no new local update happened
      if (lastLocalUpdateRef.current === timestamp) {
        lastLocalUpdateRef.current = 0;
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <OptionsHeader />
        <AppearanceSection />
        <EventCaptureSection />
        {isDevMode() && (
          <DevDomainSection onClearDomains={handleClearDomains} />
        )}
        <ResetButton />
      </div>
    </div>
  );
}
