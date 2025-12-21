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

/**
 * Normalize event name for filtering purposes
 * Page events with format "Page: {name}" are normalized to "Page"
 * Other event names remain unchanged
 * @param eventName - The event name to normalize
 * @param eventType - The event type (optional, used for page events)
 * @returns The normalized event name for filtering
 */
export function normalizeEventNameForFilter(
  eventName: string,
  eventType?: string
): string {
  // Normalize page events: "Page: {name}" -> "Page"
  // But keep "Page View" and "Page Viewed" as-is
  if (eventType === 'page' && eventName.startsWith('Page: ')) {
    return 'Page';
  }
  return eventName;
}

/**
 * Extract path from a full URL
 * @param url - The full URL string
 * @returns The path portion (including query string and hash if present)
 */
export function extractPathFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    // If URL parsing fails, try to extract path manually
    const match = url.match(/^https?:\/\/[^\/]+(\/.*)?$/);
    return match && match[1] ? match[1] : '/';
  }
}

/**
 * Extract domain from a full URL
 * @param url - The full URL string
 * @returns The domain (hostname) or null if parsing fails
 */
export function extractDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Get the path to display for an event
 * Prefers context.page.path, falls back to parsing context.page.url
 * @param event - The Segment event
 * @returns The path string to display, or empty string if unavailable
 */
export function getDisplayPath(event: { context?: { page?: { path?: string; url?: string } } }): string {
  if (event.context?.page?.path) {
    return event.context.page.path;
  }
  if (event.context?.page?.url) {
    return extractPathFromUrl(event.context.page.url);
  }
  return '';
}

/**
 * Get the domain from an event
 * @param event - The Segment event
 * @returns The domain string or null if unavailable
 */
export function getEventDomain(event: { context?: { page?: { url?: string } } }): string | null {
  if (event.context?.page?.url) {
    return extractDomainFromUrl(event.context.page.url);
  }
  return null;
}

/**
 * Check if paths are different between two events
 * @param event1 - First event
 * @param event2 - Second event
 * @returns true if paths are different
 */
export function pathsAreDifferent(
  event1: { context?: { page?: { path?: string; url?: string } } },
  event2: { context?: { page?: { path?: string; url?: string } } }
): boolean {
  const path1 = getDisplayPath(event1);
  const path2 = getDisplayPath(event2);
  return path1 !== path2;
}

/**
 * Check if domains are different between two events
 * @param event1 - First event
 * @param event2 - Second event
 * @returns true if domains are different
 */
export function domainsAreDifferent(
  event1: { context?: { page?: { url?: string } } },
  event2: { context?: { page?: { url?: string } } }
): boolean {
  const domain1 = getEventDomain(event1);
  const domain2 = getEventDomain(event2);
  
  // If either domain is null, we can't compare, so assume they're the same
  if (!domain1 || !domain2) {
    return false;
  }
  
  return domain1 !== domain2;
}

