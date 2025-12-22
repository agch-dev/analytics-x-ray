<div align="center">
<img src="public/icons/icon128.png" alt="logo" width="128" height="128"/>
<h1>Analytics X-Ray</h1>
<h3>Inspect and verify Segment analytics events in real-time</h3>

<h5>
A Chrome/Firefox browser extension that provides developers and QA teams with real-time visibility into Segment analytics tracking implementation.
</h5>

</div>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Development](#development)
  - [Loading the Extension](#loading-the-extension)
- [Building with GitHub Actions](#building-with-github-actions)
- [Usage](#usage)
- [Technical Stack](#technical-stack)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Overview <a name="overview"></a>

**Analytics X-Ray** is a browser extension that intercepts and displays Segment analytics events being fired on web pages. It helps developers and QA teams:

- **View** Segment events in real-time as they're fired
- **Inspect** event payloads, properties, and metadata
- **Verify** correct event implementation and data quality
- **Debug** analytics tracking issues

The extension captures events at the network level using Chrome's `webRequest` API, intercepting the fully-enriched payloads that Segment actually sends, including all attributes added by the Segment SDK.

## Features <a name="features"></a>

- Real-time event interception and display
- Network-level capture (intercepts Segment API calls)
- Event filtering and search
- Detailed event inspection with collapsible sections
- Support for all Segment event types: `track`, `page`, `screen`, `identify`, `group`, `alias`
- Cross-browser support (Chrome and Firefox)
- DevTools panel integration

## Getting Started <a name="getting-started"></a>

### Development <a name="development"></a>

This project supports building for both Chrome and Firefox. Running `dev` or `build` commands without specifying the browser target will build for Chrome by default.

1. Clone this repository
2. Install dependencies:
   ```bash
   yarn install
   # or
   npm install
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

## Building with GitHub Actions <a name="building-with-github-actions"></a>

This repository includes GitHub Actions workflows to automatically build and package the extension for both Chrome and Firefox.

### Using the Workflow

1. Go to the **"Actions"** tab in your repository
2. In the left sidebar, select **"Build Extension"** (or the appropriate workflow name)
3. Click **"Run workflow"** and select:
   - The branch to build from (typically `main` or `master`)
   - The target browser (`chrome`, `firefox`, or `both`)
4. Click **"Run workflow"** to start the build

### Build Artifacts

After the workflow completes:

1. Refresh the Actions page and click on the most recent workflow run
2. Scroll down to the **"Artifacts"** section
3. Download the build artifact:
   - `analytics-x-ray-chrome.zip` - Chrome extension package
   - `analytics-x-ray-firefox.zip` - Firefox extension package

### Publishing

The build artifacts (`analytics-x-ray-chrome.zip` and `analytics-x-ray-firefox.zip`) are ready for submission to their respective stores:

- **Chrome Web Store**: Upload the `analytics-x-ray-chrome.zip` artifact to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- **Firefox Add-ons**: Upload the `analytics-x-ray-firefox.zip` artifact to the [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/)

## Usage <a name="usage"></a>

1. **Open DevTools**: After loading the extension, open Chrome DevTools (F12 or Cmd+Option+I)
2. **Find the Panel**: Look for the "Analytics X-Ray" tab in DevTools
3. **Navigate to a Site**: Visit any website that uses Segment analytics (e.g., segment.com)
4. **View Events**: Events will appear in real-time as they're captured from the page

The extension intercepts Segment API calls to:
- `api.segment.io`
- `api.segment.com`
- Rudderstack endpoints
- Other compatible analytics providers

## Technical Stack <a name="technical-stack"></a>

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Components |
| TypeScript | 5.x | Type-safe development |
| Vite | 6.x | Build tool |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | latest | UI component library |
| Zustand | latest | State management |
| webextension-polyfill | 0.12.x | Cross-browser compatibility |
| Chrome Extension | MV3 | Extension manifest |

## Project Structure <a name="project-structure"></a>

```
analytics-x-ray/
├── public/                    # Static assets (icons, CSS)
├── src/
│   ├── assets/
│   │   ├── images/           # Images and SVGs
│   │   └── styles/            # Global styles, Tailwind config
│   ├── components/           # Reusable React components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utility functions and helpers
│   ├── locales/              # i18n translation files
│   ├── pages/                # Extension pages
│   │   ├── background/       # Service worker (background script)
│   │   ├── content/          # Content script (injected into pages)
│   │   ├── devtools/         # DevTools panel UI
│   │   ├── options/          # Extension options page
│   │   └── popup/            # Extension popup UI
│   ├── stores/               # Zustand state stores
│   └── types/                # TypeScript type definitions
├── manifest.json             # Production manifest
├── manifest.dev.json         # Development manifest overrides
├── vite.config.base.ts       # Shared Vite configuration
├── vite.config.chrome.ts     # Chrome-specific build config
└── vite.config.firefox.ts    # Firefox-specific build config
```

### Path Aliases

The project uses path aliases for clean imports:

- `@src/*` → `src/*`
- `@assets/*` → `src/assets/*`
- `@locales/*` → `src/locales/*`
- `@pages/*` → `src/pages/*`

## Contributing <a name="contributing"></a>

Contributions are welcome! Please feel free to open a pull request or raise an issue.

### Development Guidelines

- Use TypeScript strict mode
- Follow React hooks rules
- Use webextension-polyfill for cross-browser support
- Keep content scripts minimal
- Handle extension context invalidation
- Use dark theme for DevTools integration
- Throttle high-frequency updates
- Clean up listeners in useEffect

## Resources

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill)
