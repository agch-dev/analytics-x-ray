import { useState, useCallback, ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, ArrowDown01Icon, PinIcon } from '@hugeicons/core-free-icons';
import { cn } from '@src/lib/utils';

interface EventDetailSectionProps {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  badge?: string | number;
  children: ReactNode;
  /** Content to show when section is collapsed (for pinned items) */
  pinnedContent?: ReactNode;
  /** Number of pinned items in this section */
  pinnedCount?: number;
}

export function EventDetailSection({
  title,
  icon,
  defaultExpanded = true,
  badge,
  children,
  pinnedContent,
  pinnedCount = 0,
}: EventDetailSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const hasPinnedContent = pinnedCount > 0 && pinnedContent;

  return (
    <div className="border border-border overflow-hidden bg-card/50">
      {/* Header */}
      <button
        onClick={toggleExpand}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2',
          'hover:bg-muted/50 transition-colors',
          'text-left'
        )}
      >
        <HugeiconsIcon
          icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
          size={14}
          className="shrink-0 text-muted-foreground"
        />
        
        {icon && (
          <span className="shrink-0 text-muted-foreground">{icon}</span>
        )}
        
        <span className="text-sm font-medium text-foreground flex-1">
          {title}
        </span>

        {/* Pin indicator when collapsed */}
        {!isExpanded && pinnedCount > 0 && (
          <span className="shrink-0 flex items-center gap-1 text-xs text-amber-500/80">
            <HugeiconsIcon icon={PinIcon} size={10} className="rotate-45" />
            {pinnedCount}
          </span>
        )}
        
        {badge !== undefined && (
          <span className="shrink-0 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </button>

      {/* Pinned content shown when collapsed */}
      {!isExpanded && hasPinnedContent && (
        <div className="px-1 pb-2 border-t border-border/50 bg-neutral-400/5">
          {pinnedContent}
        </div>
      )}

      {/* Full content shown when expanded */}
      {isExpanded && (
        <div className="px-1 pb-2 border-t border-border bg-background/30">
          {children}
        </div>
      )}
    </div>
  );
}

