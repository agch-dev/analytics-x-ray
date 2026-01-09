import React, { useMemo, useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, ArrowDown01Icon, PinIcon } from '@hugeicons/core-free-icons';
import { cn, copyToClipboard } from '@src/lib';
import { HighlightedText, ThemedJsonView } from '@src/components';
import { PropertyValue } from './PropertyValue';
import { PropertyActions } from './PropertyActions';
import {
  formatValue,
  getValueColor,
  isExpandable,
  shouldChunkArray,
  isArray,
  chunkArray,
  INITIAL_CHUNK_SIZE,
  CHUNK_SIZE,
} from './utils';
import type { PropertyRowProps, PropertyRowState } from './types';

/**
 * PropertyRow component - Main component for rendering a single property
 * Handles expansion, nesting, chunking, and delegates to sub-components
 */
export const PropertyRow = React.memo(
  function PropertyRow({
    label,
    value,
    searchQuery = '',
    depth = 0,
    isNested: _isNested = false,
    isPinned = false,
    onTogglePin,
    showPinButton = false,
  }: PropertyRowProps) {
    const [state, setState] = useState<PropertyRowState>({
      isExpanded: false,
      copied: false,
      useJsonView: false,
      visibleChunks: new Set([0]), // First chunk visible by default
    });

    // Helper for partial updates
    const updateState = useCallback((partial: Partial<PropertyRowState>) => {
      setState((prev) => ({ ...prev, ...partial }));
    }, []);

    const expandable = isExpandable(value);
    const displayValue = formatValue(value);
    const valueColorStyle = getValueColor(value);
    const canPin = showPinButton && depth === 0 && onTogglePin;
    const shouldChunk = shouldChunkArray(value);
    const isArrayValue = isArray(value);

    const handleCopy = useCallback(() => {
      const textToCopy = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      const success = copyToClipboard(textToCopy);
      if (success) {
        updateState({ copied: true });
        setTimeout(() => updateState({ copied: false }), 1500);
      }
    }, [value, updateState]);

    const toggleExpand = useCallback(() => {
      if (expandable) {
        const newExpanded = !state.isExpanded;
        // Reset view state when collapsing
        if (!newExpanded) {
          updateState({
            isExpanded: newExpanded,
            useJsonView: false,
            visibleChunks: new Set([0]),
          });
        } else {
          updateState({ isExpanded: newExpanded });
        }
      }
    }, [expandable, state.isExpanded, updateState]);

    // Check if this row matches search
    const matchesSearch = useMemo(() => {
      if (!searchQuery) return false;
      const searchLower = searchQuery.toLowerCase();
      const labelMatches = label.toLowerCase().includes(searchLower);
      // Use formatValue to match what's actually displayed
      const valueStr = formatValue(value);
      const valueMatches = valueStr.toLowerCase().includes(searchLower);
      return labelMatches || valueMatches;
    }, [label, value, searchQuery]);

    // Get nested entries for expandable values
    const nestedEntries = useMemo(() => {
      if (!expandable || !state.isExpanded) return [];
      if (Array.isArray(value)) {
        return value.map((item, index) => ({ key: String(index), value: item }));
      }
      if (typeof value === 'object' && value !== null) {
        return Object.entries(value).map(([key, val]) => ({ key, value: val }));
      }
      return [];
    }, [value, expandable, state.isExpanded]);

    // Get chunked array data for arrays that need chunking
    const arrayChunks = useMemo(() => {
      if (!shouldChunk || !Array.isArray(value)) return [];
      return chunkArray(value, INITIAL_CHUNK_SIZE, CHUNK_SIZE);
    }, [shouldChunk, value]);

    const toggleChunk = useCallback(
      (chunkIndex: number) => {
        const next = new Set(state.visibleChunks);
        if (next.has(chunkIndex)) {
          next.delete(chunkIndex);
        } else {
          next.add(chunkIndex);
        }
        updateState({ visibleChunks: next });
      },
      [state.visibleChunks, updateState]
    );

    const showAllChunks = useCallback(() => {
      updateState({ visibleChunks: new Set(arrayChunks.map((_, i) => i)) });
    }, [arrayChunks, updateState]);

    return (
      <div className="group">
        <div
          className={cn(
            'flex items-start gap-2 py-1.5 px-2 transition-colors',
            'hover:bg-muted/50',
            matchesSearch && 'bg-yellow-500/10',
            isPinned && 'bg-neutral-400/5 border-l-2 border-l-amber-500/50'
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
                className={cn('transition-transform', isPinned && 'rotate-45')}
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
                icon={state.isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
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

          {/* Value and action buttons container */}
          <div className="flex-1 flex items-start gap-1.5 min-w-0">
            {/* Value - rendered by PropertyValue */}
            <PropertyValue
              value={value}
              searchQuery={searchQuery}
              displayValue={displayValue}
              valueColorStyle={valueColorStyle}
            />

            {/* Action buttons (JSON toggle, Copy) - rendered by PropertyActions */}
            <PropertyActions
              copied={state.copied}
              onCopy={handleCopy}
              showJsonViewToggle={isArrayValue && state.isExpanded}
              useJsonView={state.useJsonView}
              onToggleJsonView={() => updateState({ useJsonView: !state.useJsonView })}
            />
          </div>
        </div>

        {/* Nested properties */}
        {state.isExpanded && (
          <div className="ml-4 pl-3 border-l border-border/50">
            {/* JSON view for arrays */}
            {isArrayValue && state.useJsonView ? (
              <div className="my-2">
                <ThemedJsonView
                  value={value}
                  searchQuery={searchQuery}
                  fontSize="11px"
                  collapsed={false}
                  enableClipboard={false}
                />
              </div>
            ) : shouldChunk && Array.isArray(value) && arrayChunks.length > 0 ? (
              /* Chunked structured view for large arrays */
              <div className="my-2">
                {arrayChunks.map((chunk, chunkIndex) => {
                  const isVisible = state.visibleChunks.has(chunkIndex);
                  const isLastChunk = chunkIndex === arrayChunks.length - 1;
                  const allChunksVisible = state.visibleChunks.size === arrayChunks.length;

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
                            {isVisible ? 'Hide' : 'Show'} items {chunk.start}–{chunk.end - 1} (
                            {chunk.items.length} items)
                          </span>
                        </button>
                      )}
                      {isVisible && (
                        <div
                          className={
                            chunkIndex > 0 ? 'ml-2 pl-2 border-l border-border/30' : ''
                          }
                        >
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
  },
  (prevProps, nextProps) => {
    return (
      prevProps.label === nextProps.label &&
      prevProps.searchQuery === nextProps.searchQuery &&
      prevProps.isPinned === nextProps.isPinned &&
      prevProps.isNested === nextProps.isNested &&
      prevProps.depth === nextProps.depth &&
      prevProps.showPinButton === nextProps.showPinButton &&
      // For value, compare by reference (parent should memoize)
      prevProps.value === nextProps.value &&
      // For callbacks, compare by reference (parent should memoize)
      prevProps.onTogglePin === nextProps.onTogglePin
    );
  }
);
