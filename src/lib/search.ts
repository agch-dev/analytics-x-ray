import type { SegmentEvent } from '@src/types/segment';

export interface SearchMatch {
  type: 'name' | 'value' | 'keyValue';
  key?: string;
  value?: string;
  query: string;
}

/**
 * Parse search query to detect key:value format
 * Returns match information for highlighting
 */
export function parseSearchQuery(query: string): SearchMatch | null {
  if (!query.trim()) {
    return null;
  }

  const trimmed = query.trim();
  
  // Check for key:value format (e.g., "userId: 123" or "properties.name: test")
  const keyValueMatch = trimmed.match(/^([^:]+):\s*(.+)$/);
  if (keyValueMatch) {
    const [, key, value] = keyValueMatch;
    return {
      type: 'keyValue',
      key: key.trim(),
      value: value.trim(),
      query: trimmed,
    };
  }

  // Regular search - matches name or any value
  return {
    type: 'value',
    query: trimmed,
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
 * Get nested value from object using dot notation (e.g., "properties.name")
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!path || typeof obj !== 'object' || obj === null) {
    return undefined;
  }

  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    
    if (Array.isArray(current)) {
      // For arrays, check if any element matches
      return current.some((item) => getNestedValue(item, key) !== undefined);
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Check if an event matches the search query
 */
export function eventMatchesSearch(event: SegmentEvent, match: SearchMatch | null): boolean {
  if (!match) {
    return true;
  }

  const { type, key, value, query } = match;

  if (type === 'keyValue' && key && value) {
    // Search for specific key-value pair
    const eventObj = event as Record<string, unknown>;
    const nestedValue = getNestedValue(eventObj, key);
    
    if (nestedValue === undefined) {
      return false;
    }

    // Check if the value matches
    if (typeof nestedValue === 'string') {
      return nestedValue.toLowerCase().includes(value.toLowerCase());
    }
    
    if (typeof nestedValue === 'number' || typeof nestedValue === 'boolean') {
      return String(nestedValue).toLowerCase().includes(value.toLowerCase());
    }

    if (Array.isArray(nestedValue)) {
      return nestedValue.some((item) => {
        const itemStr = String(item).toLowerCase();
        return itemStr.includes(value.toLowerCase());
      });
    }

    if (typeof nestedValue === 'object' && nestedValue !== null) {
      return searchInObject(nestedValue, value);
    }

    return false;
  }

  // Regular search - check event name and all values
  const searchLower = query.toLowerCase();
  
  // Check event name
  if (event.name.toLowerCase().includes(searchLower)) {
    return true;
  }

  // Check all values in the event object
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

