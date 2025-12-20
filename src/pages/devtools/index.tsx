import React from 'react';
import { createRoot } from 'react-dom/client';
import Browser from 'webextension-polyfill';
import Panel from '@src/pages/devtools/Panel';
import { useTheme } from '@src/hooks/useTheme';
import { createContextLogger } from '@src/lib/logger';
import '@assets/styles/tailwind.css';

const log = createContextLogger('devtools');

function PanelWrapper() {
  useTheme();
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

