import { HugeiconsIcon } from '@hugeicons/react';
import { Analytics01Icon } from '@hugeicons/core-free-icons';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
      <div className="mb-4 opacity-20">
        <HugeiconsIcon icon={Analytics01Icon} size={48} className="text-current" />
      </div>
      <p className="text-sm">No events captured yet</p>
      <p className="text-xs mt-1 opacity-60">
        Navigate to a page with Segment analytics to see events
      </p>
    </div>
  );
}

