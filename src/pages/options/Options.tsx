import { useEffect } from 'react';
import Browser from 'webextension-polyfill';
import { useConfigStore } from '@src/stores/configStore';
import { createContextLogger } from '@src/lib/logger';
import {
  OptionsHeader,
  AppearanceSection,
  EventCaptureSection,
  DomainTrackingSection,
  ResetButton,
} from './components';

const log = createContextLogger('ui');

export default function Options() {
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
    };
    
    Browser.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      Browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <OptionsHeader />
        <AppearanceSection />
        <EventCaptureSection />
        <DomainTrackingSection />
        <ResetButton />
      </div>
    </div>
  );
}
