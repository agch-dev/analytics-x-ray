import { Badge } from '@src/components/ui/badge';
import { Button } from '@src/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@src/components/ui/dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  ArrowDown01Icon, 
  Delete02Icon,
  MoreVerticalIcon,
  Settings02Icon,
  FilterIcon
} from '@hugeicons/core-free-icons';
import Browser from 'webextension-polyfill';
import { Logo } from '@src/components/Logo';
import { cn } from '@src/lib/utils';

interface HeaderProps {
  eventCount: number;
  filteredEventNamesCount: number;
  isFilterPanelOpen: boolean;
  onScrollToBottom: () => void;
  onClear: () => void;
  onToggleFilterPanel: () => void;
}

export function Header({ 
  eventCount, 
  filteredEventNamesCount,
  isFilterPanelOpen,
  onScrollToBottom, 
  onClear,
  onToggleFilterPanel,
}: HeaderProps) {
  const handleOpenSettings = () => {
    Browser.runtime.openOptionsPage();
  };

  return (
    <header className="shrink-0 px-2 sm:px-4 py-2 sm:py-3 border-b border-border bg-card flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <Logo className="pointer-events-none" size={30} />
          <h1 className="hidden sm:inline text-sm font-semibold text-foreground whitespace-nowrap">
            Analytics X-Ray
          </h1>
        </div>
        <Badge variant="secondary" className="text-xs font-mono shrink-0">
          <span className="hidden sm:inline">{eventCount} events</span>
          <span className="sm:hidden">{eventCount}</span>
        </Badge>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFilterPanel}
          className={cn(
            "text-xs text-muted-foreground hover:text-foreground relative px-1.5 sm:px-2",
            isFilterPanelOpen && "bg-accent"
          )}
          title="Filter"
        >
          <HugeiconsIcon icon={FilterIcon} size={14} className="sm:mr-1" />
          <span className="hidden sm:inline">Filter</span>
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
          onClick={onScrollToBottom}
          className="text-xs text-muted-foreground hover:text-foreground px-1.5 sm:px-2"
          title="Latest"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="sm:mr-1" />
          <span className="hidden sm:inline">Latest</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive px-1.5 sm:px-2"
          title="Clear"
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} className="sm:mr-1" />
          <span className="hidden sm:inline">Clear</span>
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground px-1.5 sm:px-2"
              title="More options"
            >
              <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleOpenSettings}>
              <HugeiconsIcon icon={Settings02Icon} size={14} className="mr-2" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

