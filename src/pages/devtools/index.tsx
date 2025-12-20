import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Browser from 'webextension-polyfill';
import Panel from '@src/pages/devtools/Panel';
import { useTheme } from '@src/hooks/useTheme';
import { useConfigStore } from '@src/stores/configStore';
import { createContextLogger } from '@src/lib/logger';
import '@assets/styles/tailwind.css';

const log = createContextLogger('devtools');

function PanelWrapper() {
  useTheme();
  
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
  
  return <Panel />;
}

log.info('🔧 DevTools script loading...');
log.info(`Inspected tab ID: ${Browser.devtools.inspectedWindow.tabId}`);

// Create the devtools panel
Browser.devtools.panels
  .create('Analytics X-Ray', 'icons/icon32.png', 'src/pages/devtools/index.html')
  .then(() => {
    log.info('✅ DevTools panel created successfully');
    // Initialize React app when panel is created
    const rootContainer = document.querySelector('#__root');
    if (!rootContainer) throw new Error("Can't find Panel root element");
    const root = createRoot(rootContainer);
    root.render(<PanelWrapper />);
    log.info('✅ React app rendered');
  })
  .catch((error) => {
    log.error('❌ Failed to create DevTools panel:', error);
    console.error(error);
  });

