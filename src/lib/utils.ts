import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    // eslint-disable-next-line sonarjs/deprecation -- Required fallback for DevTools panels where Clipboard API is blocked
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
    const regex = /^https?:\/\/[^/]+(\/.*)?$/;
    const match = regex.exec(url);
    return match && match[1] ? match[1] : '/';
  }
}

/**
 * Extract domain from a full URL
 * @param url - The full URL string
 * @returns The domain (hostname) or null if parsing fails
 */
function extractDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Get the domain from an event
 * @param event - The Segment event
 * @returns The domain string or null if unavailable
 */
function getEventDomain(event: {
  context?: { page?: { url?: string } };
}): string | null {
  if (event.context?.page?.url) {
    return extractDomainFromUrl(event.context.page.url);
  }
  return null;
}

/**
 * Get the full URL from an event (for comparison)
 * Uses context.page.url only
 * @param event - The Segment event
 * @returns The full URL string or null if unavailable
 */
export function getEventUrl(event: {
  context?: { page?: { url?: string } };
}): string | null {
  return event.context?.page?.url || null;
}

/**
 * Check if URLs are different between two events
 * Compares full URLs (including query params) to detect navigation changes
 * Uses referrer as fallback if URL is not available
 * @param event1 - First event
 * @param event2 - Second event
 * @returns true if URLs are different
 */
export function urlsAreDifferent(
  event1: { context?: { page?: { url?: string; referrer?: string } } },
  event2: { context?: { page?: { url?: string; referrer?: string } } }
): boolean {
  const url1 = getEventUrl(event1);
  const url2 = getEventUrl(event2);

  // If either URL is missing, we can't compare
  if (!url1 || !url2) {
    return false;
  }

  // Compare full URLs (including query params and hash)
  return url1 !== url2;
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

/**
 * Generate a mailto link for feedback emails
 * @param email - The email address to send feedback to (default: feedback@agch.dev)
 * @param subject - The email subject (default: 'Analytics x-ray - Feedback')
 * @param body - The email body template (optional, uses default if not provided)
 * @returns A mailto URL string
 */
export function getFeedbackMailtoLink(
  email: string = 'feedback@agch.dev',
  subject: string = 'Analytics x-ray - Feedback',
  body?: string
): string {
  const defaultBody =
    "Hi,\n\nI wanted to share some feedback about Analytics x-ray:\n\n\n\n---\n\n(Please include any relevant details about your feedback, suggestions, or issues you've encountered)";
  const emailBody = body ?? defaultBody;

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
}

/**
 * Format a timestamp in a human-readable format
 * @param timestamp - The timestamp in milliseconds (from Date.now())
 * @returns A human-readable date and time string (e.g., "Jan 15, 2024, 14:30:45.123")
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return (
    date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }) + `.${date.getMilliseconds().toString().padStart(3, '0')}`
  );
}
