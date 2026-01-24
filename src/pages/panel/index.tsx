import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Browser from 'webextension-polyfill';

import { ErrorBoundary, PanelErrorState } from '@src/components';
import { useTheme } from '@src/hooks';
import { createContextLogger } from '@src/lib';
import { useConfigStore, useDomainStore } from '@src/stores';
import '@assets/styles/tailwind.css';

import Panel from './Panel';

const log = createContextLogger('panel');

function PanelWrapper() {
  useTheme();

  // Listen for storage changes to sync config and domain updates from other extension contexts
  useEffect(() => {
    const handleStorageChange = (
      changes: Browser.Storage.StorageAreaOnChangedChangesType,
      areaName: string
    ) => {
      // Only listen to local storage changes
      if (areaName !== 'local') return;

      // Check if the config storage key changed
      const configKey = 'analytics-xray-config';
      if (changes[configKey]) {
        log.debug('Config storage changed, rehydrating store...');

        // Read the new config from storage and update the store
        Browser.storage.local.get(configKey).then((result) => {
          const storedValue = result[configKey];
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
        });
      }

      // Check if the domain storage key changed
      const domainKey = 'analytics-xray-domain';
      if (changes[domainKey]) {
        log.debug('Domain storage changed, rehydrating store...');

        // Read the new domain config from storage and update the store
        Browser.storage.local.get(domainKey).then((result) => {
          const storedValue = result[domainKey];
          if (storedValue && typeof storedValue === 'string') {
            try {
              const parsed = JSON.parse(storedValue);
              const { state: newState } = parsed;
              if (newState) {
                // Update the store with the new state
                useDomainStore.setState(newState);
                log.debug('Domain store rehydrated from storage');
              }
            } catch (error) {
              log.error('Failed to parse domain storage:', error);
            }
          }
        });
      }
    };

    Browser.storage.onChanged.addListener(handleStorageChange);

    return () => {
      Browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <ErrorBoundary fallback={<PanelErrorState />}>
      <Panel />
    </ErrorBoundary>
  );
}

log.info('🎨 Panel script loading...');

// Initialize React app
const rootContainer = document.querySelector('#__root');
if (!rootContainer) {
  log.error("Can't find Panel root element");
  throw new Error("Can't find Panel root element");
}

const root = createRoot(rootContainer);
root.render(<PanelWrapper />);
log.info('✅ React app rendered');
