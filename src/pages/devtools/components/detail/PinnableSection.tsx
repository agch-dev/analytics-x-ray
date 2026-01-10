import { useMemo, useCallback, ReactNode } from 'react';

import { usePinnedProperties, type PinSection } from '@src/hooks';
import { useConfigStore } from '@src/stores';

import { EventDetailSection } from './EventDetailSection';
import {
  PropertyList,
  PinnedPropertyList,
  type PropertyEntry,
} from './primitives';

interface PinnableSectionProps {
  /** Section title */
  title: string;
  /** Section icon */
  icon: ReactNode;
  /** The pin section type for the store */
  pinSection: PinSection;
  /** Raw data object to display */
  data: Record<string, unknown>;
  /** Search query for highlighting */
  searchQuery?: string;
  /** Message to show when data is empty */
  emptyMessage?: string;
  /** Whether to render at all when empty (false = don't render) */
  renderWhenEmpty?: boolean;
  /** Section key for configuration */
  sectionKey?: 'properties' | 'traits';
}

/**
 * A reusable section component for displaying pinnable properties.
 * Used by PropertiesSection and TraitsSection which share the same pattern.
 */
export function PinnableSection({
  title,
  icon,
  pinSection,
  data,
  searchQuery = '',
  emptyMessage = `No ${title.toLowerCase()}`,
  renderWhenEmpty = true,
  sectionKey,
}: PinnableSectionProps) {
  const { togglePin, pinnedProperties } = usePinnedProperties({
    section: pinSection,
  });

  const sectionDefaults = useConfigStore((state) => state.sectionDefaults);

  // Get default expanded state from config if sectionKey is provided
  const defaultExpanded = sectionKey
    ? sectionDefaults.sections[sectionKey]
    : true;

  // Convert data object to sorted entries
  const entries = useMemo<PropertyEntry[]>(() => {
    return Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value }));
  }, [data]);

  // Filter to only pinned entries that exist in current data
  const existingPinnedEntries = useMemo(() => {
    const dataMap = new Map(entries.map((e) => [e.key, e.value]));
    return pinnedProperties
      .filter((key) => dataMap.has(key))
      .map((key) => ({ key, value: dataMap.get(key) }));
  }, [entries, pinnedProperties]);

  const handleTogglePin = useCallback(
    (key: string) => {
      togglePin(key);
    },
    [togglePin]
  );

  // Don't render if empty and renderWhenEmpty is false
  if (entries.length === 0 && !renderWhenEmpty) {
    return null;
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <EventDetailSection title={title} icon={icon} badge={0}>
        <div className="px-3 py-4 text-xs text-muted-foreground text-center italic">
          {emptyMessage}
        </div>
      </EventDetailSection>
    );
  }

  // Pinned content to show when collapsed
  const pinnedContent =
    existingPinnedEntries.length > 0 ? (
      <PinnedPropertyList
        entries={existingPinnedEntries}
        searchQuery={searchQuery}
        onTogglePin={handleTogglePin}
      />
    ) : null;

  return (
    <EventDetailSection
      title={title}
      icon={icon}
      badge={entries.length}
      pinnedContent={pinnedContent}
      pinnedCount={existingPinnedEntries.length}
      defaultExpanded={defaultExpanded}
      sectionKey={sectionKey}
      hasSubsections={false}
    >
      <PropertyList
        entries={entries}
        pinnedProperties={pinnedProperties}
        searchQuery={searchQuery}
        onTogglePin={handleTogglePin}
        showPinButtons={true}
      />
    </EventDetailSection>
  );
}
