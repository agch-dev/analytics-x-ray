import { useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Globe02Icon,
  BrowserIcon,
  Settings01Icon,
  Bookmark01Icon,
} from '@hugeicons/core-free-icons';
import type { SegmentEvent } from '@src/types/segment';
import { SubsectionGroup, type SubsectionDefinition } from '../SubsectionGroup';

interface ContextSectionProps {
  event: SegmentEvent;
  searchQuery?: string;
}

export function ContextSection({ event, searchQuery = '' }: ContextSectionProps) {
  const context = event.context;

  // Organize context into subsections
  const subsections = useMemo<SubsectionDefinition[]>(() => {
    const sections: SubsectionDefinition[] = [];

    // Page context
    if (context.page && Object.keys(context.page).length > 0) {
      sections.push({
        key: 'page',
        title: 'Page',
        icon: <HugeiconsIcon icon={BrowserIcon} size={12} />,
        entries: Object.entries(context.page as Record<string, unknown>).map(
          ([key, value]) => ({ key, value })
        ),
      });
    }

    // Library context
    if (context.library && Object.keys(context.library).length > 0) {
      sections.push({
        key: 'library',
        title: 'Library',
        icon: <HugeiconsIcon icon={Bookmark01Icon} size={12} />,
        entries: Object.entries(context.library as Record<string, unknown>).map(
          ([key, value]) => ({ key, value })
        ),
      });
    }

    // Other context properties grouped together
    const otherContext: Record<string, unknown> = {};
    const knownKeys = ['page', 'library', 'userAgent', 'userAgentData'];

    for (const [key, value] of Object.entries(context)) {
      if (!knownKeys.includes(key) && value !== undefined && value !== null) {
        otherContext[key] = value;
      }
    }

    if (Object.keys(otherContext).length > 0) {
      sections.push({
        key: 'other',
        title: 'Other',
        icon: <HugeiconsIcon icon={Settings01Icon} size={12} />,
        entries: Object.entries(otherContext).map(([key, value]) => ({
          key,
          value,
        })),
      });
    }

    // User Agent (shown as a subsection if present)
    if (context.userAgent || context.userAgentData) {
      const uaData: Record<string, unknown> = {};
      if (context.userAgent) uaData.userAgent = context.userAgent;
      if (context.userAgentData) uaData.userAgentData = context.userAgentData;

      sections.push({
        key: 'browser',
        title: 'Browser',
        icon: <HugeiconsIcon icon={Globe02Icon} size={12} />,
        entries: Object.entries(uaData).map(([key, value]) => ({ key, value })),
      });
    }

    return sections;
  }, [context]);

  return (
    <SubsectionGroup
      title="Context"
      icon={<HugeiconsIcon icon={Globe02Icon} size={14} />}
      pinSection="context"
      subsections={subsections}
      searchQuery={searchQuery}
      defaultExpanded={true}
      emptyMessage="No context data"
    />
  );
}
