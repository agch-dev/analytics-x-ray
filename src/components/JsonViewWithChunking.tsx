import JsonView from '@uiw/react-json-view';

import { ChunkedArrayView } from '@src/components/ChunkedArrayView';
import { shouldChunkArray } from '@src/lib/arrayChunking';
import { getJsonViewTheme } from '@src/lib/jsonViewTheme';

interface JsonViewWithChunkingProps {
  value: unknown;
  searchQuery?: string;
  copiedKey?: string | null;
  onCopy?: (text: string, key: string) => void;
  [key: string]: unknown;
}

/**
 * Custom JSON renderer that handles chunking for large arrays
 * Falls back to standard JsonView for non-array values
 */
export function JsonViewWithChunking({
  value,
  ...jsonViewProps
}: Readonly<JsonViewWithChunkingProps>) {
  // If it's a large array, use ChunkedArrayView
  if (shouldChunkArray(value)) {
    return (
      <ChunkedArrayView
        array={value as unknown[]}
        arrayPath=""
        fontSize="12px"
        enableClipboard={true}
      />
    );
  }

  // For objects, check if they contain large arrays
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const hasLargeArray = Object.values(obj).some((v) => shouldChunkArray(v));

    if (hasLargeArray) {
      // Render object with chunked arrays
      return (
        <div>
          {Object.entries(obj).map(([key, val]) => {
            if (shouldChunkArray(val)) {
              return (
                <div key={key} className="my-2">
                  <div
                    className={`mb-1 text-xs font-medium text-muted-foreground`}
                  >
                    {key}:
                  </div>
                  <ChunkedArrayView
                    array={val as unknown[]}
                    arrayPath={key}
                    fontSize="12px"
                    enableClipboard={true}
                  />
                </div>
              );
            }
            // For non-array values, use JsonView
            return (
              <div key={key} className="my-1">
                <JsonView
                  value={{ [key]: val }}
                  style={{
                    ...getJsonViewTheme(),
                    fontSize: '12px',
                  }}
                  collapsed={false}
                  displayDataTypes={false}
                  displayObjectSize={false}
                  enableClipboard={true}
                  {...jsonViewProps}
                />
              </div>
            );
          })}
        </div>
      );
    }
  }

  // Default: use JsonView
  return (
    <JsonView
      value={value as object}
      style={{
        ...getJsonViewTheme(),
        fontSize: '12px',
      }}
      collapsed={false}
      displayDataTypes={false}
      displayObjectSize={false}
      enableClipboard={true}
      {...jsonViewProps}
    />
  );
}
