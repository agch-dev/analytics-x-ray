import { Badge } from '@src/components/ui/badge';
import { Button } from '@src/components/ui/button';
import { Input } from '@src/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@src/components/ui/dropdown-menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Delete02Icon,
  MoreVerticalIcon,
  Settings02Icon,
  FilterIcon,
  Search01Icon,
  SearchRemoveIcon
} from '@hugeicons/core-free-icons';
import Browser from 'webextension-polyfill';
import { Logo } from '@src/components/Logo';
import { cn } from '@src/lib/utils';

interface HeaderProps {
  eventCount: number;
  filteredEventNamesCount: number;
  isFilterPanelOpen: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClear: () => void;
  onToggleFilterPanel: () => void;
}

export function Header({ 
  eventCount, 
  filteredEventNamesCount,
  isFilterPanelOpen,
  searchQuery,
  onSearchChange,
  onClear,
  onToggleFilterPanel,
}: HeaderProps) {
  const handleOpenSettings = () => {
    Browser.runtime.openOptionsPage();
  };

  return (
    <header className="shrink-0 px-2 sm:px-4 py-2 sm:py-3 border-b border-border bg-card flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
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
      </div>
      
      {/* Search input */}
      <div className="relative flex-1 max-w-md">
        <HugeiconsIcon 
          icon={Search01Icon} 
          size={16} 
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          type="text"
          placeholder="Search events, attributes, or use key:value..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-8 text-xs"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Clear search"
          >
            <HugeiconsIcon icon={SearchRemoveIcon} size={14} />
          </button>
        )}
      </div>
    </header>
  );
}

