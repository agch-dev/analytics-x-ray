import { useMemo, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { UserIcon } from '@hugeicons/core-free-icons';
import type { SegmentEvent } from '@src/types/segment';
import { usePinnedProperties, sortWithPinnedFirst } from '@src/hooks/usePinnedProperties';
import { EventDetailSection } from './EventDetailSection';
import { PropertyRow } from './PropertyRow';

interface TraitsSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

export function TraitsSection({ event, searchQuery = '' }: TraitsSectionProps) {
  const traits = event.traits || {};
  const { isPinned, togglePin, pinnedProperties } = usePinnedProperties({
    section: 'traits',
  });

  const traitEntries = useMemo(() => {
    const entries = Object.entries(traits)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value }));
    return entries;
  }, [traits]);

  // Separate pinned and unpinned for display
  const { pinned, unpinned } = useMemo(() => {
    return sortWithPinnedFirst(traitEntries, pinnedProperties);
  }, [traitEntries, pinnedProperties]);

  // Filter to only pinned entries that exist in current event
  const existingPinnedEntries = useMemo(() => {
    const traitsMap = new Map(traitEntries.map(e => [e.key, e.value]));
    return pinnedProperties
      .filter(key => traitsMap.has(key))
      .map(key => ({ key, value: traitsMap.get(key) }));
  }, [traitEntries, pinnedProperties]);

  const handleTogglePin = useCallback((key: string) => {
    togglePin(key);
  }, [togglePin]);

  if (traitEntries.length === 0) {
    return (
      <EventDetailSection
        title="Traits"
        icon={<HugeiconsIcon icon={UserIcon} size={14} />}
        badge={0}
      >
        <div className="px-3 py-4 text-xs text-muted-foreground text-center italic">
          No traits
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
      title="Traits"
      icon={<HugeiconsIcon icon={UserIcon} size={14} />}
      badge={traitEntries.length}
      pinnedContent={pinnedContent}
      pinnedCount={existingPinnedEntries.length}
    >
      <div className="pt-1">
        {/* Pinned traits first */}
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
        {/* Unpinned traits */}
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

