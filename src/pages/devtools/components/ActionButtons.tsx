import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@src/components';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Delete02Icon,
  MoreVerticalIcon,
  Settings02Icon,
  FilterIcon,
  Mail01Icon,
} from '@hugeicons/core-free-icons';
import Browser from 'webextension-polyfill';
import { cn } from '@src/lib';

interface ActionButtonsProps {
  filteredEventNamesCount: number;
  isFilterPanelOpen: boolean;
  onClear: () => void;
  onToggleFilterPanel: () => void;
  onOpenSettings: () => void;
  onOpenFeedback: () => void;
  className?: string;
}

export function ActionButtons({
  filteredEventNamesCount,
  isFilterPanelOpen,
  onClear,
  onToggleFilterPanel,
  onOpenSettings,
  onOpenFeedback,
  className,
}: ActionButtonsProps) {
  return (
    <div className={cn('flex items-center gap-1 sm:gap-2 shrink-0', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleFilterPanel}
        className={cn(
          'text-xs text-muted-foreground hover:text-foreground relative px-1.5 sm:px-2',
          isFilterPanelOpen && 'bg-accent'
        )}
        title="Filter"
        aria-label={isFilterPanelOpen ? 'Close filter panel' : 'Open filter panel'}
        aria-expanded={isFilterPanelOpen}
      >
        <HugeiconsIcon icon={FilterIcon} size={14} />
        {filteredEventNamesCount > 0 && (
          <Badge
            variant="destructive"
            className="ml-0.5 sm:ml-1 h-4 min-w-4 px-1 text-[10px] font-mono absolute -top-1 -right-1"
          >
            {filteredEventNamesCount}
          </Badge>
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="text-xs text-muted-foreground hover:text-destructive px-1.5 sm:px-2"
        title="Clear"
        aria-label="Clear all events"
      >
        <HugeiconsIcon icon={Delete02Icon} size={14} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground px-1.5 sm:px-2"
            title="More options"
            aria-label="More options menu"
            aria-haspopup="true"
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onOpenSettings}>
            <HugeiconsIcon icon={Settings02Icon} size={14} className="mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenFeedback}>
            <HugeiconsIcon icon={Mail01Icon} size={14} className="mr-2" />
            Feedback
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

