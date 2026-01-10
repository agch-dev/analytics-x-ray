import React from 'react';

import { ThemedJsonView } from '@src/components';
import { chunkArray } from '@src/lib/arrayChunking';

import { ChunkItem } from './ChunkItem';
import { PropertyRow } from './PropertyRow';
import type { PropertyRowState } from './types';

/**
 * NestedContent component - Renders nested content when a property is expanded
 * Handles JSON view for arrays, chunked arrays, and regular nested objects
 */
export const NestedContent = React.memo(function NestedContent({
  value,
  isArrayValue,
  shouldChunk,
  arrayChunks,
  nestedEntries,
  state,
  searchQuery,
  depth,
  toggleChunk,
  showAllChunks,
}: Readonly<{
  value: unknown;
  isArrayValue: boolean;
  shouldChunk: boolean;
  arrayChunks: ReturnType<typeof chunkArray>;
  nestedEntries: Array<{ key: string; value: unknown }>;
  state: PropertyRowState;
  searchQuery: string;
  depth: number;
  toggleChunk: (chunkIndex: number) => void;
  showAllChunks: () => void;
}>) {
  // JSON view for arrays
  if (isArrayValue && state.useJsonView) {
    return (
      <div className="my-2">
        <ThemedJsonView
          value={value}
          searchQuery={searchQuery}
          fontSize="11px"
          collapsed={false}
          enableClipboard={false}
        />
      </div>
    );
  }

  // Chunked structured view for large arrays
  if (shouldChunk && Array.isArray(value) && arrayChunks.length > 0) {
    return (
      <div className="my-2">
        {arrayChunks.map((chunk, chunkIndex) => {
          const isVisible = state.visibleChunks.has(chunkIndex);
          return (
            <ChunkItem
              key={chunkIndex}
              chunk={chunk}
              chunkIndex={chunkIndex}
              arrayChunks={arrayChunks}
              isVisible={isVisible}
              state={state}
              searchQuery={searchQuery}
              depth={depth}
              toggleChunk={toggleChunk}
              showAllChunks={showAllChunks}
              totalLength={value.length}
            />
          );
        })}
      </div>
    );
  }

  // Regular nested view for small arrays and objects
  if (nestedEntries.length > 0) {
    return (
      <>
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
      </>
    );
  }

  return null;
});
