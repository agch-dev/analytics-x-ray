import type { SegmentEvent } from '@src/types';

export interface SearchMatch {
  query: string;
}

/**
 * Parse search query
 * Returns match information for highlighting
 *
 * @param query - The search query string
 * @returns SearchMatch object or null if query is empty
 *
 * @example
 * ```ts
 * parseSearchQuery('button'); // { query: 'button' }
 * parseSearchQuery('  '); // null
 * ```
 */
export function parseSearchQuery(query: string): SearchMatch | null {
  if (!query.trim()) {
    return null;
  }

  return {
    query: query.trim(),
  };
}

/**
 * Format a value for search comparison (matches display format)
 */
function formatValueForSearch(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return '';
}

/**
 * Recursively search through an object for a value or key
 */
function searchInObject(obj: unknown, searchValue: string): boolean {
  const searchLower = searchValue.toLowerCase();

  // Handle null and undefined - they should be searchable as "null" and "undefined"
  if (obj === null || obj === undefined) {
    const formatted = formatValueForSearch(obj);
    return formatted.toLowerCase().includes(searchLower);
  }

  if (typeof obj === 'string') {
    return obj.toLowerCase().includes(searchLower);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    const formatted = formatValueForSearch(obj);
    return formatted.toLowerCase().includes(searchLower);
  }

  if (Array.isArray(obj)) {
    return obj.some((item) => searchInObject(item, searchValue));
  }

  if (typeof obj === 'object') {
    // Check both keys and values
    return Object.entries(obj).some(([key, value]) => {
      // Check if the key matches
      if (key.toLowerCase().includes(searchLower)) {
        return true;
      }
      // Recursively check the value
      return searchInObject(value, searchValue);
    });
  }

  return false;
}

/**
 * Check if an event matches the search query
 * Searches recursively through all event properties (keys and values)
 * Case-insensitive matching
 *
 * @param event - The Segment event to search
 * @param match - The search match object (from parseSearchQuery)
 * @returns true if event matches the search query
 *
 * @example
 * ```ts
 * const match = parseSearchQuery('button');
 * eventMatchesSearch({ name: 'Button Clicked', properties: { type: 'button' } }, match); // true
 * ```
 */
export function eventMatchesSearch(
  event: SegmentEvent,
  match: SearchMatch | null
): boolean {
  if (!match) {
    return true;
  }

  const { query } = match;
  const searchLower = query.toLowerCase();

  // Check event name
  if (event.name.toLowerCase().includes(searchLower)) {
    return true;
  }

  // Check all keys and values in the event object
  return searchInObject(event, query);
}

/**
 * Highlight matching text in a string
 * Returns an array of parts: [{ text: string, highlight: boolean }]
 * Case-insensitive matching
 *
 * @param text - The text to highlight
 * @param searchQuery - The search query to match
 * @returns Array of text parts with highlight flags
 *
 * @example
 * ```ts
 * highlightText('Hello World', 'World');
 * // Returns: [{ text: 'Hello ', highlight: false }, { text: 'World', highlight: true }]
 * ```
 */
export function highlightText(
  text: string,
  searchQuery: string
): Array<{ text: string; highlight: boolean }> {
  if (!searchQuery.trim()) {
    return [{ text, highlight: false }];
  }

  const searchLower = searchQuery.toLowerCase();
  const textLower = text.toLowerCase();
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let lastIndex = 0;
  let index = textLower.indexOf(searchLower, lastIndex);

  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, index), highlight: false });
    }

    // Add highlighted match
    parts.push({
      text: text.substring(index, index + searchQuery.length),
      highlight: true,
    });

    lastIndex = index + searchQuery.length;
    index = textLower.indexOf(searchLower, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex), highlight: false });
  }

  return parts.length > 0 ? parts : [{ text, highlight: false }];
}
