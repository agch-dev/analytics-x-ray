import { useMemo } from 'react';

import { Button } from '@src/components/ui/button';
import { categorizeEvent, getBucketColor } from '@src/lib/eventBuckets';
import { cn, normalizeEventNameForFilter } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types';

interface FilterPanelProps {
  readonly events: SegmentEvent[];
  readonly hiddenEventNames: Set<string>;
  readonly onToggleEventName: (eventName: string) => void;
  readonly onShowAll: () => void;
  readonly onHideAll: () => void;
}

/**
 * Convert border color class to pill background color classes
 * Maps border-l-{color}-500 to bg-{color}-500/20 with appropriate text and border colors
 */
function getPillColorClasses(borderColorClass: string): string {
  if (!borderColorClass) return '';

  // Extract color from border-l-{color}-500 format
  const regex = /border-l-(\w+)-500/;
  const colorMatch = regex.exec(borderColorClass);
  if (!colorMatch) return '';

  const color = colorMatch[1];
  const colorMap: Record<string, string> = {
    emerald:
      'bg-emerald-500/20 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/30',
    purple:
      'bg-purple-500/20 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 dark:border-purple-500/30',
    cyan: 'bg-cyan-500/20 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 dark:border-cyan-500/30',
    orange:
      'bg-orange-500/20 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30 dark:border-orange-500/30',
    indigo:
      'bg-indigo-500/20 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 dark:border-indigo-500/30',
    green:
      'bg-green-500/20 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 dark:border-green-500/30',
    red: 'bg-red-500/20 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 dark:border-red-500/30',
    gray: 'bg-gray-500/20 dark:bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30 dark:border-gray-500/30',
  };

  return colorMap[color] || '';
}

export function FilterPanel({
  events,
  hiddenEventNames,
  onToggleEventName,
  onShowAll,
  onHideAll,
}: Readonly<FilterPanelProps>) {
  // Get all unique event names from current events (normalized)
  const uniqueEventNames = useMemo(() => {
    const names = new Set<string>();
    events.forEach((event) => {
      const normalizedName = normalizeEventNameForFilter(
        event.name,
        event.type
      );
      names.add(normalizedName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [events]);

  // Map normalized event names to their bucket colors
  const eventNameColors = useMemo(() => {
    const colorMap = new Map<string, string>();

    uniqueEventNames.forEach((normalizedName) => {
      // Find the first event that matches this normalized name
      const representativeEvent = events.find((event) => {
        const normalized = normalizeEventNameForFilter(event.name, event.type);
        return normalized === normalizedName;
      });

      if (representativeEvent) {
        const bucketId = categorizeEvent(representativeEvent);
        const borderColor = getBucketColor(bucketId);
        const pillColorClasses = getPillColorClasses(borderColor);
        colorMap.set(normalizedName, pillColorClasses);
      }
    });

    return colorMap;
  }, [events, uniqueEventNames]);

  const hasHiddenEvents = hiddenEventNames.size > 0;

  return (
    <div className="border-b border-border bg-card px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Show All / Hide All button */}
        {hasHiddenEvents ? (
          <Button
            variant="default"
            size="sm"
            onClick={onShowAll}
            className="h-7 text-xs"
            aria-label="Show all hidden event names"
          >
            Show All
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={onHideAll}
            className="h-7 text-xs"
            disabled={uniqueEventNames.length === 0}
            aria-label="Hide all event names"
          >
            Hide All
          </Button>
        )}

        {/* Event name pills */}
        {uniqueEventNames.map((eventName) => {
          const isHidden = hiddenEventNames.has(eventName);
          const pillColorClasses = eventNameColors.get(eventName) || '';
          const hasColor = pillColorClasses.length > 0;

          // Determine button variant based on color and hidden state
          let variant: 'default' | 'secondary' | 'ghost' = 'default';
          if (hasColor) {
            variant = 'ghost';
          } else if (isHidden) {
            variant = 'secondary';
          }

          return (
            <Button
              key={eventName}
              variant={variant}
              size="sm"
              onClick={() => onToggleEventName(eventName)}
              className={cn(
                'h-7 px-3 text-xs',
                hasColor && pillColorClasses,
                isHidden && 'line-through opacity-50'
              )}
              aria-label={
                isHidden
                  ? `Show ${eventName} events`
                  : `Hide ${eventName} events`
              }
              aria-pressed={isHidden}
            >
              {eventName}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
