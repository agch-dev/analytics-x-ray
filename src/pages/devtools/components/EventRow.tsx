import React from 'react';

import { ErrorBoundary, EventDetailErrorState } from '@src/components';
import type { SearchMatch } from '@src/lib/search';
import { cn } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types';

import { EventDetailView } from './detail';
import { EventRowHeader } from './EventRowHeader';

type ViewMode = 'json' | 'structured';

interface EventRowProps {
  event: SegmentEvent;
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
        isAnimatingCollapse && 'animate-ring-pulse'
      )}
    >
      {/* Row header - clickable */}
      <button
        onClick={() => onToggleExpand(event.id)}
        className="w-full text-left"
        aria-label={
          isExpanded
            ? `Collapse ${event.name} event`
            : `Expand ${event.name} event`
        }
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
