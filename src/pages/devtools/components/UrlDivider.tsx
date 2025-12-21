import React from 'react';
import { cn } from '@src/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import { Route01Icon, ReloadIcon } from '@hugeicons/core-free-icons';
import { getDisplayPath, getEventDomain, domainsAreDifferent } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';

export interface UrlDividerProps {
  event: SegmentEvent; // The event after which the divider appears
  previousEvent?: SegmentEvent; // The previous event (for comparison)
  isReload: boolean; // Whether this is a page reload
  timestamp: number; // Timestamp of the change/reload
}

export const UrlDivider = React.memo(function UrlDivider({
  event,
  previousEvent,
  isReload,
  timestamp,
}: UrlDividerProps) {
  const currentPath = getDisplayPath(event);
  const currentDomain = getEventDomain(event);
  const previousDomain = previousEvent ? getEventDomain(previousEvent) : null;
  
  // Determine if domain changed
  const domainChanged = previousEvent ? domainsAreDifferent(previousEvent, event) : false;
  
  // Determine what to display
  let displayText: string;
  if (!currentPath) {
    displayText = 'Unknown path';
  } else if (domainChanged && event.context?.page?.url) {
    // Show full URL if domain changed
    displayText = event.context.page.url;
  } else {
    // Show only path if same domain
    displayText = currentPath;
  }
  
  // Choose icon and color based on type
  const Icon = isReload ? ReloadIcon : Route01Icon;
  const iconColor = isReload ? 'text-amber-400' : 'text-blue-400';
  
  // Determine label text
  const labelText = displayText || 'Unknown path';
  
  return (
    <div
      className={cn(
        'w-full border-t border-border/50 bg-card/40 px-4 py-2',
        'flex items-center gap-2 text-xs text-muted-foreground'
      )}
      title={displayText !== labelText ? displayText : undefined}
    >
      <HugeiconsIcon
        icon={Icon}
        size={16}
        className={iconColor}
      />
      <span className="font-mono truncate flex-1" title={displayText}>
        {labelText}
      </span>
      {isReload && currentPath && (
        <span className="text-muted-foreground/70 text-[10px]">(reloaded)</span>
      )}
    </div>
  );
});

