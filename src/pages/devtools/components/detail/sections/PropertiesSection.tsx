import { Tag01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import type { SegmentEvent } from '@src/types';

import { PinnableSection } from '../PinnableSection';

interface PropertiesSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

export function PropertiesSection({
  event,
  searchQuery = '',
}: Readonly<PropertiesSectionProps>) {
  return (
    <PinnableSection
      title="Properties"
      icon={<HugeiconsIcon icon={Tag01Icon} size={14} />}
      pinSection="properties"
      data={event.properties || {}}
      searchQuery={searchQuery}
      emptyMessage="No properties"
      renderWhenEmpty={true}
      sectionKey="properties"
    />
  );
}
