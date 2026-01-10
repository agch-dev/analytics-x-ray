import { useMemo, useCallback } from 'react';

import { sortWithPinnedFirst } from '@src/hooks';

import { PropertyRow } from './PropertyRow';

export interface PropertyEntry {
  key: string;
  value: unknown;
}

interface PropertyListProps {
  /** Array of property entries to display */
  entries: PropertyEntry[];
  /** Array of pinned property keys */
  pinnedProperties: string[];
  /** Search query for highlighting matches */
  searchQuery?: string;
  /** Callback to toggle pin for a property */
  onTogglePin?: (key: string) => void;
  /** Whether to show pin buttons */
  showPinButtons?: boolean;
  /** Message to show when there are no entries */
  emptyMessage?: string;
}

/**
 * Renders a list of properties with pinned items first, separated from unpinned.
 * Handles the common pattern of displaying property rows with pin functionality.
 */
export function PropertyList({
  entries,
  pinnedProperties,
  searchQuery = '',
  onTogglePin,
  showPinButtons = true,
  emptyMessage,
}: PropertyListProps) {
  // Separate pinned and unpinned for display
  const { pinned, unpinned } = useMemo(() => {
    return sortWithPinnedFirst(entries, pinnedProperties);
  }, [entries, pinnedProperties]);

  const handleTogglePin = useCallback(
    (key: string) => {
      onTogglePin?.(key);
    },
    [onTogglePin]
  );

  if (entries.length === 0 && emptyMessage) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground text-center italic">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="pt-1">
      {/* Pinned properties first */}
      {pinned.length > 0 && (
        <>
          {pinned.map(({ key, value }) => (
            <PropertyRow
              key={key}
              label={key}
              value={value}
              searchQuery={searchQuery}
              isPinned={true}
              onTogglePin={() => handleTogglePin(key)}
              showPinButton={showPinButtons && !!onTogglePin}
            />
          ))}
          {/* Separator between pinned and unpinned */}
          {unpinned.length > 0 && (
            <div className="my-2 border-t border-border/50" />
          )}
        </>
      )}
      {/* Unpinned properties */}
      {unpinned.map(({ key, value }) => (
        <PropertyRow
          key={key}
          label={key}
          value={value}
          searchQuery={searchQuery}
          isPinned={false}
          onTogglePin={() => handleTogglePin(key)}
          showPinButton={showPinButtons && !!onTogglePin}
        />
      ))}
    </div>
  );
}

interface PinnedPropertyListProps {
  /** Array of property entries (already filtered to pinned only) */
  entries: PropertyEntry[];
  /** Search query for highlighting */
  searchQuery?: string;
  /** Callback to toggle pin */
  onTogglePin?: (key: string) => void;
}

/**
 * Renders a simple list of pinned properties (for collapsed section preview)
 */
export function PinnedPropertyList({
  entries,
  searchQuery = '',
  onTogglePin,
}: PinnedPropertyListProps) {
  if (entries.length === 0) return null;

  return (
    <div className="pt-1">
      {entries.map(({ key, value }) => (
        <PropertyRow
          key={key}
          label={key}
          value={value}
          searchQuery={searchQuery}
          isPinned={true}
          onTogglePin={() => onTogglePin?.(key)}
          showPinButton={!!onTogglePin}
        />
      ))}
    </div>
  );
}
