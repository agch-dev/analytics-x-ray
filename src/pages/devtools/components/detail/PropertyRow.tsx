import { useMemo, useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon, ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn, copyToClipboard } from '@src/lib/utils';
import { highlightText } from '@src/lib/search';

interface PropertyRowProps {
  label: string;
  value: unknown;
  searchQuery?: string;
  depth?: number;
  isNested?: boolean;
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return `Array(${value.length})`;
  if (typeof value === 'object') return `Object`;
  return String(value);
}

/**
 * Get the display color for a value type
 */
function getValueColor(value: unknown): string {
  if (value === null || value === undefined) return 'text-muted-foreground italic';
  if (typeof value === 'boolean') return value ? 'text-green-400' : 'text-red-400';
  if (typeof value === 'number') return 'text-amber-400';
  if (typeof value === 'string') return 'text-accent-foreground';
  return 'text-muted-foreground';
}

/**
 * Check if value is expandable (object or non-empty array)
 */
function isExpandable(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
  return false;
}

/**
 * Highlight text with search query matches
 */
function HighlightedText({ text, searchQuery }: { text: string; searchQuery?: string }) {
  if (!searchQuery) {
    return <>{text}</>;
  }

  const parts = highlightText(text, searchQuery);
  
  return (
    <>
      {parts.map((part, index) =>
        part.highlight ? (
          <mark
            key={index}
            className="bg-yellow-500/30 dark:bg-yellow-500/40 text-foreground rounded px-0.5"
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </>
  );
}

export function PropertyRow({
  label,
  value,
  searchQuery = '',
  depth = 0,
  isNested = false,
}: PropertyRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const expandable = isExpandable(value);
  const displayValue = formatValue(value);
  const valueColor = getValueColor(value);

  const handleCopy = useCallback(() => {
    const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const success = copyToClipboard(textToCopy);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [value]);

  const toggleExpand = useCallback(() => {
    if (expandable) {
      setIsExpanded((prev) => !prev);
    }
  }, [expandable]);

  // Check if this row matches search
  const matchesSearch = useMemo(() => {
    if (!searchQuery) return false;
    const searchLower = searchQuery.toLowerCase();
    const labelMatches = label.toLowerCase().includes(searchLower);
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    const valueMatches = valueStr.toLowerCase().includes(searchLower);
    return labelMatches || valueMatches;
  }, [label, value, searchQuery]);

  // Get nested entries for expandable values
  const nestedEntries = useMemo(() => {
    if (!expandable || !isExpanded) return [];
    if (Array.isArray(value)) {
      return value.map((item, index) => ({ key: String(index), value: item }));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.entries(value).map(([key, val]) => ({ key, value: val }));
    }
    return [];
  }, [value, expandable, isExpanded]);

  return (
    <div className={cn('group', depth > 0 && 'ml-4')}>
      <div
        className={cn(
          'flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors',
          'hover:bg-muted/50',
          matchesSearch && 'bg-yellow-500/10',
          isNested && 'border-l-2 border-border'
        )}
      >
        {/* Expand/collapse button for nested objects */}
        {expandable ? (
          <button
            onClick={toggleExpand}
            className="shrink-0 mt-0.5 p-0.5 hover:bg-muted rounded"
          >
            <HugeiconsIcon
              icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
              size={12}
              className="text-muted-foreground"
            />
          </button>
        ) : (
          <span className="shrink-0 w-4" />
        )}

        {/* Label */}
        <span className="shrink-0 text-xs font-medium text-muted-foreground min-w-[100px]">
          <HighlightedText text={label} searchQuery={searchQuery} />
        </span>

        {/* Value */}
        <span className={cn('flex-1 text-xs font-mono break-all', valueColor)}>
          {typeof value === 'string' || typeof value === 'number' ? (
            <HighlightedText text={displayValue} searchQuery={searchQuery} />
          ) : (
            displayValue
          )}
        </span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
          title="Copy value"
        >
          <HugeiconsIcon
            icon={copied ? Tick01Icon : Copy01Icon}
            size={12}
            className={copied ? 'text-green-500' : 'text-muted-foreground'}
          />
        </button>
      </div>

      {/* Nested properties */}
      {isExpanded && nestedEntries.length > 0 && (
        <div className="border-l border-border ml-3">
          {nestedEntries.map(({ key, value: nestedValue }) => (
            <PropertyRow
              key={key}
              label={key}
              value={nestedValue}
              searchQuery={searchQuery}
              depth={depth + 1}
              isNested
            />
          ))}
        </div>
      )}
    </div>
  );
}

