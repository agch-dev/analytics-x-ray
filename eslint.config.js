import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import betterTailwindcss from 'eslint-plugin-better-tailwindcss';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Base JavaScript recommended rules
  js.configs.recommended,

  // Global ignores
  {
    ignores: ['dist*/**', 'node_modules/**', 'coverage/**'],
  },

  // Node.js config files (vite configs, etc.)
  {
    files: ['*.config.ts', '*.config.js', 'custom-vite-plugins.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },

  // Test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/test/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        chrome: 'readonly',
        global: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-var-requires': 'off',
      // Allow custom classes in test files for testing purposes
      'better-tailwindcss/no-unregistered-classes': 'off',
    },
  },

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        chrome: 'readonly',
        __DEV_MODE__: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        global: 'readonly',
        require: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      'better-tailwindcss': betterTailwindcss,
    },
    rules: {
      // TypeScript rules
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // React rules
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed in React 17+
      'react/prop-types': 'off', // Using TypeScript for prop validation
      'react/display-name': 'off',

      // React Hooks rules
      ...reactHooks.configs.recommended.rules,

      // Import ordering
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          pathGroups: [
            {
              pattern: '@src/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@assets/**',
              group: 'internal',
            },
            {
              pattern: '@pages/**',
              group: 'internal',
            },
            {
              pattern: '@components/**',
              group: 'internal',
            },
            {
              pattern: '@lib/**',
              group: 'internal',
            },
            {
              pattern: '@hooks/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      'import/no-unresolved': 'off', // TypeScript handles this
      'import/no-duplicates': 'error',

      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/role-supports-aria-props': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',

      // Tailwind CSS rules
      ...betterTailwindcss.configs.recommended.rules,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      'better-tailwindcss': {
        // Tailwind CSS 4: path to the entry file of the css based tailwind config
        entryPoint: 'src/assets/styles/tailwind.css',
      },
    },
  },

  // UI component files (shadcn/ui components use animation classes from tailwindcss-animate)
  {
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      // Disable unregistered classes check for UI components as they use shadcn/ui animation classes
      // that are valid but not recognized by the plugin
      'better-tailwindcss/no-unregistered-classes': 'off',
    },
  },

  // Prettier config (must be last to override other configs)
  prettier,
];
