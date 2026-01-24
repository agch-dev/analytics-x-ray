import Browser from 'webextension-polyfill';

import { createContextLogger } from '@src/lib';

const log = createContextLogger('devtools');

log.info('🔧 DevTools script loading...');
log.info(`Inspected tab ID: ${Browser.devtools.inspectedWindow.tabId}`);

// Create the devtools panel pointing to the panel HTML page
// This approach avoids circular dependencies and browser compatibility issues
Browser.devtools.panels.create(
  'Analytics X-Ray',
  'icons/icon32.png',
  'src/pages/panel/index.html'
);

log.info('✅ DevTools panel creation initiated');
