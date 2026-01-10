import {
  Search01Icon,
  SearchRemoveIcon,
  Clock04Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Browser from 'webextension-polyfill';

import { Badge, Input, Logo } from '@src/components';

import { ActionButtons } from './ActionButtons';

interface HeaderProps {
  eventCount: number;
  totalEventCount: number; // Total unfiltered events count
  maxEvents: number; // Maximum events limit
  filteredEventNamesCount: number;
  isFilterPanelOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  onToggleFilterPanel: () => void;
  onOpenFeedback: () => void;
}

export function Header({
  eventCount,
  totalEventCount,
  maxEvents,
  filteredEventNamesCount,
  isFilterPanelOpen,
  searchQuery,
  onSearchChange,
  onClear,
  onToggleFilterPanel,
  onOpenFeedback,
}: HeaderProps) {
  // Check if we're at the max events limit (showing truncation indicator)
  const isAtMaxEvents = totalEventCount >= maxEvents;
  const handleOpenSettings = () => {
    Browser.runtime.openOptionsPage();
  };

  return (
    <header className="shrink-0 px-2 sm:px-4 py-2 sm:py-3 border-b border-border bg-card flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
      <div className="flex items-center justify-between gap-2 lg:justify-start lg:shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Logo className="pointer-events-none" size={24} />
            <h1 className="text-lg font-semibold text-foreground whitespace-nowrap">
              Analytics X-Ray
            </h1>
          </div>
          <Badge
            variant="secondary"
            className="text-xs font-mono shrink-0 flex items-center gap-1.5"
          >
            <span>{eventCount} events</span>
            {isAtMaxEvents && (
              <span
                title={`Event log is truncated at ${maxEvents} events. Older events are being removed.`}
                className="flex items-center"
              >
                <HugeiconsIcon
                  icon={Clock04Icon}
                  size={14}
                  className="text-yellow-500 animate-pulse"
                />
              </span>
            )}
          </Badge>
        </div>

        <ActionButtons
          filteredEventNamesCount={filteredEventNamesCount}
          isFilterPanelOpen={isFilterPanelOpen}
          onClear={onClear}
          onToggleFilterPanel={onToggleFilterPanel}
          onOpenSettings={handleOpenSettings}
          onOpenFeedback={onOpenFeedback}
          className="lg:hidden"
        />
      </div>

      {/* Search input */}
      <div className="relative flex-1 lg:max-w-md lg:mx-auto">
        <HugeiconsIcon
          icon={Search01Icon}
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          type="text"
          placeholder="Search events, attributes, or values..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-8 text-xs"
          aria-label="Search events, attributes, or values"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Clear search"
            aria-label="Clear search query"
          >
            <HugeiconsIcon icon={SearchRemoveIcon} size={14} />
          </button>
        )}
      </div>

      {/* Action buttons - visible on lg screens */}
      <ActionButtons
        filteredEventNamesCount={filteredEventNamesCount}
        isFilterPanelOpen={isFilterPanelOpen}
        onClear={onClear}
        onToggleFilterPanel={onToggleFilterPanel}
        onOpenSettings={handleOpenSettings}
        onOpenFeedback={onOpenFeedback}
        className="hidden lg:flex"
      />
    </header>
  );
}
