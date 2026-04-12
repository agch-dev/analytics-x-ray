/**
 * Export Formatter
 *
 * Utilities for formatting analytics events as Markdown (smart export)
 * or raw JSON for clipboard export.
 */

import type { SegmentContext, SegmentEvent } from '@src/types';

import { extractPathFromUrl, getEventUrl, urlsAreDifferent } from './utils';

/**
 * Export section toggles matching the detail view structure.
 * Properties and traits are top-level toggles.
 * Context and metadata are parent toggles with per-subsection children.
 */
export interface ExportSections {
  // Top-level sections
  properties: boolean;
  traits: boolean;
  // Context parent + subsections
  context: boolean;
  contextPage: boolean;
  contextLibrary: boolean;
  contextBrowser: boolean;
  contextOther: boolean;
  // Metadata parent + subsections
  metadata: boolean;
  metadataIdentifiers: boolean;
  metadataCaptureInfo: boolean;
  metadataIntegrations: boolean;
}

/** All sections enabled by default */
export const DEFAULT_EXPORT_SECTIONS: ExportSections = {
  properties: true,
  traits: true,
  context: true,
  contextPage: true,
  contextLibrary: true,
  contextBrowser: true,
  contextOther: true,
  metadata: true,
  metadataIdentifiers: true,
  metadataCaptureInfo: true,
  metadataIntegrations: true,
};

/**
 * Check if a reload timestamp falls between two consecutive events.
 * Same logic as findReloadTimestamp in useVirtualization.ts.
 */
function findReloadBetween(
  prev: SegmentEvent,
  current: SegmentEvent,
  reloadTimestamps: number[]
): boolean {
  for (const ts of reloadTimestamps) {
    if (ts > prev.capturedAt && ts <= current.capturedAt) {
      return true;
    }
  }
  return false;
}

/**
 * Format a value for markdown display.
 * Objects/arrays get JSON stringified, primitives rendered as-is.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Render key-value pairs as indented markdown list items.
 */
function renderKeyValues(obj: Record<string, unknown>): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    lines.push(`  - ${key}: ${formatValue(value)}`);
  }
  return lines;
}

/**
 * Check if a value is a non-null, non-array object with keys.
 */
function isNonEmptyObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function formatProperties(
  sections: ExportSections,
  event: SegmentEvent,
  lines: string[]
) {
  if (sections.properties && isNonEmptyObject(event.properties)) {
    lines.push('- **Properties**:');
    lines.push(...renderKeyValues(event.properties));
  }
}

function formatTraits(
  sections: ExportSections,
  event: SegmentEvent,
  lines: string[]
) {
  if (sections.traits && event.traits && isNonEmptyObject(event.traits)) {
    lines.push('- **Traits**:');
    lines.push(...renderKeyValues(event.traits));
  }
}

function formatContext(
  sections: ExportSections,
  event: SegmentEvent,
  lines: string[]
) {
  function formatPageContext(ctx: SegmentContext) {
    if (sections.contextPage && isNonEmptyObject(ctx.page)) {
      lines.push('- **Page**:');
      lines.push(
        ...renderKeyValues(ctx.page as unknown as Record<string, unknown>)
      );
    }
  }

  function formatLibraryContext(ctx: SegmentContext) {
    if (sections.contextLibrary && isNonEmptyObject(ctx.library)) {
      lines.push('- **Library**:');
      lines.push(
        ...renderKeyValues(ctx.library as unknown as Record<string, unknown>)
      );
    }
  }

  function formatBrowserContext(ctx: SegmentContext) {
    if (sections.contextBrowser && (ctx.userAgent || ctx.userAgentData)) {
      lines.push('- **Browser**:');
      if (ctx.userAgent) {
        lines.push(`  - userAgent: ${ctx.userAgent}`);
      }
      if (ctx.userAgentData) {
        lines.push(`  - userAgentData: ${formatValue(ctx.userAgentData)}`);
      }
    }
  }

  function formatOtherContext(ctx: SegmentContext) {
    if (sections.contextOther) {
      const knownKeys = ['page', 'library', 'userAgent', 'userAgentData'];
      const other: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(ctx)) {
        if (!knownKeys.includes(key) && value !== undefined && value !== null) {
          other[key] = value;
        }
      }
      if (Object.keys(other).length > 0) {
        lines.push('- **Other Context**:');
        lines.push(...renderKeyValues(other));
      }
    }
  }

  if (sections.context) {
    const ctx = event.context;

    formatPageContext(ctx);

    formatLibraryContext(ctx);

    formatBrowserContext(ctx);

    formatOtherContext(ctx);
  }
}

