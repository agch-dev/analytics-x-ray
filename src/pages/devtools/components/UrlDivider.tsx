import {
  Route01Icon,
  ReloadIcon,
  ArrowRight01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React, { useState, useMemo, useCallback } from 'react';

import {
  cn,
  getEventUrl,
  domainsAreDifferent,
  extractPathFromUrl,
} from '@src/lib/utils';
import type { SegmentEvent } from '@src/types';

import { PropertyRow } from './detail/primitives/PropertyRow';

interface UrlDividerProps {
  event: SegmentEvent; // The event after which the divider appears
  previousEvent?: SegmentEvent; // The previous event (for comparison)
  isReload: boolean; // Whether this is a page reload
  timestamp: number; // Timestamp of the change/reload
}

/**
 * Parse query parameters from a URL string
 */
function parseQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
}

/**
 * Extract hash fragment from URL
 */
function extractHash(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hash || null;
  } catch {
    return null;
  }
}

/**
 * Generate metadata text for expandable dividers
 */
function getMetadataText(
  hasQueryParams: boolean,
  queryParams: Record<string, string>,
  hasHash: boolean
): string {
  if (!hasQueryParams && !hasHash) return '';
  const parts: string[] = [];
  if (hasQueryParams) {
    const count = Object.keys(queryParams).length;
    parts.push(`${count} ${count === 1 ? 'param' : 'params'}`);
  }
  if (hasHash) {
    parts.push('hash');
  }
  return parts.join(' • ');
}

interface HeaderProps {
  isExpandable: boolean;
  isExpanded: boolean;
  currentUrl: string | null;
  displayText: string;
  Icon: typeof Route01Icon;
  iconColor: string;
  isReload: boolean;
  metadataText: string;
  onToggle: () => void;
}

/**
 * Header component for the URL divider
 */
function Header({
  isExpandable,
  isExpanded,
  currentUrl,
  displayText,
  Icon,
  iconColor,
  isReload,
  metadataText,
  onToggle,
}: Readonly<HeaderProps>) {
  const headerContent = (
    <>
      {/* Expand/collapse icon for expandable dividers */}
      {isExpandable ? (
        <HugeiconsIcon
          icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
          size={12}
          className="shrink-0 text-muted-foreground"
        />
      ) : (
        <span className="w-3 shrink-0" />
      )}

      <HugeiconsIcon icon={Icon} size={16} className={iconColor} />
      <span
        className="flex-1 truncate font-mono"
        title={currentUrl || 'Unknown URL'}
      >
        {displayText}
      </span>
      {isReload && (
        <span className="shrink-0 text-[10px] text-muted-foreground/70">
          (reloaded)
        </span>
      )}
      {isExpandable && metadataText && (
        <span className="shrink-0 text-[10px] text-muted-foreground/70">
          {metadataText}
        </span>
      )}
    </>
  );

  const baseClassName =
    'flex items-center gap-2 px-4 py-2 text-xs text-foreground/80';
  const interactiveClassName = cn(
    baseClassName,
    `
      cursor-pointer transition-colors
      hover:bg-muted-foreground/10
    `
  );

  if (isExpandable) {
    return (
      <button
        type="button"
        className={interactiveClassName}
        onClick={onToggle}
        title={currentUrl || 'Unknown URL'}
      >
        {headerContent}
      </button>
    );
  }

  return (
    <div className={baseClassName} title={currentUrl || 'Unknown URL'}>
      {headerContent}
    </div>
  );
}

interface ExpandedContentProps {
  hasQueryParams: boolean;
  queryParamEntries: Array<{ key: string; value: string }>;
  hasHash: boolean;
  hash: string | null;
}

/**
 * Expanded content component showing query params and hash
 */
function ExpandedContent({
  hasQueryParams,
  queryParamEntries,
  hasHash,
  hash,
}: Readonly<ExpandedContentProps>) {
  return (
    <div className="border-t border-border/20 bg-card/40 px-4 pb-2">
      {/* Query Parameters */}
      {hasQueryParams && (
        <div className="pt-2">
          <div
            className={`
              mb-1.5 px-2 text-[10px] font-medium tracking-wide
              text-muted-foreground uppercase
            `}
          >
            Query Parameters ({queryParamEntries.length})
          </div>
          <div className="ml-2 border-l border-border/50">
            {queryParamEntries.map(({ key, value }) => (
              <PropertyRow
                key={key}
                label={key}
                value={value}
                searchQuery=""
                depth={0}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hash Fragment */}
      {hasHash && (
        <div
          className={cn(
            'pt-2',
            hasQueryParams && 'mt-2 border-t border-border/30'
          )}
        >
          <div
            className={`
              mb-1.5 px-2 text-[10px] font-medium tracking-wide
              text-muted-foreground uppercase
            `}
          >
            Hash Fragment
          </div>
          <div className="ml-2 border-l border-border/50">
            <PropertyRow label="hash" value={hash} searchQuery="" depth={0} />
          </div>
        </div>
      )}
    </div>
  );
}

export const UrlDivider = React.memo(function UrlDivider({
  event,
  previousEvent,
  isReload,
  timestamp: _timestamp,
}: UrlDividerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentUrl = getEventUrl(event);

  // Determine if domain changed
  const domainChanged = previousEvent
    ? domainsAreDifferent(previousEvent, event)
    : false;

  // Parse query params and hash from URL
  const queryParams = useMemo(() => {
    if (!currentUrl) return {};
    return parseQueryParams(currentUrl);
  }, [currentUrl]);

  const hash = useMemo(() => {
    if (!currentUrl) return null;
    return extractHash(currentUrl);
  }, [currentUrl]);

  const hasQueryParams = Object.keys(queryParams).length > 0;
  const hasHash = hash !== null && hash !== '';
  const isExpandable = hasQueryParams || hasHash;

  // Determine what to display
  const displayText = useMemo(() => {
    if (!currentUrl) return 'Unknown URL';
    if (domainChanged) {
      return currentUrl;
    }
    return extractPathFromUrl(currentUrl);
  }, [currentUrl, domainChanged]);

  // Choose icon and color based on type
  const Icon = isReload ? ReloadIcon : Route01Icon;
  const iconColor = isReload ? 'text-amber-400' : 'text-blue-400';

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Convert query params to PropertyEntry format
  const queryParamEntries = useMemo(() => {
    return Object.entries(queryParams).map(([key, value]) => ({
      key,
      value,
    }));
  }, [queryParams]);

  const metadataText = useMemo(
    () => getMetadataText(hasQueryParams, queryParams, hasHash),
    [hasQueryParams, queryParams, hasHash]
  );

  return (
    <div
      className={cn('w-full border-t border-border/50 bg-muted-foreground/20')}
    >
      <Header
        isExpandable={isExpandable}
        isExpanded={isExpanded}
        currentUrl={currentUrl}
        displayText={displayText}
        Icon={Icon}
        iconColor={iconColor}
        isReload={isReload}
        metadataText={metadataText}
        onToggle={toggleExpand}
      />

      {isExpanded && isExpandable && (
        <ExpandedContent
          hasQueryParams={hasQueryParams}
          queryParamEntries={queryParamEntries}
          hasHash={hasHash}
          hash={hash}
        />
      )}
    </div>
  );
});
