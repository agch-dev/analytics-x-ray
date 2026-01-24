import { ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react';

/**
 * ExpandButton component - Renders the expand/collapse button for nested objects
 * Only shown for expandable values (objects or arrays)
 */
export const ExpandButton = React.memo(function ExpandButton({
  expandable,
  isExpanded,
  label,
  onToggle,
}: Readonly<{
  expandable: boolean;
  isExpanded: boolean;
  label: string;
  onToggle: () => void;
}>) {
  if (!expandable) {
    return <span className="w-4 shrink-0" />;
  }

  return (
    <button
      onClick={onToggle}
      className={`
        mt-0.5 shrink-0 rounded p-0.5
        hover:bg-muted
      `}
      aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
      aria-expanded={isExpanded}
    >
      <HugeiconsIcon
        icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
        size={12}
        className="text-muted-foreground"
      />
    </button>
  );
});
