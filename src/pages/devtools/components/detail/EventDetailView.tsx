import { useState, useCallback, useMemo } from 'react';
import JsonView from '@uiw/react-json-view';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Copy01Icon,
  Tick01Icon,
} from '@hugeicons/core-free-icons';
import { copyToClipboard } from '@src/lib/utils';
import { highlightText } from '@src/lib/search';
import { getJsonViewTheme } from '@src/lib/jsonViewTheme';
import type { SegmentEvent } from '@src/types/segment';
import { PropertiesSection } from './PropertiesSection';
import { TraitsSection } from './TraitsSection';
import { ContextSection } from './ContextSection';
import { MiscSection } from './MiscSection';

type ViewMode = 'json' | 'structured';

interface EventDetailViewProps {
  event: SegmentEvent;
  viewMode: ViewMode;
  searchQuery?: string;
}

export function EventDetailView({
  event,
  viewMode,
  searchQuery = '',
}: EventDetailViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Custom copy handler
  const handleCopy = useCallback((text: string, key: string) => {
    const success = copyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  }, []);

  // Get filtered event for JSON view (without rawPayload)
  const displayEvent = useMemo(() => {
    const { rawPayload, ...rest } = event;
    return rest;
  }, [event]);

  return (
    <div className="border-t border-border bg-background/50">
      {/* Content */}
      <div className="px-3 pb-3">
        {viewMode === 'structured' ? (
          <div className="space-y-3 pt-3">
            {/* Show Traits section for identify events */}
            {event.type === 'identify' && (
              <TraitsSection event={event} searchQuery={searchQuery} />
            )}
            {/* Show Properties section only if there are properties */}
            {Object.keys(event.properties).length > 0 && (
              <PropertiesSection event={event} searchQuery={searchQuery} />
            )}
            <ContextSection event={event} searchQuery={searchQuery} />
            <MiscSection event={event} searchQuery={searchQuery} />
          </div>
        ) : (
          <div className="pt-3">
            <JsonView
              value={displayEvent}
              style={{
                ...getJsonViewTheme(),
                fontSize: '12px',
              }}
              collapsed={false}
              displayDataTypes={false}
              displayObjectSize={false}
              enableClipboard={true}
              shouldExpandNodeInitially={(isExpanded, { keyName, value }) => {
                // Collapse large nested objects by default
                if (keyName === 'integrations' || keyName === 'userAgentData') {
                  return false;
                }
                // Collapse arrays longer than 10 items
                if (Array.isArray(value) && value.length > 10) {
                  return false;
                }
                return isExpanded;
              }}
            >
            {/* Custom renderer for string values to highlight search matches */}
            {searchQuery && (
              <JsonView.String
                render={({ children, ...reset }, { type, value }) => {
                  if (type === 'value' && typeof value === 'string') {
                    const parts = highlightText(value, searchQuery);
                    
                    if (parts.some(p => p.highlight)) {
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
                  }
                  
                  return <span {...reset}>{children}</span>;
                }}
              />
            )}
            
            {/* Custom renderer for number values to highlight search matches */}
            {searchQuery && (
              <JsonView.Int
                render={({ children, ...reset }, { type, value }) => {
                  if (type === 'value' && typeof value === 'number') {
                    const valueStr = String(value);
                    const parts = highlightText(valueStr, searchQuery);
                    
                    if (parts.some(p => p.highlight)) {
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
    </div>
  );
}

