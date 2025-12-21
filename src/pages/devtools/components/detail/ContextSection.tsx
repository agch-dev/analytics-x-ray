import { useState, useMemo, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Globe02Icon,
  BrowserIcon,
  Settings01Icon,
  Bookmark01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  PinIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import { useConfigStore } from '@src/stores/configStore';
import { sortWithPinnedFirst, type ContextSubsection as ContextSubsectionType } from '@src/hooks/usePinnedProperties';
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

  // Get pin functions from store
  const togglePin = useConfigStore((state) => state.togglePin);
  const isPinned = useConfigStore((state) => state.isPinned);
  
  // Subscribe to pinned properties changes
  const pinnedPropertiesConfig = useConfigStore((state) => state.pinnedProperties);

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

  const handleTogglePin = useCallback((subsectionKey: string, propertyKey: string) => {
    togglePin('context', subsectionKey as ContextSubsectionType, propertyKey);
  }, [togglePin]);

  const checkIsPinned = useCallback((subsectionKey: string, propertyKey: string) => {
    return isPinned('context', subsectionKey as ContextSubsectionType, propertyKey);
  }, [isPinned]);

  const getSubsectionPinnedProperties = useCallback((subsectionKey: string) => {
    const profile = pinnedPropertiesConfig['default'];
    if (!profile) return [];
    const contextKey = subsectionKey as ContextSubsectionType;
    return profile.context[contextKey] ?? [];
  }, [pinnedPropertiesConfig]);

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

  // Calculate pinned info for each subsection
  const subsectionsWithPinInfo = useMemo(() => {
    return subsections.map((subsection) => {
      const pinnedProps = getSubsectionPinnedProperties(subsection.key);
      const dataKeys = Object.keys(subsection.data);
      const existingPinnedKeys = pinnedProps.filter(key => dataKeys.includes(key));
      return {
        ...subsection,
        pinnedKeys: existingPinnedKeys,
        hasPinnedProperties: existingPinnedKeys.length > 0,
      };
    });
  }, [subsections, getSubsectionPinnedProperties]);

  // Total pinned count across all subsections
  const totalPinnedCount = useMemo(() => {
    return subsectionsWithPinInfo.reduce((acc, sub) => acc + sub.pinnedKeys.length, 0);
  }, [subsectionsWithPinInfo]);

  // Subsections that have pinned properties (for collapsed view)
  const subsectionsWithPins = useMemo(() => {
    return subsectionsWithPinInfo.filter(sub => sub.hasPinnedProperties);
  }, [subsectionsWithPinInfo]);

  // Pinned content to show when section is collapsed
  const pinnedContent = subsectionsWithPins.length > 0 ? (
    <div className="pt-1 space-y-2">
      {subsectionsWithPins.map((subsection) => (
        <div key={subsection.key} className="px-1">
          <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
            {subsection.icon}
            <span className="font-medium uppercase tracking-wide text-[10px]">
              {subsection.title}
            </span>
            <span className="flex items-center gap-1 text-amber-500/80 ml-auto">
              <HugeiconsIcon icon={PinIcon} size={8} className="rotate-45" />
              {subsection.pinnedKeys.length}
            </span>
          </div>
          <div className="border-l border-amber-500/30 ml-2 mt-0.5">
            {subsection.pinnedKeys.map((key) => (
              <PropertyRow
                key={key}
                label={key}
                value={subsection.data[key]}
                searchQuery={searchQuery}
                isPinned={true}
                onTogglePin={() => handleTogglePin(subsection.key, key)}
                showPinButton={true}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <EventDetailSection
      title="Context"
      icon={<HugeiconsIcon icon={Globe02Icon} size={14} />}
      badge={totalProperties}
      defaultExpanded={true}
      pinnedContent={pinnedContent}
      pinnedCount={totalPinnedCount}
    >
      <div className="pt-1 space-y-2">
        {subsectionsWithPinInfo.map((subsection) => {
          const isExpanded = expandedSubsections.has(subsection.key);
          const propertyCount = Object.keys(subsection.data).length;
          const pinnedProps = subsection.pinnedKeys;
          
          // Sort entries: pinned first
          const entries = Object.entries(subsection.data).map(([key, value]) => ({ key, value }));
          const { pinned, unpinned } = sortWithPinnedFirst(entries, pinnedProps);
          
          return (
            <div key={subsection.key} className="px-1">
              <button
                onClick={() => toggleSubsection(subsection.key)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground',
                  'hover:bg-muted/30 transition-colors',
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
                {/* Pin indicator for subsection */}
                {pinnedProps.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-500/80">
                    <HugeiconsIcon icon={PinIcon} size={8} className="rotate-45" />
                    {pinnedProps.length}
                  </span>
                )}
                <span className="shrink-0 text-[10px] text-muted-foreground/70 ml-auto">
                  {propertyCount}
                </span>
              </button>
              {isExpanded && (
                <div className="border-l border-border ml-2 mt-0.5">
                  {/* Pinned properties first */}
                  {pinned.map(({ key, value }) => (
                    <PropertyRow
                      key={key}
                      label={key}
                      value={value}
                      searchQuery={searchQuery}
                      isPinned={true}
                      onTogglePin={() => handleTogglePin(subsection.key, key)}
                      showPinButton={true}
                    />
                  ))}
                  {/* Separator if there are both pinned and unpinned */}
                  {pinned.length > 0 && unpinned.length > 0 && (
                    <div className="my-1 mx-2 border-t border-border/50" />
                  )}
                  {/* Unpinned properties */}
                  {unpinned.map(({ key, value }) => (
                    <PropertyRow
                      key={key}
                      label={key}
                      value={value}
                      searchQuery={searchQuery}
                      isPinned={false}
                      onTogglePin={() => handleTogglePin(subsection.key, key)}
                      showPinButton={true}
                    />
                  ))}
                </div>
              )}
              {/* Show pinned properties when subsection is collapsed */}
              {!isExpanded && pinnedProps.length > 0 && (
                <div className="border-l border-amber-500/30 ml-2 mt-0.5 bg-neutral-400/5">
                  {pinned.map(({ key, value }) => (
                    <PropertyRow
                      key={key}
                      label={key}
                      value={value}
                      searchQuery={searchQuery}
                      isPinned={true}
                      onTogglePin={() => handleTogglePin(subsection.key, key)}
                      showPinButton={true}
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

