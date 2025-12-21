/**
 * Array chunking utilities for displaying large arrays in a manageable way
 */

/**
 * Chunking constants for large arrays
 */
export const CHUNKING_THRESHOLD = 10;
export const INITIAL_CHUNK_SIZE = 10;
export const CHUNK_SIZE = 20;

/**
 * Chunk array for display
 * @param array The array to chunk
 * @param initialSize Size of the first chunk (default: INITIAL_CHUNK_SIZE)
 * @param chunkSize Size of subsequent chunks (default: CHUNK_SIZE)
 * @returns Array of chunks with start, end indices and items
 */
export function chunkArray<T>(
  array: T[],
  initialSize: number = INITIAL_CHUNK_SIZE,
  chunkSize: number = CHUNK_SIZE
): Array<{ start: number; end: number; items: T[] }> {
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
 * Check if array should use chunking (for arrays > threshold)
 */
export function shouldChunkArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > CHUNKING_THRESHOLD;
}

