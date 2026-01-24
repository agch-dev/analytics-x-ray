import { resolve } from 'path';

import { crx, ManifestV3Export } from '@crxjs/vite-plugin';
import { mergeConfig, defineConfig } from 'vite';

import baseConfig, { baseManifest, baseBuildOptions } from './vite.config.base';

const outDir = resolve(__dirname, 'dist_chrome');

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [
      crx({
        manifest: {
          ...baseManifest,
          background: {
            service_worker: 'src/pages/background/index.ts',
            type: 'module',
          },
        } as ManifestV3Export,
        browser: 'chrome',
      }),
    ],
    build: {
      ...baseBuildOptions,
      outDir,
      rollupOptions: {
        input: {
          panel: resolve(__dirname, 'src/pages/panel/index.html'),
        },
      },
    },
  })
);
