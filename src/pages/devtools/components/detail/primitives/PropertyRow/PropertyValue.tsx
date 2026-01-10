import React from 'react';

import { HighlightedText } from '@src/components';
import { cn } from '@src/lib';

import type { PropertyValueProps } from './types';

/**
 * PropertyValue component - Renders the value portion of a property row
 * Handles value formatting, highlighting, and display styling
 */
export const PropertyValue = React.memo(function PropertyValue({
  value,
  searchQuery = '',
  displayValue,
  valueColorStyle,
}: PropertyValueProps) {
  // Highlight search matches for all primitive types (string, number, boolean, null, undefined)
  const shouldHighlight =
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    value === undefined;

  return (
    <span
      className={cn('text-xs font-mono break-all', valueColorStyle.className)}
      style={
        valueColorStyle.color ? { color: valueColorStyle.color } : undefined
      }
    >
      {shouldHighlight ? (
        <HighlightedText text={displayValue} searchQuery={searchQuery} />
      ) : (
        displayValue
      )}
    </span>
  );
});
