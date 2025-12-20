import { useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  InformationCircleIcon,
  Link01Icon,
  UserIcon,
  PuzzleIcon,
} from '@hugeicons/core-free-icons';
import type { SegmentEvent } from '@src/types/segment';
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

  if (subsections.length === 0) {
    return null;
  }

  return (
    <EventDetailSection
      title="Metadata"
      icon={<HugeiconsIcon icon={InformationCircleIcon} size={14} />}
      badge={totalItems}
      defaultExpanded={false}
    >
      <div className="pt-1 space-y-2">
        {subsections.map((subsection) => (
          <div key={subsection.key} className="px-1">
            <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
              {subsection.icon}
              <span className="font-medium uppercase tracking-wide text-[10px]">
                {subsection.title}
              </span>
            </div>
            <div className="border-l border-border ml-2">
              {subsection.entries.map(({ key, value }) => (
                <PropertyRow
                  key={key}
                  label={key}
                  value={value}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </EventDetailSection>
  );
}

