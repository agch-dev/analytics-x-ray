import {
  ArrowRight01Icon,
  ArrowDown01Icon,
  PinIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { ReactNode, useCallback, useMemo } from 'react';

import { sortWithPinnedFirst } from '@src/hooks';
import { cn } from '@src/lib';

import type { PropertyEntry } from './PropertyList';
import { PropertyRow } from './PropertyRow';

interface CollapsibleSubsectionProps {
  /** Unique key for this subsection */
  subsectionKey: string;
  /** Display title */
  title: string;
  /** Icon to display */
  icon: ReactNode;
  /** Property entries to display */
  entries: PropertyEntry[];
  /** Array of pinned property keys for this subsection */
  pinnedKeys: string[];
  /** Whether the subsection is expanded */
  isExpanded: boolean;
  /** Callback to toggle expansion */
  onToggleExpand: () => void;
  /** Callback to toggle pin for a property */
  onTogglePin: (propertyKey: string) => void;
  /** Search query for highlighting */
  searchQuery?: string;
}

/**
 * A collapsible subsection that displays properties with pinning support.
 * Used by ContextSection and MiscSection for their nested subsections.
 */
export function CollapsibleSubsection({
  title,
  icon,
  entries,
  pinnedKeys,
  isExpanded,
  onToggleExpand,
  onTogglePin,
  searchQuery = '',
}: CollapsibleSubsectionProps) {
  const entryCount = entries.length;

  // Sort entries: pinned first
  const { pinned, unpinned } = useMemo(() => {
    return sortWithPinnedFirst(entries, pinnedKeys);
  }, [entries, pinnedKeys]);

  const handleTogglePin = useCallback(
    (key: string) => {
      onTogglePin(key);
    },
    [onTogglePin]
  );

  return (
    <div className="px-1">
      {/* Header button */}
      <button
        onClick={onToggleExpand}
        className={cn(
          `
            flex w-full items-center gap-2 px-2 py-1 text-xs
            text-muted-foreground
          `,
          `
            rounded transition-colors
            hover:bg-muted/30
          `,
          'text-left'
        )}
        aria-label={
          isExpanded
            ? `Collapse ${title} subsection`
            : `Expand ${title} subsection`
        }
        aria-expanded={isExpanded}
      >
        <HugeiconsIcon
          icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
          size={10}
          className="shrink-0 text-muted-foreground"
        />
        {icon}
        <span className="text-[10px] font-medium tracking-wide uppercase">
          {title}
        </span>
        {/* Pin indicator */}
        {pinnedKeys.length > 0 && (
          <span className="flex items-center gap-1 text-amber-500/80">
            <HugeiconsIcon icon={PinIcon} size={8} className="rotate-45" />
            {pinnedKeys.length}
          </span>
        )}
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/70">
          {entryCount}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-0.5 ml-2 border-l border-border">
          {/* Pinned properties first */}
          {pinned.map(({ key, value }) => (
            <PropertyRow
              key={key}
              label={key}
              value={value}
              searchQuery={searchQuery}
              isPinned={true}
              onTogglePin={() => handleTogglePin(key)}
              showPinButton={true}
            />
          ))}
          {/* Separator if there are both pinned and unpinned */}
          {pinned.length > 0 && unpinned.length > 0 && (
            <div className="mx-2 my-1 border-t border-border/50" />
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
              showPinButton={true}
            />
          ))}
        </div>
      )}

      {/* Show pinned properties when collapsed */}
      {!isExpanded && pinnedKeys.length > 0 && (
        <div
          className={`
          mt-0.5 ml-2 border-l border-amber-500/30 bg-neutral-400/5
        `}
        >
          {pinned.map(({ key, value }) => (
            <PropertyRow
              key={key}
              label={key}
              value={value}
              searchQuery={searchQuery}
              isPinned={true}
              onTogglePin={() => handleTogglePin(key)}
              showPinButton={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SubsectionHeaderProps {
  /** Display title */
  title: string;
  /** Icon to display */
  icon: ReactNode;
  /** Number of pinned items */
  pinnedCount: number;
}

/**
 * Header for a subsection in the pinned content preview (collapsed state)
 */
export function SubsectionHeader({
  title,
  icon,
  pinnedCount,
}: SubsectionHeaderProps) {
  return (
    <div
      className={`
      flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground
    `}
    >
      {icon}
      <span className="text-[10px] font-medium tracking-wide uppercase">
        {title}
      </span>
      <span className="ml-auto flex items-center gap-1 text-amber-500/80">
        <HugeiconsIcon icon={PinIcon} size={8} className="rotate-45" />
        {pinnedCount}
      </span>
    </div>
  );
}
