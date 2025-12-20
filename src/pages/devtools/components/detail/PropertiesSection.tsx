import { useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tag01Icon } from '@hugeicons/core-free-icons';
import type { SegmentEvent } from '@src/types/segment';
import { EventDetailSection } from './EventDetailSection';
import { PropertyRow } from './PropertyRow';

interface PropertiesSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

export function PropertiesSection({ event, searchQuery = '' }: PropertiesSectionProps) {
  const properties = event.properties;
  const propertyEntries = useMemo(() => {
    return Object.entries(properties).sort(([a], [b]) => a.localeCompare(b));
  }, [properties]);

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

  return (
    <EventDetailSection
      title="Properties"
      icon={<HugeiconsIcon icon={Tag01Icon} size={14} />}
      badge={propertyEntries.length}
    >
      <div className="pt-1">
        {propertyEntries.map(([key, value]) => (
          <PropertyRow
            key={key}
            label={key}
            value={value}
            searchQuery={searchQuery}
          />
        ))}
      </div>
    </EventDetailSection>
  );
}

