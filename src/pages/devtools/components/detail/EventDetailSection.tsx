import { useState, useCallback, ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@src/lib/utils';

interface EventDetailSectionProps {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  badge?: string | number;
  children: ReactNode;
}

export function EventDetailSection({
  title,
  icon,
  defaultExpanded = true,
  badge,
  children,
}: EventDetailSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card/50">
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
        
        {badge !== undefined && (
          <span className="shrink-0 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-1 pb-2 border-t border-border bg-background/30">
          {children}
        </div>
      )}
    </div>
  );
}

