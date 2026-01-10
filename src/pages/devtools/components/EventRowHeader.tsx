import {
  ViewOffSlashIcon,
  TextIcon,
  CodeIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react';

import { Button } from '@src/components/ui/button';
import { categorizeEvent, getBucketColor } from '@src/lib/eventBuckets';
import type { SearchMatch } from '@src/lib/search';
import { highlightText } from '@src/lib/search';
import { cn, normalizeEventNameForFilter } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types';

type ViewMode = 'json' | 'structured';

// Format timestamp for display
export const formatTime = (timestamp: string | number): string => {
  const date = new Date(timestamp);
  return (
    date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) +
    '.' +
    date.getMilliseconds().toString().padStart(3, '0')
  );
};

interface EventRowHeaderProps {
  event: SegmentEvent;
  isExpanded?: boolean;
  isSticky?: boolean;
  isHidden?: boolean;
  searchMatch?: SearchMatch | null;
  viewMode?: ViewMode;
  onToggleHide?: (eventName: string) => void;
  onViewModeChange?: (mode: ViewMode) => void;
}

export const EventRowHeader = React.memo(function EventRowHeader({
  event,
  isExpanded = false,
  isSticky = false,
  isHidden = false,
  searchMatch,
  viewMode,
  onToggleHide,
  onViewModeChange,
}: EventRowHeaderProps) {
  const handleMuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const normalizedName = normalizeEventNameForFilter(event.name, event.type);
    onToggleHide?.(normalizedName);
  };

  const handleViewModeClick = (e: React.MouseEvent, mode: ViewMode) => {
    e.stopPropagation();
    onViewModeChange?.(mode);
  };

  // Categorize event and get bucket color
  const bucketId = categorizeEvent(event);
  const bucketColor = getBucketColor(bucketId);

  // Highlight event name if there's a search match
  const eventNameParts = searchMatch?.query
    ? highlightText(event.name, searchMatch.query)
    : [{ text: event.name, highlight: false }];

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 transition-colors',
        isSticky
          ? 'bg-background/50 backdrop-blur-sm border-b border-border shadow-md px-3 py-2 cursor-pointer hover:bg-accent/30'
          : 'px-3 py-2 hover:bg-accent/50',
        'border-l-6',
        bucketColor || 'border-l-gray-500'
      )}
    >
      {/* Timestamp */}
      <span className="text-xs text-muted-foreground font-mono shrink-0 w-24">
        {formatTime(event.timestamp)}
      </span>

      {/* Event name with highlighting */}
      <span className="text-sm text-foreground truncate flex-1">
        {eventNameParts.map((part, index) =>
          part.highlight ? (
            <mark
              key={index}
              className="bg-yellow-500/30 dark:bg-yellow-500/40 text-foreground rounded px-0.5"
            >
              {part.text}
            </mark>
          ) : (
            <span key={index}>{part.text}</span>
          )
        )}
      </span>

      {/* Provider indicator */}
      {event.provider && event.provider !== 'segment' && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {event.provider}
        </span>
      )}

      {/* View mode toggle - only show when expanded */}
      {isExpanded && onViewModeChange && viewMode && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleViewModeClick(e, 'structured')}
            className={cn(
              'h-6 px-1 sm:px-2 py-0 flex items-center gap-1',
              viewMode === 'structured'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="Structured view"
            aria-label="Switch to structured view"
            aria-pressed={viewMode === 'structured'}
          >
            <HugeiconsIcon icon={TextIcon} size={12} />
            <span className="text-xs font-medium hidden sm:inline">
              Structured
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleViewModeClick(e, 'json')}
            className={cn(
              'h-6 px-1 sm:px-2 py-0 flex items-center gap-1',
              viewMode === 'json'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            title="JSON view"
            aria-label="Switch to JSON view"
            aria-pressed={viewMode === 'json'}
          >
            <HugeiconsIcon icon={CodeIcon} size={12} />
            <span className="text-xs font-medium hidden sm:inline">JSON</span>
          </Button>
        </div>
      )}

      {/* Mute/Hide button */}
      {onToggleHide && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMuteClick}
          className={cn('h-6 w-6 p-0 shrink-0', isHidden && 'opacity-50')}
          title={isHidden ? 'Show this event name' : 'Hide this event name'}
          aria-label={
            isHidden ? `Show ${event.name} events` : `Hide ${event.name} events`
          }
          aria-pressed={isHidden}
        >
          <HugeiconsIcon
            icon={ViewOffSlashIcon}
            size={14}
            className="text-muted-foreground"
          />
        </Button>
      )}
    </div>
  );
});
