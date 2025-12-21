import { useMemo, useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon, ArrowRight01Icon, ArrowDown01Icon, PinIcon, CodeIcon, TextIcon } from '@hugeicons/core-free-icons';
import JsonView from '@uiw/react-json-view';
import { cn, copyToClipboard } from '@src/lib/utils';
import { highlightText } from '@src/lib/search';
import { getJsonViewTheme } from '@src/lib/jsonViewTheme';

interface PropertyRowProps {
  label: string;
  value: unknown;
  searchQuery?: string;
  depth?: number;
  isNested?: boolean;
  /** Whether this property is pinned */
  isPinned?: boolean;
  /** Callback to toggle pin state (only provided for pinnable properties) */
  onTogglePin?: () => void;
  /** Whether to show the pin button (only for first-level properties) */
  showPinButton?: boolean;
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
  if (typeof value === 'string') return 'text-blue-400 dark:text-blue-300';
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
 * Check if array should use chunking (for arrays > 10 items)
 */
const CHUNKING_THRESHOLD = 10;

function shouldChunkArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > CHUNKING_THRESHOLD;
}

/**
 * Check if value is an array (for JSON view toggle)
 */
function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Chunk array for display
 */
const INITIAL_CHUNK_SIZE = 10;
const CHUNK_SIZE = 20;

