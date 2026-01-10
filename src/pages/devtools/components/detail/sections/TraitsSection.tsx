import { HugeiconsIcon } from '@hugeicons/react';
import { UserIcon } from '@hugeicons/core-free-icons';
import type { SegmentEvent } from '@src/types';
import { PinnableSection } from '../PinnableSection';

interface TraitsSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

export function TraitsSection({ event, searchQuery = '' }: TraitsSectionProps) {
  return (
    <PinnableSection
      title="Traits"
      icon={<HugeiconsIcon icon={UserIcon} size={14} />}
      pinSection="traits"
      data={event.traits || {}}
      searchQuery={searchQuery}
      emptyMessage="No traits"
      renderWhenEmpty={true}
      sectionKey="traits"
    />
  );
}
