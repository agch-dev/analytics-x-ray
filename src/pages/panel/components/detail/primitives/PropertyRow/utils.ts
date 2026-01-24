import { getValueTypeColor } from '@src/lib';

/**
 * Format a value for display
 */
export function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') return `Object`;
  return String(value);
}

/**
 * Get the display color for a value type
 * Returns an object with color and className for styling
 */
export function getValueColor(value: unknown): {
  color?: string;
  className: string;
} {
  const color = getValueTypeColor(value);

  // For null/undefined, use italic styling
  if (value === null || value === undefined) {
    return {
      color: color || undefined,
      className: 'italic',
    };
  }

  // For other types, use the theme color
  if (color) {
    return {
      color,
      className: '',
    };
  }

  // Fallback for objects/arrays
  return {
    className: 'text-muted-foreground',
  };
}

/**
 * Check if value is expandable (object or non-empty array)
 */
export function isExpandable(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null)
    return Object.keys(value).length > 0;
  return false;
}

/**
 * Check if value is an array (for JSON view toggle)
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
