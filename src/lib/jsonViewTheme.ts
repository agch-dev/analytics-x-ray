/**
 * Theme for @uiw/react-json-view that matches the project's theme setting
 * Uses built-in themes from the library based on config store
 */

import { useConfigStore } from '@src/stores';
import { vscodeTheme } from '@uiw/react-json-view/vscode';
import { lightTheme } from '@uiw/react-json-view/light';

/**
 * Check if dark mode is currently active based on config store
 * Handles 'auto', 'light', and 'dark' theme settings
 */
export function isDarkMode(): boolean {
  const theme = useConfigStore.getState().theme;
  
  if (theme === 'dark') {
    return true;
  }
  
  if (theme === 'light') {
    return false;
  }
  
  // theme === 'auto' - use system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  
  // Fallback: check if dark class is applied
  return document.documentElement.classList.contains('dark');
}

/**
 * Color values from vscodeTheme (dark mode)
 */
const VSCODE_COLORS = {
  string: '#ce9178',
  number: '#b5cea8',
  boolean: '#569cd6',
  null: '#569cd6',
  undefined: '#569cd6',
} as const;

/**
 * Color values from lightTheme (light mode)
 */
const LIGHT_COLORS = {
  string: '#cb4b16',
  number: '#268bd2', // int color (float uses #859900 but we'll use int for consistency)
  boolean: '#2aa198',
  null: '#d33682',
  undefined: '#586e75',
} as const;

/**
 * Get the color for a specific value type based on the current theme
 */
export function getValueTypeColor(value: unknown): string {
  const dark = isDarkMode();
  const colors = dark ? VSCODE_COLORS : LIGHT_COLORS;
  
  if (value === null) return colors.null;
  if (value === undefined) return colors.undefined;
  if (typeof value === 'boolean') return colors.boolean;
  if (typeof value === 'number') return colors.number;
  if (typeof value === 'string') return colors.string;
  
  // Default to muted foreground for objects/arrays
  return '';
}

/**
 * Get JSON view theme that matches the project's theme setting
 * Returns a theme object from @uiw/react-json-view
 */
export function getJsonViewTheme() {
  const dark = isDarkMode();
  
  // Use vscode theme for dark mode (good contrast and readability)
  // Use github light theme for light mode (clean and modern)
  const baseTheme = dark ? vscodeTheme : lightTheme;
  
  // Override background to be transparent to match the UI
  return {
    ...baseTheme,
    '--w-rjv-background-color': 'transparent',
    // Ensure font family matches project
    '--w-rjv-font-family': getComputedStyle(document.documentElement)
      .getPropertyValue('--font-mono')
      .trim() || 'JetBrains Mono, monospace',
  };
}

