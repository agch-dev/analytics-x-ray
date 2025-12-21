import { useMemo } from 'react';
import type { SegmentEvent } from '@src/types/segment';
import { ThemedJsonView } from '@src/components/ThemedJsonView';
import { PropertiesSection } from './PropertiesSection';
import { TraitsSection } from './TraitsSection';
import { ContextSection } from './ContextSection';
import { MiscSection } from './MiscSection';

type ViewMode = 'json' | 'structured';

interface EventDetailViewProps {
  event: SegmentEvent;
  viewMode: ViewMode;
  searchQuery?: string;
}

export function EventDetailView({
  event,
  viewMode,
  searchQuery = '',
}: EventDetailViewProps) {
  // Get filtered event for JSON view (without rawPayload)
  const displayEvent = useMemo(() => {
    const { rawPayload, ...rest } = event;
    return rest;
  }, [event]);

  return (
    <div className="border-t border-border bg-background/50">
      {/* Content */}
      <div className="px-3 pb-3">
        {viewMode === 'structured' ? (
          <div className="space-y-3 pt-3">
            {/* Show Traits section for identify events */}
            {event.type === 'identify' && (
              <TraitsSection event={event} searchQuery={searchQuery} />
            )}
            {/* Show Properties section only if there are properties */}
            {Object.keys(event.properties).length > 0 && (
              <PropertiesSection event={event} searchQuery={searchQuery} />
            )}
            <ContextSection event={event} searchQuery={searchQuery} />
            <MiscSection event={event} searchQuery={searchQuery} />
          </div>
        ) : (
          <div className="pt-3">
            <ThemedJsonView
              value={displayEvent}
              searchQuery={searchQuery}
              fontSize="12px"
              collapsed={false}
              enableClipboard={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

