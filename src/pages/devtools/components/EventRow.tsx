import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { cn } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import { EventRowHeader } from './EventRowHeader';

interface EventRowProps {
  event: SegmentEvent;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

export function EventRow({ 
  event, 
  isSelected, 
  isExpanded,
  onSelect, 
  onToggleExpand 
}: EventRowProps) {
  return (
    <div
      className={cn(
        'w-full border-b border-border transition-colors',
        isSelected && 'bg-blue-500/10 dark:bg-blue-500/10 border-l-2 border-l-blue-500'
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
          onToggleExpand={onToggleExpand}
        />
      </button>

      {/* Expanded JSON view */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border bg-background/50">
          <JsonView
            value={event}
            style={{
              ...darkTheme,
              backgroundColor: 'transparent',
              fontSize: '12px',
            }}
            collapsed={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={true}
          />
        </div>
      )}
    </div>
  );
}

