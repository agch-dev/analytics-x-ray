import { useMemo, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tag01Icon } from '@hugeicons/core-free-icons';
import type { SegmentEvent } from '@src/types/segment';
import { usePinnedProperties, sortWithPinnedFirst } from '@src/hooks/usePinnedProperties';
import { EventDetailSection } from './EventDetailSection';
import { PropertyRow } from './PropertyRow';

interface PropertiesSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

export function PropertiesSection({ event, searchQuery = '' }: PropertiesSectionProps) {
  const properties = event.properties;
  const { isPinned, togglePin, pinnedProperties } = usePinnedProperties({
    section: 'properties',
  });

  const propertyEntries = useMemo(() => {
    const entries = Object.entries(properties)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value }));
    return entries;
  }, [properties]);

  // Separate pinned and unpinned for display
  const { pinned, unpinned } = useMemo(() => {
    return sortWithPinnedFirst(propertyEntries, pinnedProperties);
  }, [propertyEntries, pinnedProperties]);

  // Filter to only pinned entries that exist in current event
  const existingPinnedEntries = useMemo(() => {
    const propsMap = new Map(propertyEntries.map(e => [e.key, e.value]));
    return pinnedProperties
      .filter(key => propsMap.has(key))
      .map(key => ({ key, value: propsMap.get(key) }));
  }, [propertyEntries, pinnedProperties]);

  const handleTogglePin = useCallback((key: string) => {
    togglePin(key);
  }, [togglePin]);

  if (propertyEntries.length === 0) {
    return (
      <EventDetailSection
        title="Properties"
        icon={<HugeiconsIcon icon={Tag01Icon} size={14} />}
        badge={0}
      >
        <div className="px-3 py-4 text-xs text-muted-foreground text-center italic">
          No properties
        </div>
      </EventDetailSection>
    );
  }

  // Pinned content to show when collapsed
  const pinnedContent = existingPinnedEntries.length > 0 ? (
    <div className="pt-1">
      {existingPinnedEntries.map(({ key, value }) => (
        <PropertyRow
          key={key}
          label={key}
          value={value}
          searchQuery={searchQuery}
          isPinned={true}
          onTogglePin={() => handleTogglePin(key)}
          showPinButton={true}
        />
      ))}
    </div>
  ) : null;

  return (
    <EventDetailSection
      title="Properties"
      icon={<HugeiconsIcon icon={Tag01Icon} size={14} />}
      badge={propertyEntries.length}
      pinnedContent={pinnedContent}
      pinnedCount={existingPinnedEntries.length}
    >
      <div className="pt-1">
        {/* Pinned properties first */}
        {pinned.length > 0 && (
          <>
            {pinned.map(({ key, value }) => (
              <PropertyRow
                key={key}
                label={key}
                value={value}
                searchQuery={searchQuery}
                isPinned={true}
                onTogglePin={() => handleTogglePin(key)}
                showPinButton={true}
              />
            ))}
            {/* Separator between pinned and unpinned */}
            {unpinned.length > 0 && (
              <div className="my-2 border-t border-border/50" />
            )}
          </>
        )}
        {/* Unpinned properties */}
        {unpinned.map(({ key, value }) => (
          <PropertyRow
            key={key}
            label={key}
            value={value}
            searchQuery={searchQuery}
            isPinned={false}
            onTogglePin={() => handleTogglePin(key)}
            showPinButton={true}
          />
        ))}
      </div>
    </EventDetailSection>
  );
}

