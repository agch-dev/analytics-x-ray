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

// Helper functions to build specific subsections
function buildPageSubsection(page: unknown): SubsectionDefinition | null {
  if (!isValidObjectSection(page)) return null;
  return createSubsection(
    'page',
    'Page',
    <HugeiconsIcon icon={BrowserIcon} size={12} />,
    Object.entries(page).map(([key, value]) => ({ key, value }))
  );
}

function buildLibrarySubsection(library: unknown): SubsectionDefinition | null {
  if (!isValidObjectSection(library)) return null;
  return createSubsection(
    'library',
    'Library',
    <HugeiconsIcon icon={Bookmark01Icon} size={12} />,
    Object.entries(library).map(([key, value]) => ({ key, value }))
  );
}

function buildBrowserSubsection(
  userAgent: unknown,
  userAgentData: unknown
): SubsectionDefinition | null {
  if (!userAgent && !userAgentData) return null;
  const uaData: Record<string, unknown> = {};
  if (userAgent) uaData.userAgent = userAgent;
  if (userAgentData) uaData.userAgentData = userAgentData;
  return createSubsection(
    'browser',
    'Browser',
    <HugeiconsIcon icon={Globe02Icon} size={12} />,
    Object.entries(uaData).map(([key, value]) => ({ key, value }))
  );
}

function buildOtherSubsection(context: unknown): SubsectionDefinition | null {
  const otherContext: Record<string, unknown> = {};
  const knownKeys = ['page', 'library', 'userAgent', 'userAgentData'];

  if (context && typeof context === 'object' && !Array.isArray(context)) {
    for (const [key, value] of Object.entries(context)) {
      if (!knownKeys.includes(key) && value !== undefined && value !== null) {
        otherContext[key] = value;
      }
    }
  }

  if (Object.keys(otherContext).length === 0) return null;
  return createSubsection(
    'other',
    'Other',
    <HugeiconsIcon icon={Settings01Icon} size={12} />,
    Object.entries(otherContext).map(([key, value]) => ({ key, value }))
  );
}

export function ContextSection({
  event,
  searchQuery = '',
}: Readonly<ContextSectionProps>) {
  const context = useMemo(() => event.context || {}, [event.context]);
  const sectionDefaults = useConfigStore((state) => state.sectionDefaults);

  // Organize context into subsections
  const subsections = useMemo<SubsectionDefinition[]>(() => {
    const sections: SubsectionDefinition[] = [];

    const pageSubsection = buildPageSubsection(context?.page);
    if (pageSubsection) sections.push(pageSubsection);

    const librarySubsection = buildLibrarySubsection(context?.library);
    if (librarySubsection) sections.push(librarySubsection);

    const browserSubsection = buildBrowserSubsection(
      context?.userAgent,
      context?.userAgentData
    );
    if (browserSubsection) sections.push(browserSubsection);

    const otherSubsection = buildOtherSubsection(context);
    if (otherSubsection) sections.push(otherSubsection);

    return sections;
  }, [context]);

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
