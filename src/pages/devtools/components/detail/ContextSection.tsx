import { useState, useMemo, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Globe02Icon,
  BrowserIcon,
  Settings01Icon,
  Bookmark01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import { EventDetailSection } from './EventDetailSection';
import { PropertyRow } from './PropertyRow';

interface ContextSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

interface ContextSubsection {
  key: string;
  title: string;
  icon: React.ReactNode;
  data: Record<string, unknown>;
}

export function ContextSection({ event, searchQuery = '' }: ContextSectionProps) {
  const context = event.context;
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(
    new Set()
  );

  const toggleSubsection = useCallback((key: string) => {
    setExpandedSubsections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Organize context into subsections
  const subsections = useMemo<ContextSubsection[]>(() => {
    const sections: ContextSubsection[] = [];

    // Page context
    if (context.page && Object.keys(context.page).length > 0) {
      sections.push({
        key: 'page',
        title: 'Page',
        icon: <HugeiconsIcon icon={BrowserIcon} size={12} />,
        data: context.page as Record<string, unknown>,
      });
    }

    // Library context
    if (context.library && Object.keys(context.library).length > 0) {
      sections.push({
        key: 'library',
        title: 'Library',
        icon: <HugeiconsIcon icon={Bookmark01Icon} size={12} />,
        data: context.library as Record<string, unknown>,
      });
    }

    // Other context properties grouped together
    const otherContext: Record<string, unknown> = {};
    const knownKeys = ['page', 'library', 'userAgent', 'userAgentData'];
    
    for (const [key, value] of Object.entries(context)) {
      if (!knownKeys.includes(key) && value !== undefined && value !== null) {
        otherContext[key] = value;
      }
    }

    if (Object.keys(otherContext).length > 0) {
      sections.push({
        key: 'other',
        title: 'Other',
        icon: <HugeiconsIcon icon={Settings01Icon} size={12} />,
        data: otherContext,
      });
    }

    // User Agent (shown as a subsection if present)
    if (context.userAgent || context.userAgentData) {
      const uaData: Record<string, unknown> = {};
      if (context.userAgent) uaData.userAgent = context.userAgent;
      if (context.userAgentData) uaData.userAgentData = context.userAgentData;
      
      sections.push({
        key: 'browser',
        title: 'Browser',
        icon: <HugeiconsIcon icon={Globe02Icon} size={12} />,
        data: uaData,
      });
    }

    return sections;
  }, [context]);

  const totalProperties = useMemo(() => {
    return Object.keys(context).length;
  }, [context]);

  return (
    <EventDetailSection
      title="Context"
      icon={<HugeiconsIcon icon={Globe02Icon} size={14} />}
      badge={totalProperties}
      defaultExpanded={true}
    >
      <div className="pt-1 space-y-2">
        {subsections.map((subsection) => {
          const isExpanded = expandedSubsections.has(subsection.key);
          const propertyCount = Object.keys(subsection.data).length;
          
          return (
            <div key={subsection.key} className="px-1">
              <button
                onClick={() => toggleSubsection(subsection.key)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground',
                  'hover:bg-muted/30 transition-colors rounded',
                  'text-left'
                )}
              >
                <HugeiconsIcon
                  icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
                  size={10}
                  className="shrink-0 text-muted-foreground"
                />
                {subsection.icon}
                <span className="font-medium uppercase tracking-wide text-[10px]">
                  {subsection.title}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground/70 ml-auto">
                  {propertyCount}
                </span>
              </button>
              {isExpanded && (
                <div className="border-l border-border ml-2 mt-0.5">
                  {Object.entries(subsection.data).map(([key, value]) => (
                    <PropertyRow
                      key={key}
                      label={key}
                      value={value}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {subsections.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center italic">
            No context data
          </div>
        )}
      </div>
    </EventDetailSection>
  );
}

