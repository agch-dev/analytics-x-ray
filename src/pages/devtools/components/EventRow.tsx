import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { useState, useCallback, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { cn, copyToClipboard } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import type { SearchMatch } from '@src/lib/search';
import { highlightText } from '@src/lib/search';
import { EventRowHeader } from './EventRowHeader';

interface EventRowProps {
  event: SegmentEvent;
  isSelected: boolean;
  isExpanded: boolean;
  isAnimatingCollapse?: boolean;
  isHidden?: boolean;
  searchMatch?: SearchMatch | null;
  onToggleExpand: (id: string) => void;
  onToggleHide?: (eventName: string) => void;
}

export function EventRow({ 
  event, 
  isSelected, 
  isExpanded,
  isAnimatingCollapse = false,
  isHidden = false,
  searchMatch,
  onToggleExpand,
  onToggleHide,
}: EventRowProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Custom copy handler that uses execCommand fallback for DevTools panels
  const handleCopy = useCallback((text: string, key: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  }, []);

  // Get search query for highlighting
  const searchQuery = useMemo(() => {
    if (!searchMatch) return '';
    if (searchMatch.type === 'keyValue') {
      return searchMatch.value || '';
    }
    return searchMatch.query;
  }, [searchMatch]);

  return (
    <div
      className={cn(
        'w-full border-b border-border transition-colors bg-card/80',
        isSelected && 'bg-blue-500/10 dark:bg-blue-500/10 border-l-2 border-l-blue-500',
        isAnimatingCollapse && 'animate-ring-pulse'
      )}
    >
      {/* Row header - clickable */}
      <button
        onClick={() => onToggleExpand(event.id)}
        className="w-full text-left"
      >
        <EventRowHeader
          event={event}
          isExpanded={isExpanded}
          isHidden={isHidden}
          searchMatch={searchMatch}
          onToggleExpand={onToggleExpand}
          onToggleHide={onToggleHide}
        />
      </button>

      {/* Expanded JSON view */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border bg-background/50">
          <JsonView
            value={event}
            style={{
              ...darkTheme,
              backgroundColor: 'transparent',
              fontSize: '12px',
            }}
            collapsed={false}
            displayDataTypes={false}
            displayObjectSize={false}
            enableClipboard={true}
            shouldExpandNodeInitially={(isExpanded, { keyName }) => {
              // Collapse "rawPayload" by default since it's redundant
              if (keyName === 'rawPayload') {
                return false;
              }
              return isExpanded;
            }}
          >
            {/* Custom renderer for string values to highlight search matches */}
            {searchQuery && (
              <JsonView.String
                render={({ children, ...reset }, { type, value, keyName }) => {
                  // Only highlight values, not type indicators
                  if (type === 'value' && typeof value === 'string') {
                    const parts = highlightText(value, searchQuery);
                    
                    return (
                      <span {...reset}>
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
                      </span>
                    );
                  }
                  
                  // For key-value searches, also highlight matching keys
                  if (searchMatch?.type === 'keyValue' && type === 'type' && keyName) {
                    const keyNameStr = String(keyName);
                    const keyParts = highlightText(keyNameStr, searchMatch.key || '');
                    if (keyParts.some(p => p.highlight)) {
                      return (
                        <span {...reset}>
                          {keyParts.map((part, index) => 
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
                        </span>
                      );
                    }
                  }
                  
                  // Default rendering
                  return <span {...reset}>{children}</span>;
                }}
              />
            )}
            <JsonView.Copied
              render={(props, { value, keyName }) => {
                const key = String(keyName ?? 'root');
                const isCopied = copiedKey === key;
                const textToCopy = typeof value === 'string' 
                  ? value 
                  : JSON.stringify(value, null, 2);
                
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
                      <HugeiconsIcon 
                        icon={Tick01Icon} 
                        size={12} 
                        color="#22c55e"
                      />
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
          </JsonView>
        </div>
      )}
    </div>
  );
}

