import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if the application is running in development mode
 * @returns true if in development mode, false otherwise
 */
export function isDevMode(): boolean {
  // Vite replaces __DEV_MODE__ at build time via define in vite.config.base.ts
  return __DEV_MODE__;
}

/**
 * Copy text to clipboard using a fallback method that works in restricted contexts
 * like DevTools panels where the Clipboard API is blocked.
 * Uses the legacy document.execCommand('copy') approach with a temporary textarea.
 * @param text - The text to copy to clipboard
 * @returns true if copy was successful, false otherwise
 */
export function copyToClipboard(text: string): boolean {
  // Create a temporary textarea element
  const textarea = document.createElement('textarea');
  textarea.value = text;
  
  // Make it invisible and prevent scrolling
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';
  
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    console.error('Failed to copy text:', err);
  }
  
  document.body.removeChild(textarea);
  return success;
}

