import React, { useMemo, useState, useCallback } from 'react';

import { HighlightedText } from '@src/components';
import {
  cn,
  copyToClipboard,
  shouldChunkArray,
  chunkArray,
  INITIAL_CHUNK_SIZE,
  CHUNK_SIZE,
} from '@src/lib';

import { ExpandButton } from './ExpandButton';
import { NestedContent } from './NestedContent';
import { PinButton } from './PinButton';
import { PropertyActions } from './PropertyActions';
import { PropertyValue } from './PropertyValue';
import type { PropertyRowProps, PropertyRowState } from './types';
import { formatValue, getValueColor, isExpandable, isArray } from './utils';

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
  }: Readonly<PropertyRowProps>) {
    const [state, setState] = useState<PropertyRowState>(() => {
      // Only expand top-level properties (depth === 0) by default
      if (depth !== 0 || !isExpandable(value)) {
        return {
          isExpanded: false,
          copied: false,
          useJsonView: false,
          visibleChunks: new Set([0]),
        };
      }
      // For arrays, only expand if length < 50
      // For objects, always expand (no length check)
      const shouldExpand = Array.isArray(value) ? value.length < 50 : true;
      return {
        isExpanded: shouldExpand,
        copied: false,
        useJsonView: false,
        visibleChunks: new Set([0]), // First chunk visible by default
      };
    });

    // Helper for partial updates
    const updateState = useCallback((partial: Partial<PropertyRowState>) => {
      setState((prev) => ({ ...prev, ...partial }));
    }, []);

    const expandable = isExpandable(value);
    const displayValue = formatValue(value);
    const valueColorStyle = getValueColor(value);
    const canPin = Boolean(showPinButton && depth === 0 && onTogglePin);
    const shouldChunk = shouldChunkArray(value);
    const isArrayValue = isArray(value);

    const handleCopy = useCallback(() => {
      const textToCopy =
        typeof value === 'string' ? value : JSON.stringify(value, null, 2);
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
        return value.map((item, index) => ({
          key: String(index),
          value: item,
        }));
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
            'flex items-start gap-2 px-2 py-1.5 transition-colors',
            'hover:bg-muted/50',
            matchesSearch && 'bg-yellow-500/10',
            isPinned && 'border-l-2 border-l-amber-500/50 bg-neutral-400/5'
          )}
        >
          {/* Pin button - only show for first-level properties (left side) */}
          <PinButton
            canPin={canPin}
            isPinned={isPinned}
            label={label}
            onTogglePin={onTogglePin}
          />

          {/* Expand/collapse button for nested objects */}
          <ExpandButton
            expandable={expandable}
            isExpanded={state.isExpanded}
            label={label}
            onToggle={toggleExpand}
          />

          {/* Label */}
          <span
            className={`
              min-w-[100px] shrink-0 text-xs font-medium text-muted-foreground
            `}
          >
            <HighlightedText text={label} searchQuery={searchQuery} />
          </span>

          {/* Value and action buttons container */}
          <div className="flex min-w-0 flex-1 items-start gap-1.5">
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
              onToggleJsonView={() =>
                updateState({ useJsonView: !state.useJsonView })
              }
            />
          </div>
        </div>

        {/* Nested properties */}
        {state.isExpanded && (
          <div className="ml-4 border-l border-border/50 pl-3">
            <NestedContent
              value={value}
              isArrayValue={isArrayValue}
              shouldChunk={shouldChunk}
              arrayChunks={arrayChunks}
              nestedEntries={nestedEntries}
              state={state}
              searchQuery={searchQuery}
              depth={depth}
              toggleChunk={toggleChunk}
              showAllChunks={showAllChunks}
            />
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
