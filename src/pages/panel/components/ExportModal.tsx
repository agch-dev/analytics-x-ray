import { Copy01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@src/components/ui/dialog';
import { cn } from '@src/lib';
import {
  type ExportSections,
  formatEventsAsJson,
  formatEventsAsMarkdown,
} from '@src/lib/exportFormatter';
import { selectExportSections, useConfigStore } from '@src/stores';
import type { SegmentEvent } from '@src/types';

import { SectionToggle } from '@pages/panel/components/ExportModalSectionToggle';

interface ExportModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly events: SegmentEvent[];
  readonly reloadTimestamps: number[];
}

type ExportMode = 'smart' | 'raw';

/** Top-level section toggles */
const TOP_LEVEL_SECTIONS: { key: keyof ExportSections; label: string }[] = [
  { key: 'properties', label: 'Properties' },
  { key: 'traits', label: 'Traits' },
];

/** Context subsection toggles */
const CONTEXT_SUBSECTIONS: { key: keyof ExportSections; label: string }[] = [
  { key: 'contextPage', label: 'Page' },
  { key: 'contextLibrary', label: 'Library' },
  { key: 'contextBrowser', label: 'Browser' },
  { key: 'contextOther', label: 'Other' },
];

/** Metadata subsection toggles */
const METADATA_SUBSECTIONS: { key: keyof ExportSections; label: string }[] = [
  { key: 'metadataIdentifiers', label: 'Identifiers' },
  { key: 'metadataCaptureInfo', label: 'Capture Info' },
  { key: 'metadataIntegrations', label: 'Integrations' },
];

/**
 * Copy text to clipboard inside a Radix Dialog.
 * The standard copyToClipboard appends a textarea to document.body,
 * but Radix Dialog's focus trap prevents focus from leaving the dialog.
 * This version appends the textarea inside the provided container.
 */
function copyInsideDialog(
  text: string,
  container: HTMLElement | null
): boolean {
  const parent = container ?? document.body;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';

  parent.appendChild(textarea);
  textarea.focus();
  textarea.select();

  let success = false;
  try {
    // eslint-disable-next-line sonarjs/deprecation -- Required fallback for DevTools panels
    success = document.execCommand('copy');
  } catch {
    // copy failed
  }

  parent.removeChild(textarea);
  return success;
}

export function ExportModal({
  open,
  onOpenChange,
  events,
  reloadTimestamps,
}: ExportModalProps) {
  const [mode, setMode] = useState<ExportMode>('smart');
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset copied state after timeout
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Persisted export sections from config store
  const sections = useConfigStore(selectExportSections);
  const setExportSections = useConfigStore((s) => s.setExportSections);

  const handleToggle = useCallback(
    (key: keyof ExportSections) => {
      const next = { ...sections, [key]: !sections[key] };

      // When toggling a parent off, disable all children
      if (key === 'context' && sections.context) {
        next.contextPage = false;
        next.contextLibrary = false;
        next.contextBrowser = false;
        next.contextOther = false;
      }
      if (key === 'metadata' && sections.metadata) {
        next.metadataIdentifiers = false;
        next.metadataCaptureInfo = false;
        next.metadataIntegrations = false;
      }

      // When toggling a parent on, enable all children
      if (key === 'context' && !sections.context) {
        next.contextPage = true;
        next.contextLibrary = true;
        next.contextBrowser = true;
        next.contextOther = true;
      }
      if (key === 'metadata' && !sections.metadata) {
        next.metadataIdentifiers = true;
        next.metadataCaptureInfo = true;
        next.metadataIntegrations = true;
      }

      setExportSections(next);
    },
    [sections, setExportSections]
  );

  const handleCopy = useCallback(() => {
    const output =
      mode === 'smart'
        ? formatEventsAsMarkdown(events, reloadTimestamps, sections)
        : formatEventsAsJson(events);

    const success = copyInsideDialog(output, contentRef.current);
    if (success) {
      setCopied(true);
    }
  }, [mode, events, reloadTimestamps, sections]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={contentRef}
        className="max-h-[85vh] max-w-md overflow-y-auto p-4"
      >
        <DialogHeader className="space-y-1 text-left">
          <DialogTitle className="text-base">Export Events</DialogTitle>
          <DialogDescription>
            {events.length} {events.length === 1 ? 'event' : 'events'} selected
          </DialogDescription>
        </DialogHeader>

        {/* Mode selector */}
        <div
          role="group"
          aria-label="Export mode"
          className="flex gap-1 rounded-md border border-border p-1"
        >
          <button
            type="button"
            aria-pressed={mode === 'smart'}
            className={cn(
              'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'smart'
                ? 'bg-primary text-primary-foreground'
                : `
                  text-muted-foreground
                  hover:text-foreground
                `
            )}
            onClick={() => setMode('smart')}
          >
            Smart Export
          </button>
          <button
            type="button"
            aria-pressed={mode === 'raw'}
            className={cn(
              'flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors',
              mode === 'raw'
                ? 'bg-primary text-primary-foreground'
                : `
                  text-muted-foreground
                  hover:text-foreground
                `
            )}
            onClick={() => setMode('raw')}
          >
            Raw JSON
          </button>
        </div>

        {/* Smart export sections */}
        {mode === 'smart' ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Exports as formatted Markdown with navigation dividers. Toggle
              sections to make the export more compact.
            </p>

            <div className="space-y-0.5">
              {/* Top-level toggles */}
              {TOP_LEVEL_SECTIONS.map(({ key, label }) => (
                <SectionToggle
                  key={key}
                  sectionKey={key}
                  label={label}
                  checked={sections[key]}
                  onToggle={() => handleToggle(key)}
                />
              ))}

              {/* Context group */}
              <SectionToggle
                sectionKey="context"
                label="Context"
                checked={sections.context}
                onToggle={() => handleToggle('context')}
                isGroup
              />
              {sections.context &&
                CONTEXT_SUBSECTIONS.map(({ key, label }) => (
                  <SectionToggle
                    key={key}
                    sectionKey={key}
                    label={label}
                    checked={sections[key]}
                    onToggle={() => handleToggle(key)}
                    indented
                  />
                ))}

              {/* Metadata group */}
              <SectionToggle
                sectionKey="metadata"
                label="Metadata"
                checked={sections.metadata}
                onToggle={() => handleToggle('metadata')}
                isGroup
              />
              {sections.metadata &&
                METADATA_SUBSECTIONS.map(({ key, label }) => (
                  <SectionToggle
                    key={key}
                    sectionKey={key}
                    label={label}
                    checked={sections[key]}
                    onToggle={() => handleToggle(key)}
                    indented
                  />
                ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Exports the raw JSON array of event payloads as captured from the
            network.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button size="sm" onClick={handleCopy} disabled={events.length === 0}>
            <HugeiconsIcon icon={copied ? Tick01Icon : Copy01Icon} size={14} />
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
