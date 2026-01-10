import { useState, useMemo, useCallback, type ReactNode } from 'react';

import type { PinSubsection } from '@src/hooks';
import { useConfigStore } from '@src/stores';
import type { SegmentEvent } from '@src/types';

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
  /** Array of subsection keys that should be expanded by default */
  defaultExpandedSubsections?: string[];
  /** Message to show when there are no subsections */
  emptyMessage?: string;
  /** Section key for configuration */
  sectionKey?: 'context' | 'metadata';
  /** Event for checking special defaults */
  event?: SegmentEvent;
}

interface SubsectionWithPinInfo extends SubsectionDefinition {
  pinnedKeys: string[];
  hasPinnedProperties: boolean;
}

/**
 * A section component that displays grouped subsections with pinning support.
 * Used by ContextSection and MiscSection which share this pattern.
 */
/**
 * Maps subsection keys to their prefixed config keys
 * Handles special case where 'metadata' subsection key maps to 'metadataCaptureInfo' in config
 */
function getPrefixedSubsectionKey(
  sectionKey: 'context' | 'metadata',
  subsectionKey: string
): string {
  // Special case: 'metadata' subsection key maps to 'metadataCaptureInfo' in config
  if (sectionKey === 'metadata' && subsectionKey === 'metadata') {
    return 'metadataCaptureInfo';
  }
  return `${sectionKey}${subsectionKey.charAt(0).toUpperCase()}${subsectionKey.slice(1)}`;
}

export function SubsectionGroup({
  title,
  icon,
  pinSection,
  subsections,
  searchQuery = '',
  defaultExpanded: propDefaultExpanded,
  defaultExpandedSubsections: propDefaultExpandedSubsections = [],
  emptyMessage = 'No data',
  sectionKey,
  event,
}: SubsectionGroupProps) {
  const sectionDefaults = useConfigStore((state) => state.sectionDefaults);

  // Get section default from config if sectionKey is provided
  const configDefaultExpanded = sectionKey
    ? sectionDefaults.sections[sectionKey]
    : (propDefaultExpanded ?? true);

  // Get subsection defaults from config and map prefixed keys to unprefixed
  const configDefaultExpandedSubsections = useMemo(() => {
    if (!sectionKey) return [];

    const configSubsections = sectionDefaults.subsections[sectionKey];
    const expanded: string[] = [];

    for (const subsection of subsections) {
      const prefixedKey = getPrefixedSubsectionKey(sectionKey, subsection.key);
      const isExpanded =
        configSubsections[prefixedKey as keyof typeof configSubsections] ??
        false;
      if (isExpanded) {
        expanded.push(subsection.key);
      }
    }

    return expanded;
  }, [sectionDefaults.subsections, sectionKey, subsections]);

  // Merge config defaults with prop defaults
  const mergedDefaultExpandedSubsections = useMemo(() => {
    const merged = new Set([
      ...configDefaultExpandedSubsections,
      ...propDefaultExpandedSubsections,
    ]);
    return Array.from(merged);
  }, [configDefaultExpandedSubsections, propDefaultExpandedSubsections]);

  // Compute final defaultExpanded value considering special defaults
  const defaultExpanded = useMemo(() => {
    // Start with config default
    let expanded = configDefaultExpanded;

    // Check special defaults that might override
    if (sectionKey === 'context' && event) {
      if (
        event.type === 'page' &&
        sectionDefaults.specialDefaults.contextPageAlwaysOpenForPageEvents
      ) {
        expanded = true;
      }
    }

    if (sectionKey === 'metadata' && event) {
      if (
        (event.type === 'identify' ||
          event.type === 'group' ||
          event.type === 'alias') &&
        sectionDefaults.specialDefaults
          .metadataIdentifiersAlwaysOpenForIdentityEvents
      ) {
        expanded = true;
      }
    }

    return expanded;
  }, [
    configDefaultExpanded,
    sectionKey,
    event,
    sectionDefaults.specialDefaults,
  ]);

  // Handle special defaults
  const finalDefaultExpandedSubsections = useMemo(() => {
    const final = new Set(mergedDefaultExpandedSubsections);

    if (sectionKey === 'context' && event) {
      // Check if it's a page event and special default is enabled
      if (
        event.type === 'page' &&
        sectionDefaults.specialDefaults.contextPageAlwaysOpenForPageEvents
      ) {
        final.add('page');
      }
    }

    if (sectionKey === 'metadata' && event) {
      // Check if it's an identify/alias/group event and special default is enabled
      if (
        (event.type === 'identify' ||
          event.type === 'group' ||
          event.type === 'alias') &&
        sectionDefaults.specialDefaults
          .metadataIdentifiersAlwaysOpenForIdentityEvents
      ) {
        final.add('identifiers');
      }
    }

    return Array.from(final);
  }, [
    mergedDefaultExpandedSubsections,
    sectionKey,
    event,
    sectionDefaults.specialDefaults,
  ]);

  const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(
    () => new Set(finalDefaultExpandedSubsections)
  );

  // Get pin functions from store
  const togglePin = useConfigStore((state) => state.togglePin);
  const pinnedPropertiesConfig = useConfigStore(
    (state) => state.pinnedProperties
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
      const existingPinnedKeys = pinnedProps.filter((key) =>
        entryKeys.includes(key)
      );
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
    return subsectionsWithPinInfo.reduce(
      (acc, sub) => acc + sub.pinnedKeys.length,
      0
    );
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
      <div className="space-y-2 pt-1">
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
              <div className="mt-0.5 ml-2 border-l border-amber-500/30">
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
      sectionKey={sectionKey}
      hasSubsections={true}
      subsections={subsections}
    >
      <div className="space-y-2 pt-1">
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
          <div
            className={`
              px-3 py-4 text-center text-xs text-muted-foreground italic
            `}
          >
            {emptyMessage}
          </div>
        )}
      </div>
    </EventDetailSection>
  );
}
