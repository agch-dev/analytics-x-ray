import { ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import JsonView from '@uiw/react-json-view';
import { useCallback, useState } from 'react';

import {
  chunkArray,
  INITIAL_CHUNK_SIZE,
  CHUNK_SIZE,
} from '@src/lib/arrayChunking';
import { getJsonViewTheme } from '@src/lib/jsonViewTheme';

interface ChunkedArrayViewProps {
  /** The array to display */
  array: unknown[];
  /** Path identifier for this array (for state tracking) */
  arrayPath?: string;
  /** Font size for JsonView (default: '12px') */
  fontSize?: string;
  /** Whether to enable clipboard in JsonView (default: true) */
  enableClipboard?: boolean;
  /** Callback when chunk visibility changes */
  onChunkToggle?: (
    arrayPath: string,
    chunkIndex: number,
    isVisible: boolean
  ) => void;
  /** Initial visible chunks (default: first chunk visible) */
  initialVisibleChunks?: Set<number>;
}

/**
 * Component to render a chunked array with expand/collapse controls
 */
export function ChunkedArrayView({
  array,
  arrayPath = '',
  fontSize = '12px',
  enableClipboard = true,
  onChunkToggle,
  initialVisibleChunks = new Set([0]),
}: ChunkedArrayViewProps) {
  const [visibleChunks, setVisibleChunks] =
    useState<Set<number>>(initialVisibleChunks);

  const chunks = chunkArray(array, INITIAL_CHUNK_SIZE, CHUNK_SIZE);
  const allChunksVisible = visibleChunks.size === chunks.length;

  const toggleChunk = useCallback(
    (chunkIndex: number) => {
      setVisibleChunks((prev) => {
        const next = new Set(prev);
        if (next.has(chunkIndex)) {
          next.delete(chunkIndex);
          onChunkToggle?.(arrayPath, chunkIndex, false);
        } else {
          next.add(chunkIndex);
          onChunkToggle?.(arrayPath, chunkIndex, true);
        }
        return next;
      });
    },
    [arrayPath, onChunkToggle]
  );

  const showAllChunks = useCallback(() => {
    const allChunks = new Set(chunks.map((_, i) => i));
    setVisibleChunks(allChunks);
    chunks.forEach((_, i) => {
      if (!initialVisibleChunks.has(i)) {
        onChunkToggle?.(arrayPath, i, true);
      }
    });
  }, [chunks, arrayPath, initialVisibleChunks, onChunkToggle]);

  return (
    <div className="my-1">
      {chunks.map((chunk, chunkIndex) => {
        const isVisible = visibleChunks.has(chunkIndex);
        const isFirstChunk = chunkIndex === 0;
        const isLastChunk = chunkIndex === chunks.length - 1;

        return (
          <div key={chunkIndex} className="my-0.5">
            {!isFirstChunk && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleChunk(chunkIndex);
                }}
                className="w-full text-left py-1 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors flex items-center gap-1 mb-1"
              >
                <HugeiconsIcon
                  icon={isVisible ? ArrowDown01Icon : ArrowRight01Icon}
                  size={10}
                  className="text-muted-foreground"
                />
                <span>
                  {isVisible ? 'Hide' : 'Show'} items {chunk.start}–
                  {chunk.end - 1} ({chunk.items.length} items)
                </span>
              </button>
            )}
            {isVisible && (
              <div
                className={
                  !isFirstChunk ? 'ml-2 pl-2 border-l border-border/30' : ''
                }
              >
                <JsonView
                  value={chunk.items}
                  style={{
                    ...getJsonViewTheme(),
                    fontSize,
                  }}
                  collapsed={false}
                  displayDataTypes={false}
                  displayObjectSize={false}
                  enableClipboard={enableClipboard}
                />
              </div>
            )}
            {!isVisible && !isFirstChunk && (
              <div className="pl-2 text-xs text-muted-foreground italic py-1">
                ... {chunk.items.length} items hidden ({chunk.start}–
                {chunk.end - 1})
              </div>
            )}
            {isLastChunk && !allChunksVisible && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  showAllChunks();
                }}
                className="mt-2 py-1 px-2 text-xs text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
              >
                Show all items ({array.length} total)
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
