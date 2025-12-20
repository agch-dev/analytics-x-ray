import { useMemo } from 'react';
import { cn, normalizeEventNameForFilter } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import { Button } from '@src/components/ui/button';
import { Badge } from '@src/components/ui/badge';

interface FilterPanelProps {
  events: SegmentEvent[];
  hiddenEventNames: Set<string>;
  onToggleEventName: (eventName: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
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
      const normalizedName = normalizeEventNameForFilter(event.name, event.type);
      names.add(normalizedName);
    });
    return Array.from(names).sort();
  }, [events]);

  const hasHiddenEvents = hiddenEventNames.size > 0;
  const allVisible = hiddenEventNames.size === 0;

  return (
    <div className="px-4 py-3 border-b border-border bg-card">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Show All / Hide All button */}
        {hasHiddenEvents ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onShowAll}
            className="text-xs h-7"
          >
            Show All
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onHideAll}
            className="text-xs h-7"
            disabled={uniqueEventNames.length === 0}
          >
            Hide All
          </Button>
        )}

        {/* Event name pills */}
        {uniqueEventNames.map((eventName) => {
          const isHidden = hiddenEventNames.has(eventName);
          return (
            <Button
              key={eventName}
              variant={isHidden ? "secondary" : "default"}
              size="sm"
              onClick={() => onToggleEventName(eventName)}
              className={cn(
                "text-xs h-7 px-3 rounded-full",
                isHidden && "opacity-50 line-through"
              )}
            >
              {eventName}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

