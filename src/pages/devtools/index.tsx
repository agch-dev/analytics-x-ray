import { createRoot } from 'react-dom/client';
import Browser from 'webextension-polyfill';
import Panel from '@src/pages/devtools/Panel';
import '@assets/styles/tailwind.css';

// Create the devtools panel
Browser.devtools.panels
  .create('Analytics X-Ray', 'icon-32.png', 'src/pages/devtools/index.html')
  .then(() => {
    // Initialize React app when panel is created
    const rootContainer = document.querySelector('#__root');
    if (!rootContainer) throw new Error("Can't find Panel root element");
    const root = createRoot(rootContainer);
    root.render(<Panel />);
  })
  .catch(console.error);

