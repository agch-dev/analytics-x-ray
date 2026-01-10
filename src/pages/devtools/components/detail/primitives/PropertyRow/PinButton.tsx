import { PinIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react';

import { cn } from '@src/lib';

/**
 * PinButton component - Renders the pin button for a property
 * Only shown for first-level properties that can be pinned
 */
export const PinButton = React.memo(function PinButton({
  canPin,
  isPinned,
  label,
  onTogglePin,
}: Readonly<{
  canPin: boolean;
  isPinned: boolean;
  label: string;
  onTogglePin?: () => void;
}>) {
  if (!canPin) {
    return <span className="w-5 shrink-0" />;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTogglePin?.();
      }}
      className={cn(
        `
          shrink-0 rounded p-0.5 transition-all
          hover:bg-muted
        `,
        isPinned
          ? 'text-amber-500 opacity-100'
          : `
            text-muted-foreground opacity-0
            group-hover:opacity-100
            hover:text-amber-500
          `
      )}
      title={isPinned ? 'Unpin property' : 'Pin property'}
      aria-label={
        isPinned ? `Unpin ${label} property` : `Pin ${label} property`
      }
      aria-pressed={isPinned}
    >
      <HugeiconsIcon
        icon={PinIcon}
        size={12}
        className={cn('transition-transform', isPinned && 'rotate-45')}
      />
    </button>
  );
});
