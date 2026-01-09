import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Copy01Icon,
  Tick01Icon,
  PinIcon,
  CodeIcon,
  TextIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@src/lib';
import type { PropertyActionsProps } from './types';

/**
 * PropertyActions component - Renders action buttons (pin, copy, view toggle)
 * Handles all interactive actions for a property row
 * 
 * Note: Pin button is rendered separately in PropertyRow for layout reasons
 */
export const PropertyActions = React.memo(function PropertyActions({
  copied,
  onCopy,
  showJsonViewToggle = false,
  useJsonView = false,
  onToggleJsonView,
}: Omit<PropertyActionsProps, 'isPinned' | 'showPinButton' | 'onTogglePin'>) {
  return (
    <>
      {/* View mode toggle for arrays */}
      {showJsonViewToggle && onToggleJsonView && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleJsonView();
          }}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
          title={useJsonView ? 'Switch to structured view' : 'Switch to JSON view'}
          aria-label={useJsonView ? 'Switch to structured view' : 'Switch to JSON view'}
          aria-pressed={useJsonView}
        >
          <HugeiconsIcon
            icon={useJsonView ? TextIcon : CodeIcon}
            size={12}
            className="text-muted-foreground hover:text-blue-500"
          />
        </button>
      )}

      {/* Copy button */}
      <button
        onClick={onCopy}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
        title="Copy value"
        aria-label={copied ? 'Value copied to clipboard' : 'Copy value to clipboard'}
      >
        <HugeiconsIcon
          icon={copied ? Tick01Icon : Copy01Icon}
          size={12}
          className={copied ? 'text-green-500' : 'text-muted-foreground'}
        />
      </button>
    </>
  );
});
