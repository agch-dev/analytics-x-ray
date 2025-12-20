import type { SegmentEvent } from '@src/types/segment';

export interface SearchMatch {
  query: string;
}

/**
 * Parse search query
 * Returns match information for highlighting
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
 * Recursively search through an object for a value or key
 */
function searchInObject(obj: unknown, searchValue: string): boolean {
  if (obj === null || obj === undefined) {
    return false;
  }

  const searchLower = searchValue.toLowerCase();

  if (typeof obj === 'string') {
    return obj.toLowerCase().includes(searchLower);
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj).toLowerCase().includes(searchLower);
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
 */
export function eventMatchesSearch(event: SegmentEvent, match: SearchMatch | null): boolean {
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
 */
export function highlightText(text: string, searchQuery: string): Array<{ text: string; highlight: boolean }> {
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
      highlight: true 
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

