import { useState, useMemo, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  InformationCircleIcon,
  Link01Icon,
  UserIcon,
  PuzzleIcon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  PinIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import { useConfigStore } from '@src/stores/configStore';
import { sortWithPinnedFirst, type MetadataSubsection as MetadataSubsectionType } from '@src/hooks/usePinnedProperties';
import { EventDetailSection } from './EventDetailSection';
import { PropertyRow } from './PropertyRow';

interface MiscSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

interface MiscSubsection {
  key: string;
  title: string;
  icon: React.ReactNode;
  entries: Array<{ key: string; value: unknown }>;
}

export function MiscSection({ event, searchQuery = '' }: MiscSectionProps) {
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
    togglePin('metadata', subsectionKey as MetadataSubsectionType, propertyKey);
  }, [togglePin]);

  const checkIsPinned = useCallback((subsectionKey: string, propertyKey: string) => {
    return isPinned('metadata', subsectionKey as MetadataSubsectionType, propertyKey);
  }, [isPinned]);

  const getSubsectionPinnedProperties = useCallback((subsectionKey: string) => {
    const profile = pinnedPropertiesConfig['default'];
    if (!profile) return [];
    const metadataKey = subsectionKey as MetadataSubsectionType;
    return profile.metadata[metadataKey] ?? [];
  }, [pinnedPropertiesConfig]);

  const subsections = useMemo<MiscSubsection[]>(() => {
    const sections: MiscSubsection[] = [];

    // Identifiers section
    const identifiers: Array<{ key: string; value: unknown }> = [];
    if (event.id) identifiers.push({ key: 'id', value: event.id });
    if (event.messageId) identifiers.push({ key: 'messageId', value: event.messageId });
    if (event.anonymousId) identifiers.push({ key: 'anonymousId', value: event.anonymousId });
    if (event.userId) identifiers.push({ key: 'userId', value: event.userId });

    if (identifiers.length > 0) {
      sections.push({
        key: 'identifiers',
        title: 'Identifiers',
        icon: <HugeiconsIcon icon={UserIcon} size={12} />,
        entries: identifiers,
      });
    }

    // Capture metadata
    const metadata: Array<{ key: string; value: unknown }> = [];
    if (event.tabId) metadata.push({ key: 'tabId', value: event.tabId });
    if (event.url) metadata.push({ key: 'captureUrl', value: event.url });
    if (event.capturedAt) {
      metadata.push({
        key: 'capturedAt',
        value: new Date(event.capturedAt).toISOString(),
      });
    }
    if (event.provider) metadata.push({ key: 'provider', value: event.provider });

    if (metadata.length > 0) {
      sections.push({
        key: 'metadata',
        title: 'Capture Info',
        icon: <HugeiconsIcon icon={Link01Icon} size={12} />,
        entries: metadata,
      });
    }

    // Integrations
    if (event.integrations && Object.keys(event.integrations).length > 0) {
      const integrationEntries = Object.entries(event.integrations)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => ({ key, value }));

      sections.push({
        key: 'integrations',
        title: 'Integrations',
        icon: <HugeiconsIcon icon={PuzzleIcon} size={12} />,
        entries: integrationEntries,
      });
    }

    return sections;
  }, [event]);

  const totalItems = useMemo(() => {
    return subsections.reduce((acc, section) => acc + section.entries.length, 0);
  }, [subsections]);

  // Calculate pinned info for each subsection
  const subsectionsWithPinInfo = useMemo(() => {
    return subsections.map((subsection) => {
      const pinnedProps = getSubsectionPinnedProperties(subsection.key);
      const entryKeys = subsection.entries.map(e => e.key);
      const existingPinnedKeys = pinnedProps.filter(key => entryKeys.includes(key));
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

  if (subsections.length === 0) {
    return null;
  }

  // Pinned content to show when section is collapsed
  const pinnedContent = subsectionsWithPins.length > 0 ? (
    <div className="pt-1 space-y-2">
      {subsectionsWithPins.map((subsection) => {
        const pinnedEntries = subsection.entries.filter(e => subsection.pinnedKeys.includes(e.key));
        return (
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
              {pinnedEntries.map(({ key, value }) => (
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
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <EventDetailSection
      title="Metadata"
      icon={<HugeiconsIcon icon={InformationCircleIcon} size={14} />}
      badge={totalItems}
      defaultExpanded={true}
      pinnedContent={pinnedContent}
      pinnedCount={totalPinnedCount}
    >
      <div className="pt-1 space-y-2">
        {subsectionsWithPinInfo.map((subsection) => {
          const isExpanded = expandedSubsections.has(subsection.key);
          const entryCount = subsection.entries.length;
          const pinnedProps = subsection.pinnedKeys;
          
          // Sort entries: pinned first
          const { pinned, unpinned } = sortWithPinnedFirst(subsection.entries, pinnedProps);
          
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
                {/* Pin indicator for subsection */}
                {pinnedProps.length > 0 && (
                  <span className="flex items-center gap-1 text-amber-500/80">
                    <HugeiconsIcon icon={PinIcon} size={8} className="rotate-45" />
                    {pinnedProps.length}
                  </span>
                )}
                <span className="shrink-0 text-[10px] text-muted-foreground/70 ml-auto">
                  {entryCount}
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
      </div>
    </EventDetailSection>
  );
}

