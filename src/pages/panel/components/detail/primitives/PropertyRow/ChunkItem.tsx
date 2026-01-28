import { ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import React from 'react';

import { chunkArray } from '@src/lib';

import { PropertyRow } from './PropertyRow';
import type { PropertyRowState } from './types';

/**
 * ChunkItem component - Renders a single chunk of a chunked array
 * Handles visibility toggle and rendering of chunk items
 */
export const ChunkItem = React.memo(function ChunkItem({
  chunk,
  chunkIndex,
  arrayChunks,
  isVisible,
  state,
  searchQuery,
  depth,
  toggleChunk,
  showAllChunks,
  totalLength,
}: Readonly<{
  chunk: ReturnType<typeof chunkArray>[number];
  chunkIndex: number;
  arrayChunks: ReturnType<typeof chunkArray>;
  isVisible: boolean;
  state: PropertyRowState;
  searchQuery: string;
  depth: number;
  toggleChunk: (chunkIndex: number) => void;
  showAllChunks: () => void;
  totalLength: number;
}>) {
  const isLastChunk = chunkIndex === arrayChunks.length - 1;
  const allChunksVisible = state.visibleChunks.size === arrayChunks.length;

  return (
    <div key={chunkIndex}>
      {chunkIndex > 0 && (
        <button
          onClick={() => toggleChunk(chunkIndex)}
          className={`
            flex w-full items-center gap-1 rounded px-2 py-1 text-left text-xs
            text-muted-foreground transition-colors
            hover:bg-muted/50 hover:text-foreground
          `}
          aria-label={
            isVisible
              ? `Hide items ${chunk.start} to ${chunk.end - 1}`
              : `Show items ${chunk.start} to ${chunk.end - 1}`
          }
          aria-expanded={isVisible}
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
            chunkIndex > 0 ? 'ml-2 border-l border-border/30 pl-2' : ''
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
          className={`
            mt-2 rounded px-2 py-1 text-xs text-blue-500 transition-colors
            hover:bg-blue-500/10 hover:text-blue-400
          `}
          aria-label={`Show all ${totalLength} items`}
        >
          Show all items ({totalLength} total)
        </button>
      )}
    </div>
  );
});
