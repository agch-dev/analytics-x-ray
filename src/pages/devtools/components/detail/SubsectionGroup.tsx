import { useState, useMemo, useCallback, ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { PinIcon } from '@hugeicons/core-free-icons';
import { useConfigStore } from '@src/stores/configStore';
import type { PinSection, PinSubsection } from '@src/hooks';
import { EventDetailSection } from './EventDetailSection';
import {
  CollapsibleSubsection,
  SubsectionHeader,
  PropertyRow,
  type PropertyEntry,
} from './primitives';

export interface SubsectionDefinition {
  /** Unique key for this subsection */
  key: string;
  /** Display title */
  title: string;
  /** Icon element */
  icon: ReactNode;
  /** Property entries for this subsection */
  entries: PropertyEntry[];
}

interface SubsectionGroupProps {
  /** Section title */
  title: string;
  /** Section icon */
  icon: ReactNode;
  /** Pin section type (context or metadata) */
  pinSection: 'context' | 'metadata';
  /** Array of subsection definitions */
  subsections: SubsectionDefinition[];
  /** Search query for highlighting */
  searchQuery?: string;
  /** Whether the section should be expanded by default */
  defaultExpanded?: boolean;
  /** Message to show when there are no subsections */
  emptyMessage?: string;
}

interface SubsectionWithPinInfo extends SubsectionDefinition {
  pinnedKeys: string[];
  hasPinnedProperties: boolean;
}

/**
 * A section component that displays grouped subsections with pinning support.
 * Used by ContextSection and MiscSection which share this pattern.
 */
export function SubsectionGroup({
  title,
  icon,
  pinSection,
  subsections,
  searchQuery = '',
  defaultExpanded = true,
  emptyMessage = 'No data',
}: SubsectionGroupProps) {
  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(
    new Set()
  );

  // Get pin functions from store
  const togglePin = useConfigStore((state) => state.togglePin);
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

  const handleTogglePin = useCallback(
    (subsectionKey: string, propertyKey: string) => {
      togglePin(pinSection, subsectionKey as PinSubsection, propertyKey);
    },
    [togglePin, pinSection]
  );

  const getSubsectionPinnedProperties = useCallback(
    (subsectionKey: string): string[] => {
      const profile = pinnedPropertiesConfig['default'];
      if (!profile) return [];
      
      if (pinSection === 'context') {
        const contextKey = subsectionKey as keyof typeof profile.context;
        return profile.context[contextKey] ?? [];
      }
      if (pinSection === 'metadata') {
        const metadataKey = subsectionKey as keyof typeof profile.metadata;
        return profile.metadata[metadataKey] ?? [];
      }
      return [];
    },
    [pinnedPropertiesConfig, pinSection]
  );

  // Calculate pinned info for each subsection
  const subsectionsWithPinInfo = useMemo<SubsectionWithPinInfo[]>(() => {
    return subsections.map((subsection) => {
      const pinnedProps = getSubsectionPinnedProperties(subsection.key);
      const entryKeys = subsection.entries.map((e) => e.key);
      const existingPinnedKeys = pinnedProps.filter((key) => entryKeys.includes(key));
      return {
        ...subsection,
        pinnedKeys: existingPinnedKeys,
        hasPinnedProperties: existingPinnedKeys.length > 0,
      };
    });
  }, [subsections, getSubsectionPinnedProperties]);

  // Total property count
  const totalProperties = useMemo(() => {
    return subsections.reduce((acc, sub) => acc + sub.entries.length, 0);
  }, [subsections]);

  // Total pinned count across all subsections
  const totalPinnedCount = useMemo(() => {
    return subsectionsWithPinInfo.reduce((acc, sub) => acc + sub.pinnedKeys.length, 0);
  }, [subsectionsWithPinInfo]);

  // Subsections that have pinned properties (for collapsed view)
  const subsectionsWithPins = useMemo(() => {
    return subsectionsWithPinInfo.filter((sub) => sub.hasPinnedProperties);
  }, [subsectionsWithPinInfo]);

  // Don't render if no subsections
  if (subsections.length === 0) {
    return null;
  }

  // Pinned content to show when section is collapsed
  const pinnedContent =
    subsectionsWithPins.length > 0 ? (
      <div className="pt-1 space-y-2">
        {subsectionsWithPins.map((subsection) => {
          const pinnedEntries = subsection.entries.filter((e) =>
            subsection.pinnedKeys.includes(e.key)
          );
          return (
            <div key={subsection.key} className="px-1">
              <SubsectionHeader
                title={subsection.title}
                icon={subsection.icon}
                pinnedCount={subsection.pinnedKeys.length}
              />
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
      title={title}
      icon={icon}
      badge={totalProperties}
      defaultExpanded={defaultExpanded}
      pinnedContent={pinnedContent}
      pinnedCount={totalPinnedCount}
    >
      <div className="pt-1 space-y-2">
        {subsectionsWithPinInfo.map((subsection) => (
          <CollapsibleSubsection
            key={subsection.key}
            subsectionKey={subsection.key}
            title={subsection.title}
            icon={subsection.icon}
            entries={subsection.entries}
            pinnedKeys={subsection.pinnedKeys}
            isExpanded={expandedSubsections.has(subsection.key)}
            onToggleExpand={() => toggleSubsection(subsection.key)}
            onTogglePin={(propertyKey) =>
              handleTogglePin(subsection.key, propertyKey)
            }
            searchQuery={searchQuery}
          />
        ))}

        {subsections.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center italic">
            {emptyMessage}
          </div>
        )}
      </div>
    </EventDetailSection>
  );
}

