import { cn } from '@src/lib/utils';
import type { SegmentEvent, SegmentEventType } from '@src/types/segment';
import { EVENT_TYPE_LABELS } from '@src/types/segment';

// Event type badge styling (theme-aware)
export const getEventTypeClasses = (type: SegmentEventType): string => {
  const baseClasses = 'text-xs font-mono px-1.5 py-0.5 rounded';
  const colorMap: Record<SegmentEventType, string> = {
    track: 'bg-blue-500/20 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 dark:border-blue-500/30',
    page: 'bg-emerald-500/20 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 dark:border-emerald-500/30',
    screen: 'bg-teal-500/20 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/30 dark:border-teal-500/30',
    identify: 'bg-purple-500/20 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 dark:border-purple-500/30',
    group: 'bg-amber-500/20 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 dark:border-amber-500/30',
    alias: 'bg-slate-500/20 dark:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30 dark:border-slate-500/30',
  };
  return cn(baseClasses, colorMap[type]);
};

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
  onToggleExpand: (id: string) => void;
}

export function EventRowHeader({ 
  event, 
  isExpanded = false,
  isSticky = false,
  onToggleExpand,
}: EventRowHeaderProps) {
  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 transition-colors',
        isSticky 
          ? 'bg-background/95 backdrop-blur-sm border-b border-border shadow-md px-3 py-2 cursor-pointer hover:bg-accent/30' 
          : 'px-3 py-2 hover:bg-accent/50'
      )}
    >
      {/* Timestamp */}
      <span className="text-xs text-muted-foreground font-mono shrink-0 w-24">
        {formatTime(event.timestamp)}
      </span>
      
      {/* Event type badge */}
      <span className={getEventTypeClasses(event.type)}>
        {EVENT_TYPE_LABELS[event.type]}
      </span>
      
      {/* Event name */}
      <span className="text-sm text-foreground truncate flex-1">
        {event.name}
      </span>
      
      {/* Provider indicator */}
      {event.provider && event.provider !== 'segment' && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {event.provider}
        </span>
      )}
    </div>
  );
}