function chunkArray<T>(array: T[], initialSize: number, chunkSize: number): Array<{ start: number; end: number; items: T[] }> {
  const chunks: Array<{ start: number; end: number; items: T[] }> = [];
  
  if (array.length <= initialSize) {
    return [{ start: 0, end: array.length, items: array }];
  }
  
  // First chunk
  chunks.push({
    start: 0,
    end: initialSize,
    items: array.slice(0, initialSize),
  });
  
  // Remaining chunks
  for (let i = initialSize; i < array.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, array.length);
    chunks.push({
      start: i,
      end,
      items: array.slice(i, end),
    });
  }
  
  return chunks;
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
  isPinned = false,
  onTogglePin,
  showPinButton = false,
}: PropertyRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useJsonView, setUseJsonView] = useState(false);
  const [visibleChunks, setVisibleChunks] = useState<Set<number>>(new Set([0])); // First chunk visible by default

  const expandable = isExpandable(value);
  const displayValue = formatValue(value);
  const valueColor = getValueColor(value);
  const canPin = showPinButton && depth === 0 && onTogglePin;
  const shouldChunk = shouldChunkArray(value);
  const isArrayValue = isArray(value);

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
      setIsExpanded((prev) => {
        const newExpanded = !prev;
        // Reset view state when collapsing
        if (!newExpanded) {
          setUseJsonView(false);
          setVisibleChunks(new Set([0]));
        }
        return newExpanded;
      });
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

  // Get chunked array data for arrays that need chunking
  const arrayChunks = useMemo(() => {
    if (!shouldChunk || !Array.isArray(value)) return [];
    return chunkArray(value, INITIAL_CHUNK_SIZE, CHUNK_SIZE);
  }, [shouldChunk, value]);

  const toggleChunk = useCallback((chunkIndex: number) => {
    setVisibleChunks((prev) => {
      const next = new Set(prev);
      if (next.has(chunkIndex)) {
        next.delete(chunkIndex);
      } else {
        next.add(chunkIndex);
      }
      return next;
    });
  }, []);

  const showAllChunks = useCallback(() => {
    setVisibleChunks(new Set(arrayChunks.map((_, i) => i)));
  }, [arrayChunks]);

  return (
    <div className="group">
      <div
        className={cn(
          'flex items-start gap-2 py-1.5 px-2 rounded-md transition-colors',
          'hover:bg-muted/50',
          matchesSearch && 'bg-yellow-500/10',
          isPinned && 'bg-amber-500/5 border-l-2 border-l-amber-500/50'
        )}
      >
        {/* Pin button - only show for first-level properties (left side) */}
        {canPin ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            className={cn(
              'shrink-0 p-0.5 hover:bg-muted rounded transition-all',
              isPinned 
                ? 'opacity-100 text-amber-500' 
                : 'opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-amber-500'
            )}
            title={isPinned ? 'Unpin property' : 'Pin property'}
          >
            <HugeiconsIcon
              icon={PinIcon}
              size={12}
              className={cn(
                'transition-transform',
                isPinned && 'rotate-45'
              )}
            />
          </button>
        ) : (
          <span className="shrink-0 w-5" />
        )}

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

        {/* Value and Copy button container */}
        <div className="flex-1 flex items-start gap-1.5 min-w-0">
          {/* Value */}
          <span className={cn('text-xs font-mono break-all', valueColor)}>
            {typeof value === 'string' || typeof value === 'number' ? (
              <HighlightedText text={displayValue} searchQuery={searchQuery} />
            ) : (
              displayValue
            )}
          </span>

          {/* View mode toggle for arrays */}
          {isArrayValue && isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUseJsonView((prev) => !prev);
              }}
              className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
              title={useJsonView ? 'Switch to structured view' : 'Switch to JSON view'}
            >
              <HugeiconsIcon
                icon={useJsonView ? TextIcon : CodeIcon}
                size={12}
                className="text-muted-foreground hover:text-blue-500"
              />
            </button>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
            title="Copy value"
          >
            <HugeiconsIcon
              icon={copied ? Tick01Icon : Copy01Icon}
              size={12}
              className={copied ? 'text-green-500' : 'text-muted-foreground'}
            />
          </button>
        </div>
      </div>

      {/* Nested properties */}
      {isExpanded && (
        <div className="ml-4 pl-3 border-l border-border/50">
          {/* JSON view for arrays */}
          {isArrayValue && useJsonView ? (
            <div className="my-2">
              <JsonView
                value={value}
                style={{
                  ...getJsonViewTheme(),
                  fontSize: '11px',
                }}
                collapsed={false}
                displayDataTypes={false}
                displayObjectSize={false}
                enableClipboard={false}
              />
            </div>
          ) : shouldChunk && Array.isArray(value) && arrayChunks.length > 0 ? (
            /* Chunked structured view for large arrays */
            <div className="my-2">
              {arrayChunks.map((chunk, chunkIndex) => {
                const isVisible = visibleChunks.has(chunkIndex);
                const isLastChunk = chunkIndex === arrayChunks.length - 1;
                const allChunksVisible = visibleChunks.size === arrayChunks.length;
                
                return (
                  <div key={chunkIndex}>
                    {chunkIndex > 0 && (
                      <button
                        onClick={() => toggleChunk(chunkIndex)}
                        className="w-full text-left py-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors flex items-center gap-1"
                      >
                        <HugeiconsIcon
                          icon={isVisible ? ArrowDown01Icon : ArrowRight01Icon}
                          size={10}
                          className="text-muted-foreground"
                        />
                        <span>
                          {isVisible ? 'Hide' : 'Show'} items {chunk.start}–{chunk.end - 1} ({chunk.items.length} items)
                        </span>
                      </button>
                    )}
                    {isVisible && (
                      <div className={chunkIndex > 0 ? 'ml-2 pl-2 border-l border-border/30' : ''}>
                        {chunk.items.map((item, itemIndex) => {
                          const actualIndex = chunk.start + itemIndex;
                          return (
                            <PropertyRow
                              key={actualIndex}
                              label={String(actualIndex)}
                              value={item}
                              searchQuery={searchQuery}
                              depth={depth + 1}
                              isNested
                            />
                          );
                        })}
                      </div>
                    )}
                    {isLastChunk && !allChunksVisible && (
                      <button
                        onClick={showAllChunks}
                        className="mt-2 py-1 px-2 text-xs text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                      >
                        Show all items ({value.length} total)
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : nestedEntries.length > 0 ? (
            /* Regular nested view for small arrays and objects */
            nestedEntries.map(({ key, value: nestedValue }) => (
              <PropertyRow
                key={key}
                label={key}
                value={nestedValue}
                searchQuery={searchQuery}
                depth={depth + 1}
                isNested
              />
            ))
          ) : null}
        </div>
      )}
    </div>
  );
}

