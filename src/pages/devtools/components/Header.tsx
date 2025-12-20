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
    <header className="shrink-0 px-4 py-3 border-b border-border bg-card flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Logo className="pointer-events-none" size={18} />
          <h1 className="text-sm font-semibold text-foreground">
            Analytics X-Ray
          </h1>
        </div>
        <Badge variant="secondary" className="text-xs font-mono">
          {eventCount} events
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFilterPanel}
          className={cn(
            "text-xs text-muted-foreground hover:text-foreground relative",
            isFilterPanelOpen && "bg-accent"
          )}
        >
          <HugeiconsIcon icon={FilterIcon} size={14} className="mr-1" />
          Filter
          {filteredEventNamesCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-1 h-4 min-w-4 px-1 text-[10px] font-mono"
            >
              {filteredEventNamesCount}
            </Badge>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onScrollToBottom}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} className="mr-1" />
          Latest
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-destructive"
        >
          <HugeiconsIcon icon={Delete02Icon} size={14} className="mr-1" />
          Clear
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground"
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

