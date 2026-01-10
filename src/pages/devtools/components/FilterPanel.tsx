import { useMemo } from 'react';

import { Button } from '@src/components/ui/button';
import { categorizeEvent, getBucketColor } from '@src/lib/eventBuckets';
import { cn, normalizeEventNameForFilter } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types';

interface FilterPanelProps {
  events: SegmentEvent[];
  hiddenEventNames: Set<string>;
  onToggleEventName: (eventName: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

/**
 * Convert border color class to pill background color classes
 * Maps border-l-{color}-500 to bg-{color}-500/20 with appropriate text and border colors
 */
function getPillColorClasses(borderColorClass: string): string {
  if (!borderColorClass) return '';

  // Extract color from border-l-{color}-500 format
  const colorMatch = borderColorClass.match(/border-l-(\w+)-500/);
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
}: FilterPanelProps) {
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
    return Array.from(names).sort();
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
    <div className="px-4 py-3 border-b border-border bg-card">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Show All / Hide All button */}
        {hasHiddenEvents ? (
          <Button
            variant="default"
            size="sm"
            onClick={onShowAll}
            className="text-xs h-7"
            aria-label="Show all hidden event names"
          >
            Show All
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="sm"
            onClick={onHideAll}
            className="text-xs h-7"
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

          return (
            <Button
              key={eventName}
              variant={hasColor ? 'ghost' : isHidden ? 'secondary' : 'default'}
              size="sm"
              onClick={() => onToggleEventName(eventName)}
              className={cn(
                'text-xs h-7 px-3',
                hasColor && pillColorClasses,
                isHidden && 'opacity-50 line-through'
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