function formatMetadata(
  sections: ExportSections,
  event: SegmentEvent,
  lines: string[]
) {
  function formatIdentifiersMetadata() {
    if (sections.metadataIdentifiers) {
      const ids: string[] = [];
      if (event.id) ids.push(`id: ${event.id}`);
      if (event.messageId) ids.push(`messageId: ${event.messageId}`);
      if (event.anonymousId) ids.push(`anonymousId: ${event.anonymousId}`);
      if (event.userId) ids.push(`userId: ${event.userId}`);
      if (event.groupId) ids.push(`groupId: ${event.groupId}`);
      if (ids.length > 0) {
        lines.push('- **Identifiers**:');
        ids.forEach((id) => lines.push(`  - ${id}`));
      }
    }
  }

  function formatCaptureInfoMetadata() {
    if (sections.metadataCaptureInfo) {
      lines.push('- **Capture Info**:');
      lines.push(`  - captureUrl: ${event.url}`);
      lines.push(`  - provider: ${event.provider}`);
      lines.push(`  - capturedAt: ${new Date(event.capturedAt).toISOString()}`);
    }
  }

  function formatIntegrationsMetadata() {
    if (sections.metadataIntegrations && isNonEmptyObject(event.integrations)) {
      lines.push('- **Integrations**:');
      lines.push(...renderKeyValues(event.integrations));
    }
  }

  if (sections.metadata) {
    formatIdentifiersMetadata();

    formatCaptureInfoMetadata();

    formatIntegrationsMetadata();
  }
}

/**
 * Format a single event as markdown lines.
 * Event type, name, and timestamp are always included.
 */
function formatEventMarkdown(
  event: SegmentEvent,
  sections: ExportSections
): string[] {
  const lines: string[] = [];

  function formatHeader() {
    lines.push(`### ${event.name} (${event.type})`);
    lines.push(`- **Timestamp**: ${event.timestamp}`);
  }

  // Heading — always included
  formatHeader();

  // Properties
  formatProperties(sections, event, lines);

  // Traits
  formatTraits(sections, event, lines);

  // Context (parent toggle gates all subsections)
  formatContext(sections, event, lines);

  // Metadata (parent toggle gates all subsections)
  formatMetadata(sections, event, lines);

  return lines;
}

/**
 * Extract the domain from the first event's URL.
 */
function extractDomainFromEvents(events: SegmentEvent[]): string {
  if (events.length === 0) return 'unknown';
  try {
    const url = getEventUrl(events[0]);
    if (!url) return 'unknown';
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Format selected events as a markdown document for smart export.
 */
export function formatEventsAsMarkdown(
  events: SegmentEvent[],
  reloadTimestamps: number[],
  sections: ExportSections
): string {
  if (events.length === 0) return '';

  const domain = extractDomainFromEvents(events);
  const firstTs = events[0].timestamp;
  const lastTs = events[events.length - 1].timestamp;

  const lines: string[] = [];

  // Header with LLM context
  lines.push('# Analytics Events Export');
  lines.push('');
  const eventLabel = events.length === 1 ? 'event' : 'events';
  lines.push(
    `> ${events.length} ${eventLabel} from **${domain}** captured between ${firstTs} and ${lastTs}.`
  );
  lines.push(
    '> This export contains analytics tracking events captured from a web application\u2019s Segment/RudderStack SDK.'
  );
  lines.push(
    '> Events are listed chronologically. Navigation changes and page reloads are marked with dividers.'
  );
  lines.push('');

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const prev = i > 0 ? events[i - 1] : undefined;

    // Check for dividers
    if (prev) {
      const hasPathChange = urlsAreDifferent(prev, event);
      if (hasPathChange) {
        const url = getEventUrl(event);
        const path = url ? extractPathFromUrl(url) : 'unknown';
        lines.push('---');
        lines.push(`**Navigated to ${path}**`);
        lines.push('---');
        lines.push('');
      } else if (findReloadBetween(prev, event, reloadTimestamps)) {
        lines.push('---');
        lines.push('**Page Reload**');
        lines.push('---');
        lines.push('');
      }
    }

    lines.push(...formatEventMarkdown(event, sections));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format selected events as a raw JSON string.
 * Uses the rawPayload to give the original network payload.
 */
export function formatEventsAsJson(events: SegmentEvent[]): string {
  return JSON.stringify(
    events.map((e) => e.rawPayload),
    null,
    2
  );
}
