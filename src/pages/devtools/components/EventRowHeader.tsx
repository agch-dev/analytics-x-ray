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
        'flex w-full items-center gap-3 transition-colors',
        isSticky
          ? `
            cursor-pointer border-b border-border bg-background/50 px-3 py-2
            shadow-md backdrop-blur-sm
            hover:bg-accent/30
          `
          : `
            px-3 py-2
            hover:bg-accent/50
          `,
        'border-l-6',
        bucketColor || 'border-l-gray-500'
      )}
    >
      {/* Timestamp */}
      <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
        {formatTime(event.timestamp)}
      </span>

      {/* Event name with highlighting */}
      <span className="flex-1 truncate text-sm text-foreground">
        {eventNameParts.map((part, index) =>
          part.highlight ? (
            <mark
              key={index}
              className={`
                rounded bg-yellow-500/30 px-0.5 text-foreground
                dark:bg-yellow-500/40
              `}
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
        <span className="text-xs tracking-wider text-muted-foreground uppercase">
          {event.provider}
        </span>
      )}

      {/* View mode toggle - only show when expanded */}
      {isExpanded && onViewModeChange && viewMode && (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleViewModeClick(e, 'structured')}
            className={cn(
              `
                flex h-6 items-center gap-1 px-1 py-0
                sm:px-2
              `,
              viewMode === 'structured'
                ? 'bg-primary text-primary-foreground'
                : `
                  text-muted-foreground
                  hover:text-foreground
                `
            )}
            title="Structured view"
            aria-label="Switch to structured view"
            aria-pressed={viewMode === 'structured'}
          >
            <HugeiconsIcon icon={TextIcon} size={12} />
            <span
              className={`
                hidden text-xs font-medium
                sm:inline
              `}
            >
              Structured
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => handleViewModeClick(e, 'json')}
            className={cn(
              `
                flex h-6 items-center gap-1 px-1 py-0
                sm:px-2
              `,
              viewMode === 'json'
                ? 'bg-primary text-primary-foreground'
                : `
                  text-muted-foreground
                  hover:text-foreground
                `
            )}
            title="JSON view"
            aria-label="Switch to JSON view"
            aria-pressed={viewMode === 'json'}
          >
            <HugeiconsIcon icon={CodeIcon} size={12} />
            <span
              className={`
                hidden text-xs font-medium
                sm:inline
              `}
            >
              JSON
            </span>
          </Button>
        </div>
      )}

      {/* Mute/Hide button */}
      {onToggleHide && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMuteClick}
          className={cn('h-6 w-6 shrink-0 p-0', isHidden && 'opacity-50')}
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
