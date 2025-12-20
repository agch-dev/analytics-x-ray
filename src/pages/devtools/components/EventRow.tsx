import { cn } from '@src/lib/utils';
import type { SegmentEvent, SegmentEventType } from '@src/types/segment';
import { EVENT_TYPE_LABELS } from '@src/types/segment';

// Event type badge styling (dark theme optimized)
const getEventTypeClasses = (type: SegmentEventType): string => {
  const baseClasses = 'text-xs font-mono px-1.5 py-0.5 rounded';
  const colorMap: Record<SegmentEventType, string> = {
    track: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    page: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    screen: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
    identify: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    group: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    alias: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
  };
  return cn(baseClasses, colorMap[type]);
};

// Format timestamp for display
const formatTime = (timestamp: string | number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + '.' + date.getMilliseconds().toString().padStart(3, '0');
};

interface EventRowProps {
  event: SegmentEvent;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function EventRow({ event, isSelected, onSelect }: EventRowProps) {
  return (
    <button
      onClick={() => onSelect(event.id)}
      className={cn(
        'w-full text-left px-3 py-2 flex items-center gap-3 transition-colors',
        'hover:bg-white/5 border-b border-white/5',
        isSelected && 'bg-blue-500/10 border-l-2 border-l-blue-500'
      )}
    >
      {/* Timestamp */}
      <span className="text-xs text-gray-500 font-mono shrink-0 w-24">
        {formatTime(event.timestamp)}
      </span>
      
      {/* Event type badge */}
      <span className={getEventTypeClasses(event.type)}>
        {EVENT_TYPE_LABELS[event.type]}
      </span>
      
      {/* Event name */}
      <span className="text-sm text-gray-200 truncate flex-1">
        {event.name}
      </span>
      
      {/* Provider indicator */}
      {event.provider && event.provider !== 'segment' && (
        <span className="text-xs text-gray-600 uppercase tracking-wider">
          {event.provider}
        </span>
      )}
    </button>
  );
}

