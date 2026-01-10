import React from 'react';

import { ErrorBoundary, EventDetailErrorState } from '@src/components';
import type { SearchMatch } from '@src/lib';
import { cn } from '@src/lib';
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
        'w-full border-b border-border bg-card/80 transition-colors',
        isAnimatingCollapse && 'animate-ring-pulse'
      )}
    >
      {/* Row header - clickable */}
      <div
        onClick={() => onToggleExpand(event.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand(event.id);
          }
        }}
        role="button"
        tabIndex={0}
        className="w-full cursor-pointer text-left"
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
      </div>

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
