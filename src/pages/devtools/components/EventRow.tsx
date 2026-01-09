import React from 'react';
import { cn } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import type { SearchMatch } from '@src/lib/search';
import { EventRowHeader } from './EventRowHeader';
import { EventDetailView } from './detail';
import { ErrorBoundary, EventDetailErrorState } from '@src/components';

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

export const EventRow = React.memo(function EventRow({ 
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
        aria-label={isExpanded ? `Collapse ${event.name} event` : `Expand ${event.name} event`}
        aria-expanded={isExpanded}
      >
        <EventRowHeader
          event={event}
          isExpanded={isExpanded}
          isHidden={isHidden}
          searchMatch={searchMatch}
          viewMode={viewMode}
          onToggleHide={onToggleHide}
          onViewModeChange={onViewModeChange}
        />
      </button>

      {/* Expanded detail view */}
      {isExpanded && (
        <ErrorBoundary
          fallback={<EventDetailErrorState />}
          resetKeys={[event.id, viewMode]}
        >
          <EventDetailView
            event={event}
            viewMode={viewMode}
            searchQuery={searchQuery}
          />
        </ErrorBoundary>
      )}
    </div>
  );
});
