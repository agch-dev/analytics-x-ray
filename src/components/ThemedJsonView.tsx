import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import JsonView from '@uiw/react-json-view';
import { useState, useCallback } from 'react';

import { getJsonViewTheme } from '@src/lib/jsonViewTheme';
import { highlightText } from '@src/lib/search';
import { copyToClipboard } from '@src/lib/utils';

interface ThemedJsonViewProps {
  value: unknown;
  searchQuery?: string;
  fontSize?: string;
  collapsed?: boolean;
  enableClipboard?: boolean;
  shouldExpandNodeInitially?: (
    isExpanded: boolean,
    context: {
      keyName?: string | number;
      value?: object;
      parentValue?: object;
      keys: (string | number)[];
      level: number;
    }
  ) => boolean;
}

/**
 * Wrapper component for JsonView with theme configuration and search highlighting.
 * Encapsulates all JsonView theming and custom renderers.
 */
export function ThemedJsonView({
  value,
  searchQuery = '',
  fontSize = '12px',
  collapsed = false,
  enableClipboard = true,
  shouldExpandNodeInitially,
}: ThemedJsonViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Custom copy handler
  const handleCopy = useCallback((text: string, key: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  }, []);

  // Default shouldExpandNodeInitially logic
  const defaultShouldExpand = useCallback(
    (
      isExpanded: boolean,
      { keyName, value: val }: { keyName?: string | number; value?: object }
    ) => {
      // Collapse large nested objects by default
      const keyNameStr =
        typeof keyName === 'string' ? keyName : String(keyName);
      if (keyNameStr === 'integrations' || keyNameStr === 'userAgentData') {
        return false;
      }
      // Collapse arrays longer than 10 items
      if (val && Array.isArray(val) && val.length > 10) {
        return false;
      }
      return isExpanded;
    },
    []
  );

  const expandLogic = shouldExpandNodeInitially || defaultShouldExpand;

  return (
    <JsonView
      value={value as object}
      style={{
        ...getJsonViewTheme(),
        fontSize,
      }}
      collapsed={collapsed}
      displayDataTypes={false}
      displayObjectSize={false}
      enableClipboard={enableClipboard}
      shouldExpandNodeInitially={expandLogic}
    >
      {/* Custom renderer for string values to highlight search matches */}
      {searchQuery && (
        <JsonView.String
          render={({ children, ...reset }, { type, value: val }) => {
            if (type === 'value' && typeof val === 'string') {
              const parts = highlightText(val, searchQuery);

              if (parts.some((p) => p.highlight)) {
                return (
                  <span {...reset}>
                    {parts.map((part, index) =>
                      part.highlight ? (
                        <mark
                          key={index}
                          className={`
                            rounded bg-yellow-500/30 px-0.5 text-foreground
                            dark:bg-yellow-500/40
                          `}
                        >
                          {part.text}
                        </mark>
                      ) : (
                        <span key={index}>{part.text}</span>
                      )
                    )}
                  </span>
                );
              }
            }

            return <span {...reset}>{children}</span>;
          }}
        />
      )}

      {/* Custom renderer for number values to highlight search matches */}
      {searchQuery && (
        <JsonView.Int
          render={({ children, ...reset }, { type, value: val }) => {
            if (type === 'value' && typeof val === 'number') {
              const valueStr = String(val);
              const parts = highlightText(valueStr, searchQuery);

              if (parts.some((p) => p.highlight)) {
                return (
                  <span {...reset}>
                    {parts.map((part, index) =>
                      part.highlight ? (
                        <mark
                          key={index}
                          className={`
                            rounded bg-yellow-500/30 px-0.5 text-foreground
                            dark:bg-yellow-500/40
                          `}
                        >
                          {part.text}
                        </mark>
                      ) : (
                        <span key={index}>{part.text}</span>
                      )
                    )}
                  </span>
                );
              }
            }

            return <span {...reset}>{children}</span>;
          }}
        />
      )}

      {/* Custom renderer for true boolean values to highlight search matches */}
      {searchQuery && (
        <JsonView.True
          render={(
            { children, ...reset },
            { type, value: val }: { type?: string; value?: unknown }
          ) => {
            if (type === 'value' && val === true) {
              const valueStr = 'true';
              const parts = highlightText(valueStr, searchQuery);

              if (parts.some((p) => p.highlight)) {
                return (
                  <span {...reset}>
                    {parts.map((part, index) =>
                      part.highlight ? (
                        <mark
                          key={index}
                          className={`
                            rounded bg-yellow-500/30 px-0.5 text-foreground
                            dark:bg-yellow-500/40
                          `}
                        >
                          {part.text}
                        </mark>
                      ) : (
                        <span key={index}>{part.text}</span>
                      )
                    )}
                  </span>
                );
              }
            }

            return <span {...reset}>{children}</span>;
          }}
        />
      )}

      {/* Custom renderer for false boolean values to highlight search matches */}
      {searchQuery && (
        <JsonView.False
          render={(
            { children, ...reset },
            { type, value: val }: { type?: string; value?: unknown }
          ) => {
            if (type === 'value' && val === false) {
              const valueStr = 'false';
              const parts = highlightText(valueStr, searchQuery);

              if (parts.some((p) => p.highlight)) {
                return (
                  <span {...reset}>
                    {parts.map((part, index) =>
                      part.highlight ? (
                        <mark
                          key={index}
                          className={`
                            rounded bg-yellow-500/30 px-0.5 text-foreground
                            dark:bg-yellow-500/40
                          `}
                        >
                          {part.text}
                        </mark>
                      ) : (
                        <span key={index}>{part.text}</span>
                      )
                    )}
                  </span>
                );
              }
            }

            return <span {...reset}>{children}</span>;
          }}
        />
      )}

      {/* Custom renderer for null values to highlight search matches */}
      {searchQuery && (
        <JsonView.Null
          render={(
            { children, ...reset },
            { type, value: val }: { type?: string; value?: unknown }
          ) => {
            if (type === 'value' && val === null) {
              const valueStr = 'null';
              const parts = highlightText(valueStr, searchQuery);

              if (parts.some((p) => p.highlight)) {
                return (
                  <span {...reset}>
                    {parts.map((part, index) =>
                      part.highlight ? (
                        <mark
                          key={index}
                          className={`
                            rounded bg-yellow-500/30 px-0.5 text-foreground
                            dark:bg-yellow-500/40
                          `}
                        >
                          {part.text}
                        </mark>
                      ) : (
                        <span key={index}>{part.text}</span>
                      )
                    )}
                  </span>
                );
              }
            }

            return <span {...reset}>{children}</span>;
          }}
        />
      )}

      {/* Custom renderer for keys to highlight search matches */}
      {searchQuery && (
        <JsonView.KeyName
          render={({ children, ...reset }, { keyName }) => {
            if (!keyName) {
              return <span {...reset}>{children}</span>;
            }

            const keyNameStr = String(keyName);
            const keyParts = highlightText(keyNameStr, searchQuery);

            if (keyParts.some((p) => p.highlight)) {
              return (
                <span {...reset}>
                  {keyParts.map((part, index) =>
                    part.highlight ? (
                      <mark
                        key={index}
                        className={`
                          rounded bg-yellow-500/30 px-0.5 text-foreground
                          dark:bg-yellow-500/40
                        `}
                      >
                        {part.text}
                      </mark>
                    ) : (
                      <span key={index}>{part.text}</span>
                    )
                  )}
                </span>
              );
            }

            return <span {...reset}>{children}</span>;
          }}
        />
      )}

      {/* Custom copy handler */}
      {enableClipboard && (
        <JsonView.Copied
          render={(props, { value: val, keyName }) => {
            const key = String(keyName ?? 'root');
            const isCopied = copiedKey === key;
            const textToCopy =
              typeof val === 'string' ? val : JSON.stringify(val, null, 2);

            if (isCopied) {
              return (
                <span
                  style={{
                    ...props.style,
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginLeft: '4px',
                  }}
                >
                  <HugeiconsIcon icon={Tick01Icon} size={12} color="#22c55e" />
                </span>
              );
            }

            return (
              <span
                style={{
                  ...props.style,
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  marginLeft: '4px',
                  opacity: 0.6,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(textToCopy, key);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCopy(textToCopy, key);
                  }
                }}
                role="button"
                tabIndex={0}
                title="Copy to clipboard"
              >
                <HugeiconsIcon
                  icon={Copy01Icon}
                  size={12}
                  color="currentColor"
                />
              </span>
            );
          }}
        />
      )}
    </JsonView>
  );
}
