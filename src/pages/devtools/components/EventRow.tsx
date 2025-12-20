import { cn } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import type { SearchMatch } from '@src/lib/search';
import { EventRowHeader } from './EventRowHeader';
import { EventDetailView } from './detail';

type ViewMode = 'json' | 'structured';

interface EventRowProps {
  event: SegmentEvent;
  isSelected: boolean;
  isExpanded: boolean;
  isAnimatingCollapse?: boolean;
  isHidden?: boolean;
  searchMatch?: SearchMatch | null;
  viewMode: ViewMode;
  onToggleExpand: (id: string) => void;
  onToggleHide?: (eventName: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function EventRow({ 
  event, 
  isSelected, 
  isExpanded,
  isAnimatingCollapse = false,
  isHidden = false,
  searchMatch,
  viewMode,
  onToggleExpand,
  onToggleHide,
  onViewModeChange,
}: EventRowProps) {
  // Get search query for highlighting
  const searchQuery = searchMatch?.query ?? '';

  return (
    <div
      className={cn(
        'w-full border-b border-border transition-colors bg-card/80',
        isSelected && 'bg-blue-500/10 dark:bg-blue-500/10 border-l-2 border-l-blue-500',
        isAnimatingCollapse && 'animate-ring-pulse'
      )}
    >
      {/* Row header - clickable */}
      <button
        onClick={() => onToggleExpand(event.id)}
        className="w-full text-left"
      >
        <EventRowHeader
          event={event}
          isExpanded={isExpanded}
          isHidden={isHidden}
          searchMatch={searchMatch}
          onToggleExpand={onToggleExpand}
          onToggleHide={onToggleHide}
        />
      </button>

      {/* Expanded detail view */}
      {isExpanded && (
        <EventDetailView
          event={event}
          viewMode={viewMode}
          searchQuery={searchQuery}
          onViewModeChange={onViewModeChange}
        />
      )}
    </div>
  );
}
