import {
  ArrowRight01Icon,
  ArrowDown01Icon,
  PinIcon,
  MoreVerticalIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState, useCallback, type ReactNode, type MouseEvent } from 'react';

import { Button } from '@src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@src/components/ui/dropdown-menu';
import { cn } from '@src/lib';
import { useConfigStore } from '@src/stores';

import { SectionDefaultsModal } from './SectionDefaultsModal';
import type { SubsectionDefinition } from './SubsectionGroup';

interface EventDetailSectionProps {
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  badge?: string | number;
  children: ReactNode;
  /** Content to show when section is collapsed (for pinned items) */
  pinnedContent?: ReactNode;
  /** Number of pinned items in this section */
  pinnedCount?: number;
  /** Section key for configuration (e.g., 'properties', 'context') */
  sectionKey?: 'properties' | 'traits' | 'context' | 'metadata';
  /** Whether this section has subsections */
  hasSubsections?: boolean;
  /** Subsection definitions (for sections with subsections) */
  subsections?: SubsectionDefinition[];
}

export function EventDetailSection({
  title,
  icon,
  defaultExpanded = true,
  badge,
  children,
  pinnedContent,
  pinnedCount = 0,
  sectionKey,
  hasSubsections = false,
  subsections = [],
}: EventDetailSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sectionDefaults = useConfigStore((state) => state.sectionDefaults);
  const setSectionDefaultExpanded = useConfigStore(
    (state) => state.setSectionDefaultExpanded
  );

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleKebabClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleSectionDefaultToggle = useCallback(
    (checked: boolean) => {
      if (sectionKey) {
        setSectionDefaultExpanded(sectionKey, checked);
      }
    },
    [sectionKey, setSectionDefaultExpanded]
  );

  const hasPinnedContent = pinnedCount > 0 && pinnedContent;

  return (
    <div className="overflow-hidden border border-border bg-card/50">
      {/* Header */}
      <button
        onClick={toggleExpand}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2',
          `
            transition-colors
            hover:bg-muted/50
          `,
          'text-left'
        )}
        aria-label={
          isExpanded ? `Collapse ${title} section` : `Expand ${title} section`
        }
        aria-expanded={isExpanded}
      >
        <HugeiconsIcon
          icon={isExpanded ? ArrowDown01Icon : ArrowRight01Icon}
          size={14}
          className="shrink-0 text-muted-foreground"
        />

        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}

        <span className="flex-1 text-sm font-medium text-foreground">
          {title}
        </span>

        {/* Pin indicator when collapsed */}
        {!isExpanded && pinnedCount > 0 && (
          <span
            className={`
              flex shrink-0 items-center gap-1 text-xs text-amber-500/80
            `}
          >
            <HugeiconsIcon icon={PinIcon} size={10} className="rotate-45" />
            {pinnedCount}
          </span>
        )}

        {badge !== undefined && (
          <span
            className={`
              shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs
              text-muted-foreground
            `}
          >
            {badge}
          </span>
        )}

        {/* Kebab menu for configuration */}
        {sectionKey && (
          <div
            onClick={handleKebabClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            role="button"
            tabIndex={0}
            className="shrink-0"
          >
            {hasSubsections ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`
                    h-6 w-6 p-0
                    hover:bg-muted/50
                  `}
                  onClick={() => setIsModalOpen(true)}
                >
                  <HugeiconsIcon
                    icon={MoreVerticalIcon}
                    size={14}
                    className="text-muted-foreground"
                  />
                </Button>
                {sectionKey === 'context' || sectionKey === 'metadata' ? (
                  <SectionDefaultsModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    sectionKey={sectionKey}
                    sectionTitle={title}
                    subsections={subsections}
                  />
                ) : null}
              </>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`
                      h-6 w-6 p-0
                      hover:bg-muted/50
                    `}
                  >
                    <HugeiconsIcon
                      icon={MoreVerticalIcon}
                      size={14}
                      className="text-muted-foreground"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuCheckboxItem
                    checked={
                      sectionKey ? sectionDefaults.sections[sectionKey] : false
                    }
                    onCheckedChange={handleSectionDefaultToggle}
                  >
                    Open by default
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </button>

      {/* Pinned content shown when collapsed */}
      {!isExpanded && hasPinnedContent && (
        <div className="border-t border-border/50 bg-neutral-400/5 px-1 pb-2">
          {pinnedContent}
        </div>
      )}

      {/* Full content shown when expanded */}
      {isExpanded && (
        <div className="border-t border-border bg-background/30 px-1 pb-2">
          {children}
        </div>
      )}
    </div>
  );
}
