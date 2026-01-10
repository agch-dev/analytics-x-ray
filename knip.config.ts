import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: [
    // Extension entry points
    'src/pages/popup/index.tsx',
    'src/pages/options/index.tsx',
    'src/pages/devtools/index.tsx',
    'src/pages/background/index.ts',
    // Vite config files
    'vite.config.base.ts',
    'vite.config.chrome.ts',
    'vite.config.firefox.ts',
    'vitest.config.ts',
    // Custom plugins
    'custom-vite-plugins.ts',
  ],
  project: ['src/**/*.{ts,tsx}', '*.{ts,tsx}'],
  ignore: [
    // Build outputs
    'dist_chrome/**',
    'dist_firefox/**',
    // Coverage reports
    'coverage/**',
    // Dependencies
    'node_modules/**',
    // Public assets (icons, etc.)
    'public/**',
    // Config files that are imported but not analyzed
    'manifest.json',
    'manifest.dev.json',
  ],
  ignoreDependencies: [
    // Build tools that are used but not imported
    'vite',
    '@crxjs/vite-plugin',
    '@vitejs/plugin-react',
    'vite-tsconfig-paths',
    '@tailwindcss/vite',
    'nodemon',
    'ts-node',
    // Testing tools
    'vitest',
    '@vitest/coverage-v8',
    '@vitest/ui',
    'jsdom',
    '@testing-library/react',
    '@testing-library/jest-dom',
    '@testing-library/user-event',
    '@testing-library/dom',
    // ESLint plugins (configured but not imported)
    'eslint',
    '@eslint/js',
    '@typescript-eslint/eslint-plugin',
    '@typescript-eslint/parser',
    'eslint-config-prettier',
    'eslint-plugin-import',
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react',
    'eslint-plugin-react-hooks',
    // Prettier (formatting tool, configured but not imported)
    'prettier',
  ],
  paths: {
    '@src/*': ['src/*'],
    '@assets/*': ['src/assets/*'],
    '@locales/*': ['src/locales/*'],
    '@pages/*': ['src/pages/*'],
    '@components/*': ['src/components/*'],
    '@lib/*': ['src/lib/*'],
    '@hooks/*': ['src/hooks/*'],
  },
  // TypeScript path mapping
  typescript: {
    configFile: 'tsconfig.json',
  },
  // Ignore files that are referenced in manifest but not directly imported
  ignoreBinaries: ['vite', 'vitest', 'nodemon', 'prettier'],
};

export default config;
