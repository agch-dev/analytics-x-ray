import JsonView from '@uiw/react-json-view';
import { darkTheme } from '@uiw/react-json-view/dark';
import { useState, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { cn, copyToClipboard } from '@src/lib/utils';
import type { SegmentEvent } from '@src/types/segment';
import { EventRowHeader } from './EventRowHeader';

interface EventRowProps {
  event: SegmentEvent;
  isSelected: boolean;
  isExpanded: boolean;
  isAnimatingCollapse?: boolean;
  onToggleExpand: (id: string) => void;
}

export function EventRow({ 
  event, 
  isSelected, 
  isExpanded,
  isAnimatingCollapse = false,
  onToggleExpand 
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

  return (
    <div
      className={cn(
        'w-full border-b border-border transition-colors rounded-md',
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
          onToggleExpand={onToggleExpand}
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
          >
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

