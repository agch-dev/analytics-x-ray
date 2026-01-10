import {
  InformationCircleIcon,
  Link01Icon,
  UserIcon,
  PuzzleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo } from 'react';

import { useConfigStore } from '@src/stores';
import type { SegmentEvent } from '@src/types';

import { SubsectionGroup, type SubsectionDefinition } from '../SubsectionGroup';

interface MiscSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

export function MiscSection({
  event,
  searchQuery = '',
}: Readonly<MiscSectionProps>) {
  const sectionDefaults = useConfigStore((state) => state.sectionDefaults);
  const subsections = useMemo<SubsectionDefinition[]>(() => {
    const sections: SubsectionDefinition[] = [];

    // Identifiers section
    const identifiers: Array<{ key: string; value: unknown }> = [];
    if (event.id) identifiers.push({ key: 'id', value: event.id });
    if (event.messageId)
      identifiers.push({ key: 'messageId', value: event.messageId });
    if (event.anonymousId)
      identifiers.push({ key: 'anonymousId', value: event.anonymousId });
    if (event.userId) identifiers.push({ key: 'userId', value: event.userId });
    if (event.groupId)
      identifiers.push({ key: 'groupId', value: event.groupId });

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
    if (event.provider)
      metadata.push({ key: 'provider', value: event.provider });

    if (metadata.length > 0) {
      sections.push({
        key: 'metadata',
        title: 'Capture Info',
        icon: <HugeiconsIcon icon={Link01Icon} size={12} />,
        entries: metadata,
      });
    }

    // Integrations
    if (
      event.integrations &&
      typeof event.integrations === 'object' &&
      !Array.isArray(event.integrations) &&
      Object.keys(event.integrations).length > 0
    ) {
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

  // Get default expanded subsections from config (map prefixed keys to unprefixed)
  const defaultExpandedSubsections = useMemo(() => {
    const configSubsections = sectionDefaults.subsections.metadata;
    const expanded: string[] = [];

    for (const subsection of subsections) {
      // Special case: 'metadata' subsection key maps to 'metadataCaptureInfo' in config
      let prefixedKey: string;
      if (subsection.key === 'metadata') {
        prefixedKey = 'metadataCaptureInfo';
      } else {
        prefixedKey = `metadata${subsection.key.charAt(0).toUpperCase()}${subsection.key.slice(1)}`;
      }
      const isExpanded =
        configSubsections[prefixedKey as keyof typeof configSubsections] ??
        false;
      if (isExpanded) {
        expanded.push(subsection.key);
      }
    }

    return expanded;
  }, [sectionDefaults.subsections.metadata, subsections]);

  // Don't render if no subsections
  if (subsections.length === 0) {
    return null;
  }

  return (
    <SubsectionGroup
      title="Metadata"
      icon={<HugeiconsIcon icon={InformationCircleIcon} size={14} />}
      pinSection="metadata"
      subsections={subsections}
      searchQuery={searchQuery}
      sectionKey="metadata"
      segmentEvent={event}
      defaultExpandedSubsections={defaultExpandedSubsections}
    />
  );
}
