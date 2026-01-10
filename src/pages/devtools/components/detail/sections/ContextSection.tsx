import {
  Globe02Icon,
  BrowserIcon,
  Settings01Icon,
  Bookmark01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useMemo, type ReactNode } from 'react';

import { useConfigStore } from '@src/stores';
import type { SegmentEvent } from '@src/types';

import { SubsectionGroup, type SubsectionDefinition } from '../SubsectionGroup';

interface ContextSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

// Helper function to check if a value is a non-null, non-array object with keys
function isValidObjectSection(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

// Helper function to create a subsection from an object
function createSubsection(
  key: string,
  title: string,
  icon: ReactNode,
  entries: Array<{ key: string; value: unknown }>
): SubsectionDefinition {
  return { key, title, icon, entries };
}

export function ContextSection({
  event,
  searchQuery = '',
}: Readonly<ContextSectionProps>) {
  const context = useMemo(() => event.context || {}, [event.context]);
  const sectionDefaults = useConfigStore((state) => state.sectionDefaults);

  // Helper to build page subsection
  const buildPageSubsection = useMemo(() => {
    if (context?.page && isValidObjectSection(context.page)) {
      return createSubsection(
        'page',
        'Page',
        <HugeiconsIcon icon={BrowserIcon} size={12} />,
        Object.entries(context.page).map(([key, value]) => ({ key, value }))
      );
    }
    return null;
  }, [context?.page]);

  // Helper to build library subsection
  const buildLibrarySubsection = useMemo(() => {
    if (context?.library && isValidObjectSection(context.library)) {
      return createSubsection(
        'library',
        'Library',
        <HugeiconsIcon icon={Bookmark01Icon} size={12} />,
        Object.entries(context.library).map(([key, value]) => ({
          key,
          value,
        }))
      );
    }
    return null;
  }, [context?.library]);

  // Helper to build other context subsection
  const buildOtherSubsection = useMemo(() => {
    const otherContext: Record<string, unknown> = {};
    const knownKeys = ['page', 'library', 'userAgent', 'userAgentData'];

    if (context && typeof context === 'object' && !Array.isArray(context)) {
      for (const [key, value] of Object.entries(context)) {
        if (!knownKeys.includes(key) && value !== undefined && value !== null) {
          otherContext[key] = value;
        }
      }
    }

    if (Object.keys(otherContext).length > 0) {
      return createSubsection(
        'other',
        'Other',
        <HugeiconsIcon icon={Settings01Icon} size={12} />,
        Object.entries(otherContext).map(([key, value]) => ({ key, value }))
      );
    }
    return null;
  }, [context]);

  // Helper to build browser subsection
  const buildBrowserSubsection = useMemo(() => {
    if (context?.userAgent || context?.userAgentData) {
      const uaData: Record<string, unknown> = {};
      if (context.userAgent) uaData.userAgent = context.userAgent;
      if (context.userAgentData) uaData.userAgentData = context.userAgentData;

      return createSubsection(
        'browser',
        'Browser',
        <HugeiconsIcon icon={Globe02Icon} size={12} />,
        Object.entries(uaData).map(([key, value]) => ({ key, value }))
      );
    }
    return null;
  }, [context?.userAgent, context?.userAgentData]);

  // Organize context into subsections
  const subsections = useMemo<SubsectionDefinition[]>(() => {
    const sections: SubsectionDefinition[] = [];

    if (buildPageSubsection) sections.push(buildPageSubsection);
    if (buildLibrarySubsection) sections.push(buildLibrarySubsection);
    if (buildOtherSubsection) sections.push(buildOtherSubsection);
    if (buildBrowserSubsection) sections.push(buildBrowserSubsection);

    return sections;
  }, [
    buildPageSubsection,
    buildLibrarySubsection,
    buildOtherSubsection,
    buildBrowserSubsection,
  ]);

  // Get default expanded subsections from config (map prefixed keys to unprefixed)
  const defaultExpandedSubsections = useMemo(() => {
    const configSubsections = sectionDefaults.subsections.context;
    const expanded: string[] = [];

    for (const subsection of subsections) {
      const prefixedKey = `context${subsection.key.charAt(0).toUpperCase()}${subsection.key.slice(1)}`;
      const isExpanded =
        configSubsections[prefixedKey as keyof typeof configSubsections] ??
        false;
      if (isExpanded) {
        expanded.push(subsection.key);
      }
    }

    return expanded;
  }, [sectionDefaults.subsections.context, subsections]);

  return (
    <SubsectionGroup
      title="Context"
      icon={<HugeiconsIcon icon={Globe02Icon} size={14} />}
      pinSection="context"
      subsections={subsections}
      searchQuery={searchQuery}
      emptyMessage="No context data"
      sectionKey="context"
      segmentEvent={event}
      defaultExpandedSubsections={defaultExpandedSubsections}
    />
  );
}
