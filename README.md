<div align="center">
<img src="public/icons/icon128.png" alt="logo" width="128" height="128"/>
<h1>Analytics X-Ray</h1>
<h3>Inspect and verify analytics events in real-time</h3>
<h5>Focused on Segment and other services that follow the Segment structure.</h5>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)

</div>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
  - [Prerequisites](#prerequisites)
  - [Development](#development)
  - [Loading the Extension](#loading-the-extension)
  - [Reloading the Extension](#reloading-the-extension)
- [Technical Stack](#technical-stack)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [License](#license)

## Overview <a name="overview"></a>

**Analytics X-Ray** is a browser extension that intercepts and displays Segment analytics events being fired on web pages. It helps Developer, Data, and QA teams:

- **View** Segment events in real-time as they're fired
- **Inspect** event payloads, properties, and metadata
- **Verify** correct event implementation and data quality
- **Debug** analytics tracking issues

The extension captures events at the network level using Chrome's `webRequest` API, intercepting the fully-enriched payloads that Segment actually sends, including all attributes added by the Segment SDK.

Open to adding support for other Analytics services.

## Features <a name="features"></a>

- Real-time event interception and display
- Network-level capture (intercepts Segment API calls)
- Event filtering and search
- Detailed event inspection with collapsible sections
- Support for all Segment event types: `track`, `page`, `screen`, `identify`, `group`, `alias`
- Cross-browser support (Chrome and Firefox)
- DevTools panel integration

## Installation <a name="installation"></a>

### Chrome Web Store

1. Visit the [Chrome Web Store listing](#) (link coming soon)
2. Click **"Add to Chrome"**
3. Confirm the installation
4. Open Chrome DevTools (F12 or Cmd+Option+I) and look for the "Analytics X-Ray" tab

#### Firefox Add-ons

Firefox installation instructions will be available once the extension is published to the Firefox Add-ons store.

## Contributing <a name="contributing"></a>

Contributions are welcome! We appreciate your help in making Analytics X-Ray better.

### Prerequisites <a name="prerequisites"></a>

If you want to build the extension from source or contribute to the project, you'll need:

- **Node.js** 18.x or higher
- **Yarn** (recommended) or **npm**
- **Chrome** or **Firefox** browser for testing

### Development <a name="development"></a>

This project supports building for both Chrome and Firefox. Running `dev` or `build` commands without specifying the browser target will build for Chrome by default.

1. Fork the repository and clone it.

2. Install dependencies:
   ```bash
   yarn install
   ```
3. Start development with hot reload:
   ```bash
   yarn dev          # Chrome (default)
   yarn dev:chrome   # Chrome explicitly
   yarn dev:firefox  # Firefox
   ```

Running a `dev` command will build your extension and watch for changes in the source files. Changing the source files will automatically refresh the corresponding `dist_<chrome|firefox>` folder.

To create an optimized production build:

```bash
yarn build          # Chrome (default)
yarn build:chrome   # Chrome explicitly
yarn build:firefox  # Firefox
```

### Loading the Extension <a name="loading-the-extension"></a>

#### Chrome

1. Open Chrome browser
2. Navigate to [chrome://extensions](chrome://extensions)
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `dist_chrome` folder in this project

#### Firefox

1. Open Firefox browser
2. Navigate to [about:debugging#/runtime/this-firefox](about:debugging#/runtime/this-firefox)
3. Click **Load temporary Add-on**
4. Select any file in the `dist_firefox` folder (e.g., `manifest.json`)

### Reloading The extension

#### Dev build

Eventhough the files are watched for changes and the dist folders auto re-generate. You will still need to reload the extension from the extension Popup and close and re-open the panel for the changes to take effect.

#### Prod Build

If you build in prod mode the Reload button is not available in the popup and you need to reload it from the Extensions Manager.

## Usage <a name="usage"></a>

1. **Open DevTools**: After loading the extension, open Chrome DevTools (F12 or Cmd+Option+I)
2. **Find the Panel**: Look for the "Analytics X-Ray" tab in DevTools
3. **Navigate to a Site**: Visit any website that uses Segment analytics (e.g., segment.com)
4. **View Events**: Events will appear in real-time as they're captured from the page

The extension intercepts Segment API calls to:

- [Segment](https://segment.com/)
- [Rudderstack](https://www.rudderstack.com/)
- [Dreamdata](https://dreamdata.io/) (Untested)
- [Attribution](https://www.attributionapp.com/)

## Technical Stack <a name="technical-stack"></a>

| Technology            | Version | Purpose                     |
| --------------------- | ------- | --------------------------- |
| React                 | 19.x    | UI Components               |
| TypeScript            | 5.x     | Type-safe development       |
| Vite                  | 6.x     | Build tool                  |
| Tailwind CSS          | 4.x     | Styling                     |
| shadcn/ui             | latest  | UI component library        |
| Zustand               | latest  | State management            |
| webextension-polyfill | 0.12.x  | Cross-browser compatibility |
| Chrome Extension      | MV3     | Extension manifest          |

## Troubleshooting <a name="troubleshooting"></a>

### Extension not loading

- Ensure you're loading from the correct `dist_chrome` or `dist_firefox` folder
- Check that Developer mode is enabled in Chrome
- Try reloading the extension after making changes

### Events not appearing

- Verify the website is using Segment analytics
- Check that the extension has the necessary permissions
- Open DevTools console to check for errors
- Ensure you're on a page that actually fires Segment events

### Build errors

- Ensure you're using Node.js 18.x or higher
- Clear `node_modules` and reinstall: `rm -rf node_modules && yarn install`
- Check that all dependencies are installed: `yarn install`

### Type errors

- Run `yarn type-check` to see detailed TypeScript errors
- Ensure your IDE is using the workspace TypeScript version

## License <a name="license"></a>

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Resources

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)
- [Vite Web Extension Template](https://github.com/JohnBra/vite-web-extension)
