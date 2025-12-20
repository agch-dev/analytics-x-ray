import { cn, normalizeEventNameForFilter } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import type { SearchMatch } from '@src/lib/search';
import { highlightText } from '@src/lib/search';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { Button } from '@src/components/ui/button';
import { categorizeEvent, getBucketColor } from '@src/lib/eventBuckets';

// Format timestamp for display
export const formatTime = (timestamp: string | number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
};

interface EventRowHeaderProps {
  event: SegmentEvent;
  isExpanded?: boolean;
  isSticky?: boolean;
  isHidden?: boolean;
  searchMatch?: SearchMatch | null;
  onToggleExpand: (id: string) => void;
  onToggleHide?: (eventName: string) => void;
}

export function EventRowHeader({ 
  event, 
  isExpanded = false,
  isSticky = false,
  isHidden = false,
  searchMatch,
  onToggleExpand,
  onToggleHide,
}: EventRowHeaderProps) {
  const handleMuteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const normalizedName = normalizeEventNameForFilter(event.name, event.type);
    onToggleHide?.(normalizedName);
  };

  // Categorize event and get bucket color
  const bucketId = categorizeEvent(event);
  const bucketColor = getBucketColor(bucketId);

  // Highlight event name if there's a search match
  const eventNameParts = searchMatch?.query 
    ? highlightText(event.name, searchMatch.type === 'keyValue' ? searchMatch.value || '' : searchMatch.query)
    : [{ text: event.name, highlight: false }];

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 transition-colors',
        isSticky 
          ? 'backdrop-blur-sm border-b border-border shadow-md px-3 py-2 cursor-pointer hover:bg-accent/30' 
          : 'px-3 py-2 hover:bg-accent/50',
           'border-l-6',
          bucketColor || 'border-l-transparent'
      )}
    >
      {/* Timestamp */}
      <span className="text-xs text-muted-foreground font-mono shrink-0 w-24">
        {formatTime(event.timestamp)}
      </span>
      
      {/* Event name with highlighting */}
      <span className="text-sm text-foreground truncate flex-1">
        {eventNameParts.map((part, index) => (
          part.highlight ? (
            <mark key={index} className="bg-yellow-500/30 dark:bg-yellow-500/40 text-foreground rounded px-0.5">
              {part.text}
            </mark>
          ) : (
            <span key={index}>{part.text}</span>
          )
        ))}
      </span>
      
      {/* Provider indicator */}
      {event.provider && event.provider !== 'segment' && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {event.provider}
        </span>
      )}

      {/* Mute/Hide button */}
      {onToggleHide && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleMuteClick}
          className={cn(
            "h-6 w-6 p-0 shrink-0",
            isHidden && "opacity-50"
          )}
          title={isHidden ? "Show this event name" : "Hide this event name"}
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
}

